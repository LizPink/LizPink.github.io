"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { stringify } = require("yaml");

const builder = import("../scripts/build.mjs");
const contentBuilder = import("../scripts/build-content.mjs");
const nativeRename = fs.rename;
const nativeRemove = fs.rm;

function failure(code, message) {
  return Object.assign(new Error(message), { code });
}

async function temporaryRoot(t, prefix) {
  const parent = path.resolve(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, prefix));
  t.after(async () => {
    t.mock.restoreAll();
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith(prefix));
    await nativeRemove(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 });
  });
  return root;
}

async function fixture(t) {
  const root = await temporaryRoot(t, "build-recovery-test-");
  const site = path.join(root, "site");
  const content = path.join(root, "content");
  const work = path.join(root, ".build");
  const dist = path.join(root, "dist");
  await fs.mkdir(site, { recursive: true });
  await fs.mkdir(path.join(content, "entries"), { recursive: true });
  await fs.writeFile(path.join(content, "site.yml"), stringify({
    name: "Build recovery", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  const setRelease = name => fs.writeFile(path.join(site, "index.html"),
    `<!doctype html><html><head><title>{{SITE_NAME}}</title></head><body><h1>{{SITE_GREETING}}</h1><p>${name}</p></body></html>`);
  const build = async () => (await builder).build(root);
  const output = () => fs.readFile(path.join(dist, "index.html"), "utf8");
  await setRelease("old-release");
  await build();
  const previous = await output();
  await setRelease("new-release");
  return {
    root, work, dist, build, output, previous,
    isStaging: value => path.dirname(String(value)) === work && path.basename(String(value)).startsWith("site-"),
    isBackup: value => path.dirname(String(value)) === work && path.basename(String(value)).startsWith("previous-"),
    async unlocked() { await assert.rejects(fs.stat(path.join(work, "build.lock")), { code: "ENOENT" }); },
    async clean() { assert.deepEqual(await fs.readdir(work), []); }
  };
}

test("transient backup and staging rename locks are retried before installing the new release", async t => {
  const f = await fixture(t);
  let backupAttempts = 0;
  let stagingAttempts = 0;
  t.mock.method(fs, "rename", async (source, destination) => {
    if (String(source) === f.dist && f.isBackup(destination) && ++backupAttempts === 1) {
      throw failure("EBUSY", "Injected transient old-release lock");
    }
    if (f.isStaging(source) && String(destination) === f.dist && ++stagingAttempts === 1) {
      throw failure("EPERM", "Injected transient staging lock");
    }
    return nativeRename(source, destination);
  });
  await f.build();
  assert.match(await f.output(), /new-release/);
  assert.ok(backupAttempts > 1 && backupAttempts < 10);
  assert.ok(stagingAttempts > 1 && stagingAttempts < 10);
  await f.unlocked();
  await f.clean();
});

test("persistent staging lock exhausts a bounded retry budget and restores the previous release", async t => {
  const f = await fixture(t);
  let attempts = 0;
  const locked = failure("EPERM", "Injected persistent staging lock");
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isStaging(source) && String(destination) === f.dist) {
      attempts += 1;
      throw locked;
    }
    return nativeRename(source, destination);
  });
  await assert.rejects(f.build(), error => error === locked);
  assert.ok(attempts > 1 && attempts < 10);
  assert.equal(await f.output(), f.previous);
  await f.unlocked();
  await f.clean();
});

test("rollback itself retries a transient access error while retaining the original build failure", async t => {
  const f = await fixture(t);
  let restoreAttempts = 0;
  const rejected = failure("EIO", "Injected non-retryable new-release failure");
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isStaging(source) && String(destination) === f.dist) throw rejected;
    if (f.isBackup(source) && String(destination) === f.dist && ++restoreAttempts === 1) {
      throw failure("EACCES", "Injected transient rollback lock");
    }
    return nativeRename(source, destination);
  });
  await assert.rejects(f.build(), error => error === rejected);
  assert.ok(restoreAttempts > 1 && restoreAttempts < 10);
  assert.equal(await f.output(), f.previous);
  await f.unlocked();
  await f.clean();
});

test("non-transient rename failures are reported immediately without retrying", async t => {
  const f = await fixture(t);
  let attempts = 0;
  const invalid = failure("EINVAL", "Injected permanent rename argument error");
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isStaging(source) && String(destination) === f.dist) {
      attempts += 1;
      throw invalid;
    }
    return nativeRename(source, destination);
  });
  await assert.rejects(f.build(), error => error === invalid);
  assert.equal(attempts, 1);
  assert.equal(await f.output(), f.previous);
  await f.unlocked();
  await f.clean();
});

test("staging cleanup failure still closes and releases the build lock", async t => {
  const f = await fixture(t);
  const buildFailure = failure("EIO", "Injected staging installation failure");
  const cleanupFailure = failure("EPERM", "Injected staging cleanup failure");
  let cleanupOptions;
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isStaging(source) && String(destination) === f.dist) throw buildFailure;
    return nativeRename(source, destination);
  });
  t.mock.method(fs, "rm", async (target, options) => {
    if (f.isStaging(target)) {
      cleanupOptions = options;
      throw cleanupFailure;
    }
    return nativeRemove(target, options);
  });
  await assert.rejects(f.build(), error => error instanceof AggregateError &&
    error.cause === buildFailure && error.errors.includes(buildFailure) && error.errors.includes(cleanupFailure));
  assert.deepEqual(cleanupOptions, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 });
  assert.equal(await f.output(), f.previous);
  await f.unlocked();
  assert.ok((await fs.readdir(f.work)).some(name => name.startsWith("site-")));
});

