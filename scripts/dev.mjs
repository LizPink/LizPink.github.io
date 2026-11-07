import { watch } from "node:fs";
import path from "node:path";
import { build, projectRoot } from "./build.mjs";
import { serve } from "./serve.mjs";

let timer, running = false, pending = false, instance;
async function rebuild() {
  if (running) { pending = true; return; }
  running = true;
  do {
    pending = false;
    try { const content = await build(); console.log(`已更新 ${Object.keys(content.samples).length} 篇内容`); instance?.broadcast(); }
    catch (error) { console.error(`内容未更新：${error.message}`); }
  } while (pending);
  running = false;
}
try {
  await build();
  instance = serve({ live: true }); await instance.ready;
  console.log("本地预览：http://127.0.0.1:4182/（修改 content/ 或 site/ 后自动刷新）");
  const watchers = ["content", "site"].map(dir => watch(path.join(projectRoot, dir), { recursive: true }, () => {
    clearTimeout(timer); timer = setTimeout(rebuild, 120);
  }));
  const close = () => { clearTimeout(timer); watchers.forEach(watcher => watcher.close()); instance.close(); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
} catch (error) { console.error(error.message); process.exitCode = 1; }
