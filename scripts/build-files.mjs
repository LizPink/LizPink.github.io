import fs from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const maxRetries = 8;
const retryDelay = 50;
const transientErrors = new Set(["EPERM", "EACCES", "EBUSY"]);

// Windows readers and virus scanners can briefly prevent a directory rename.
// Bound the wait; permanent permissions and other failures still reach the caller.
async function retry(operation) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (!transientErrors.has(error.code) || attempt >= maxRetries) throw error;
      await delay(retryDelay * (attempt + 1));
    }
  }
}

export const renameWithRetry = (from, to) => retry(() => fs.rename(from, to));
export const unlinkWithRetry = file => retry(() => fs.unlink(file));

// Use Node's recursive-removal retries for locks anywhere in a generated tree.
export const removeWithRetry = directory => fs.rm(directory, {
  recursive: true, force: true, maxRetries, retryDelay
});