test("persistent top-level rollback failure retains the previous website and reports its recovery path", async t => {
  const f = await fixture(t);
  const buildFailure = failure("EIO", "Injected staging installation failure");
  const restoreFailure = failure("EACCES", "Injected persistent old-release rollback lock");
  let backup;
  let restoreAttempts = 0;
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isStaging(source) && String(destination) === f.dist) throw buildFailure;
    if (f.isBackup(source) && String(destination) === f.dist) {
      backup = String(source);
      restoreAttempts += 1;
      throw restoreFailure;
    }
    return nativeRename(source, destination);
  });
  await assert.rejects(f.build(), error => error instanceof AggregateError &&
    error.cause === buildFailure && error.errors.includes(restoreFailure) && error.message.includes(backup));
  assert.ok(restoreAttempts > 1 && restoreAttempts < 10);
  assert.equal(await fs.readFile(path.join(backup, "index.html"), "utf8"), f.previous);
  assert.equal(path.dirname(backup), f.work);
  await assert.rejects(fs.stat(f.dist), { code: "ENOENT" });
  await f.unlocked();
});

async function contentFixture(t) {
  const root = await temporaryRoot(t, "content-recovery-test-");
  const contentDir = path.join(root, "content");
  const outputDir = path.join(root, "output");
  const article = path.join(contentDir, "entries", "article");
  const media = path.join(outputDir, "assets", "content");
  const script = path.join(outputDir, "assets", "js", "content.js");
  await fs.mkdir(article, { recursive: true });
  await fs.writeFile(path.join(contentDir, "site.yml"), stringify({
    name: "Content recovery", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  const picture = color => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${color}"/></svg>`;
  async function setContent(label, color) {
    await fs.writeFile(path.join(article, "index.md"),
      `---\n${stringify({ title: "Article", sections: ["project"], publishedAt: "2026-11-01", updatedAt: "2026-11-01" })}---\n${label}\n\n![Picture](./picture.svg)\n`);
    await fs.writeFile(path.join(article, "picture.svg"), picture(color));
  }
  const build = async () => (await contentBuilder).buildContent({ contentDir, outputDir });
  await setContent("old-content", "red");
  await build();
  const previousScript = await fs.readFile(script, "utf8");
  const previousPicture = await fs.readFile(path.join(media, "article", "picture.svg"), "utf8");
  await setContent("new-content", "blue");
  return {
    root, media, script, build, previousScript, previousPicture,
    newPicture: picture("blue"),
    isContentStage: value => path.dirname(String(value)) === root && path.basename(String(value)).startsWith(".content-build-"),
    isMediaStage(value) { return path.basename(String(value)) === "content" && this.isContentStage(path.dirname(String(value))); },
    isScriptStage(value) { return path.basename(String(value)) === "content.js" && this.isContentStage(path.dirname(String(value))); },
    isMediaBackup(value) { return path.basename(String(value)) === "previous-content" && this.isContentStage(path.dirname(String(value))); }
  };
}

test("direct content publication retries transient media and script installation locks", async t => {
  const f = await contentFixture(t);
  let mediaAttempts = 0;
  let scriptAttempts = 0;
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isMediaStage(source) && String(destination) === f.media && ++mediaAttempts === 1) {
      throw failure("EPERM", "Injected transient generated-media lock");
    }
    if (f.isScriptStage(source) && String(destination) === f.script && ++scriptAttempts === 1) {
      throw failure("EBUSY", "Injected transient generated-script lock");
    }
    return nativeRename(source, destination);
  });
  await f.build();
  assert.ok(mediaAttempts > 1 && mediaAttempts < 10);
  assert.ok(scriptAttempts > 1 && scriptAttempts < 10);
  assert.match(await fs.readFile(f.script, "utf8"), /new-content/);
  assert.equal(await fs.readFile(path.join(f.media, "article", "picture.svg"), "utf8"), f.newPicture);
  assert.equal((await fs.readdir(f.root)).filter(name => name.startsWith(".content-build-")).length, 0);
});

test("failed content script installation and rollback retain original media with an explicit recovery directory", async t => {
  const f = await contentFixture(t);
  const installFailure = failure("EPERM", "Injected persistent generated-script installation lock");
  const restoreFailure = failure("EACCES", "Injected persistent original-media restoration lock");
  let installAttempts = 0;
  let restoreAttempts = 0;
  let recoveryError;
  t.mock.method(fs, "rename", async (source, destination) => {
    if (f.isScriptStage(source) && String(destination) === f.script) {
      installAttempts += 1;
      throw installFailure;
    }
    if (f.isMediaBackup(source) && String(destination) === f.media) {
      restoreAttempts += 1;
      throw restoreFailure;
    }
    return nativeRename(source, destination);
  });
  await assert.rejects(f.build(), error => {
    recoveryError = error;
    return error instanceof AggregateError && error.cause === installFailure &&
      error.errors.includes(installFailure) && error.errors.includes(restoreFailure);
  });
  assert.ok(installAttempts > 1 && installAttempts < 10);
  assert.ok(restoreAttempts > 1 && restoreAttempts < 10);
  assert.ok(f.isContentStage(recoveryError.recoveryDirectory));
  assert.ok(recoveryError.message.includes(recoveryError.recoveryDirectory));
  const preserved = path.join(recoveryError.recoveryDirectory, "previous-content", "article", "picture.svg");
  assert.equal(await fs.readFile(preserved, "utf8"), f.previousPicture);
  assert.equal(await fs.readFile(f.script, "utf8"), f.previousScript);
});
