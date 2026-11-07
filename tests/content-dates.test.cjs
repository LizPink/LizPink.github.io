"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { stringify } = require("yaml");

const project = path.resolve(__dirname, "..");
const buildModule = pathToFileURL(path.join(project, "scripts/build-content.mjs")).href;
const builder = import(buildModule);
const prefix = "lizpink-content-dates-";
const creationDate = "2020-01-02";

async function write(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value);
}

function git(cwd, args, date) {
  const result = spawnSync("git", ["-c", "commit.gpgsign=false", ...args], {
    cwd, encoding: "utf8", windowsHide: true,
    env: { ...process.env, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) }
  });
  assert.equal(result.status, 0, `${args.join(" ")}: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith(prefix));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

async function fixture(t, { repository = true, repoName = "repository" } = {}) {
  const root = await temporary(t);
  const repo = path.join(root, repoName);
  const contentDir = path.join(repo, "content");
  const outputDir = path.join(root, "output");
  await fs.mkdir(path.join(contentDir, "entries"), { recursive: true });
  await write(path.join(contentDir, "site.yml"), stringify({
    name: "Test", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  if (repository) {
    git(repo, ["init", "-b", "main"]);
    git(repo, ["config", "user.name", "Content date test"]);
    git(repo, ["config", "user.email", "content-date-test@example.invalid"]);
    git(repo, ["config", "core.autocrlf", "false"]);
    const hooks = path.join(root, "empty-hooks");
    await fs.mkdir(hooks);
    git(repo, ["config", "core.hooksPath", hooks]);
  }
  return {
    root, repo, contentDir, outputDir,
    file(key, name = "index.md") { return path.join(contentDir, "entries", key, name); },
    async article(key = "article", metadata = {}, body = "Article body.") {
      const file = this.file(key);
      await write(file, `---\n${stringify({ title: key, sections: ["project"], publishedAt: creationDate, ...metadata })}---\n${body}\n`);
      return file;
    },
    commit(date, message = "Update fixture", paths = ["."]) {
      git(repo, ["add", "-A", "--", ...paths]);
      return git(repo, ["commit", "-qm", message], date);
    },
    git(args, date) { return git(repo, args, date); },
    async build() { return (await builder).buildContent({ contentDir, outputDir }); }
  };
}

function unchangedCreation(sample) {
  assert.equal(sample.publishedAt, creationDate);
  assert.equal(Object.hasOwn(sample, "updatedAt"), false);
}

test("a source archive keeps authored dates and ignores filesystem modification times", async t => {
  const f = await fixture(t, { repository: false });
  const file = await f.article();
  const source = await fs.readFile(file, "utf8");
  const future = new Date("2045-09-10T00:00:00Z");
  await fs.utimes(file, future, future);
  const before = await fs.stat(file);
  unchangedCreation((await f.build()).samples.article);
  assert.equal(await fs.readFile(file, "utf8"), source);
  assert.equal((await fs.stat(file)).mtimeMs, before.mtimeMs);
});

test("first publication keeps its creation date without adding updatedAt to Markdown or output", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  const source = await fs.readFile(file, "utf8");
  unchangedCreation((await f.build()).samples.article);
  assert.equal(await fs.readFile(file, "utf8"), source);
  assert.equal(f.git(["status", "--porcelain"]), "");
});

test("a committed body update is calculated before section sorting and never rewrites the source", async t => {
  const f = await fixture(t);
  const file = await f.article("older");
  await f.article("newer", { publishedAt: "2026-11-02" });
  f.commit("2026-11-03T10:00:00Z");
  assert.deepEqual((await f.build()).paths.find(item => item.id === "project").items, ["newer", "older"]);
  await fs.appendFile(file, "\nA committed body revision.\n");
  f.commit("2026-11-05T10:00:00Z");
  const source = await fs.readFile(file, "utf8");
  const content = await f.build();
  assert.equal(content.samples.older.updatedAt, "2026-11-05");
  assert.deepEqual(content.paths.find(item => item.id === "project").items, ["older", "newer"]);
  assert.equal(await fs.readFile(file, "utf8"), source);
  assert.equal(f.git(["status", "--porcelain"]), "");
});

test("nested media replacements and deletions update only the owning article", async t => {
  const f = await fixture(t);
  await f.article("article", {}, "![Clip](./videos/demo.mp4)");
  const video = f.file("article", "videos/demo.mp4");
  const poster = f.file("article", "videos/demo.poster.png");
  const unused = f.file("article", "photos/unused.svg");
  await write(video, "initial video bytes");
  await write(poster, "initial poster bytes");
  await write(unused, "<svg/>");
  f.commit("2026-11-01T10:00:00Z");
  await write(video, "replacement video bytes");
  f.commit("2026-11-04T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-04");
  await write(poster, "replacement poster bytes");
  f.commit("2026-11-05T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-05");
  await fs.unlink(unused);
  f.commit("2026-11-06T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-06");
});

test("commits to other articles or site code do not change an article update date", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nUpdated article.\n");
  f.commit("2026-11-02T10:00:00Z");
  await f.article("another", { publishedAt: "2026-11-04" });
  f.commit("2026-11-04T10:00:00Z");
  await write(path.join(f.repo, "site/app.js"), "// unrelated code\n");
  f.commit("2026-11-05T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-02");
});

test("staged, unstaged and untracked draft files retain the last committed update date", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nCommitted revision.\n");
  f.commit("2026-11-02T10:00:00Z");
  await fs.appendFile(file, "\nStaged draft.\n");
  f.git(["add", "--", "content/entries/article/index.md"]);
  await fs.appendFile(file, "\nUnstaged draft.\n");
  await write(f.file("article", "photos/untracked.svg"), "<svg/>");
  await write(path.join(f.repo, "unrelated.txt"), "untracked code draft");
  const source = await fs.readFile(file, "utf8");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-02");
  assert.equal(await fs.readFile(file, "utf8"), source);
});

test("an explicitly authored updatedAt always takes priority over Git", async t => {
  const f = await fixture(t);
  const file = await f.article("article", { updatedAt: "2024-03-04" });
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nLater committed edit.\n");
  f.commit("2026-11-06T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2024-03-04");
});

test("media committed before index.md does not make first publication look like an update", async t => {
  const f = await fixture(t);
  const media = f.file("article", "photos/photo.svg");
  await write(media, "<svg/>");
  f.commit("2026-11-01T10:00:00Z");
  await f.article("article", {}, "![Photo](./photos/photo.svg)");
  f.commit("2026-11-04T10:00:00Z");
  unchangedCreation((await f.build()).samples.article);
  await write(media, "<svg><title>Revised</title></svg>");
  f.commit("2026-11-05T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-05");
});

test("a deleted and recreated article starts a new publication history", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nOld article revision.\n");
  f.commit("2026-11-02T10:00:00Z");
  const directory = path.dirname(file);
  assert.equal(path.dirname(directory), path.join(f.contentDir, "entries"));
  await fs.rm(directory, { recursive: true });
  f.commit("2026-11-03T10:00:00Z");
  await f.article();
  unchangedCreation((await f.build()).samples.article);
  f.commit("2026-11-04T10:00:00Z");
  unchangedCreation((await f.build()).samples.article);
  await fs.appendFile(file, "\nRecreated article revision.\n");
  f.commit("2026-11-05T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-05");
});

test("a shallow checkout falls back to authored dates rather than inventing history", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nCommitted revision.\n");
  f.commit("2026-11-05T10:00:00Z");
  const cloned = path.join(f.root, "shallow-clone");
  git(f.root, ["-c", "protocol.file.allow=always", "clone", "--quiet", "--depth", "1", pathToFileURL(f.repo).href, cloned]);
  assert.equal(git(cloned, ["rev-parse", "--is-shallow-repository"]), "true");
  const content = await (await builder).buildContent({ contentDir: path.join(cloned, "content"), outputDir: path.join(f.root, "shallow-output") });
  unchangedCreation(content.samples.article);
});

test("a missing Git executable still builds successfully using authored dates", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nCommitted revision.\n");
  f.commit("2026-11-05T10:00:00Z");
  const script = `const {buildContent}=await import(${JSON.stringify(buildModule)});const result=await buildContent(${JSON.stringify({ contentDir: f.contentDir, outputDir: f.outputDir })});process.stdout.write(JSON.stringify(result));`;
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toLowerCase() === "path") delete env[key];
  env.PATH = "";
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: f.repo, env, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  unchangedCreation(JSON.parse(result.stdout).samples.article);
});

test("Git timestamps are converted to Asia Shanghai dates instead of truncating commit offsets", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z");
  await fs.appendFile(file, "\nFirst timezone revision.\n");
  f.commit("2026-11-07T00:30:00+09:00");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-06");
  await fs.appendFile(file, "\nSecond timezone revision.\n");
  f.commit("2026-11-06T18:30:00-05:00");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-07");
});

test("Chinese paths with spaces and parentheses retain literal Git and media paths", async t => {
  const f = await fixture(t, { repoName: "站点 内容 (一)" });
  await f.article("笔记", {}, "![演示](<./videos/演示 (一).MP4>)");
  const media = f.file("笔记", "videos/演示 (一).MP4");
  await write(media, "initial video bytes");
  f.commit("2026-11-01T10:00:00Z");
  await write(media, "revised video bytes");
  f.commit("2026-11-06T10:00:00Z");
  const sample = (await f.build()).samples["笔记"];
  assert.equal(sample.updatedAt, "2026-11-06");
  assert.match(sample.body, /<video /);
});

test("first publication through a non-fast-forward merge still keeps its creation date", async t => {
  const f = await fixture(t);
  f.commit("2026-11-01T10:00:00Z", "Initial site");
  f.git(["checkout", "-qb", "article-feature"]);
  await f.article();
  f.commit("2026-11-02T10:00:00Z", "Create article on feature branch");
  f.git(["checkout", "-q", "main"]);
  await write(path.join(f.repo, "site/app.js"), "// unrelated main change\n");
  f.commit("2026-11-03T10:00:00Z", "Change site code");
  f.git(["merge", "--no-ff", "--no-edit", "article-feature"], "2026-11-04T10:00:00Z");
  unchangedCreation((await f.build()).samples.article);
});

test("a non-fast-forward merge preserves the actual content revision date", async t => {
  const f = await fixture(t);
  const file = await f.article();
  f.commit("2026-11-01T10:00:00Z", "Create article");
  f.git(["checkout", "-qb", "article-feature"]);
  await fs.appendFile(file, "\nRevision on feature branch.\n");
  f.commit("2026-11-02T10:00:00Z", "Update article on feature branch");
  f.git(["checkout", "-q", "main"]);
  await write(path.join(f.repo, "site/app.js"), "// unrelated main change\n");
  f.commit("2026-11-03T10:00:00Z", "Change site code");
  f.git(["merge", "--no-ff", "--no-edit", "article-feature"], "2026-11-04T10:00:00Z");
  assert.equal((await f.build()).samples.article.updatedAt, "2026-11-02");
});
