import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
});

async function git(cwd, args) {
  try {
    const { stdout } = await execute("git", ["--no-pager", ...args], {
      cwd, encoding: "utf8", windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024
    });
    return stdout.trim();
  } catch {
    // Source archives and incomplete checkouts can still build using authored dates.
    return null;
  }
}

function commitDate(seconds) {
  const date = new Date(Number(seconds) * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(calendar.formatToParts(date).map(part => [part.type, part.value]));
  const result = `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

// Add generated metadata in memory only; never change the author's Markdown.
export async function applyGitUpdateDates(entries, contentDir) {
  const pending = [...entries.values()].filter(entry => !entry.metadata.updatedAt);
  if (!pending.length) return;
  const repository = await git(contentDir, ["rev-parse", "--show-toplevel"]);
  if (!repository || await git(repository, ["rev-parse", "--is-shallow-repository"]) !== "false") return;
  const head = await git(repository, ["rev-parse", "--verify", "HEAD"]);
  if (!head) return;

  for (const entry of pending) {
    const relative = path.relative(repository, entry.file);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue;
    const file = relative.split(path.sep).join("/");
    // A new/uncommitted replacement must not inherit an older article's history.
    if (await git(repository, ["cat-file", "-e", `${head}:${file}`]) === null) continue;
    const created = await git(repository, ["--literal-pathspecs", "log", "-1", "--no-show-signature",
      "--no-renames", "--diff-filter=A", "--format=%H", head, "--", file]);
    const latest = await git(repository, ["--literal-pathspecs", "log", "-1", "--no-show-signature",
      "--format=%H %ct", head, "--", path.posix.dirname(file)]);
    const match = latest?.match(/^([a-f0-9]{40,64}) (-?\d+)$/);
    // First publication keeps the authored creation date, even if media existed earlier.
    if (!created || !match || match[1] === created) continue;
    const updatedAt = commitDate(match[2]);
    if (updatedAt) entry.metadata.updatedAt = updatedAt;
  }
}
