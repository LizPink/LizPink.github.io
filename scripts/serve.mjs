import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".gif":"image/gif", ".mp4":"video/mp4", ".webm":"video/webm", ".vtt":"text/vtt; charset=utf-8", ".pdf":"application/pdf", ".woff2":"font/woff2", ".ico":"image/x-icon" };

export function serve({ root = path.join(projectRoot, "dist"), port = 4182, live = false } = {}) {
  root = path.resolve(root);
  const clients = new Set();
  const server = http.createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let url;
    try { url = new URL(req.url, "http://127.0.0.1"); }
    catch { res.writeHead(400); res.end(); return; }
    if (live && url.pathname === "/__events") {
      res.writeHead(200, { "Content-Type":"text/event-stream", "Cache-Control":"no-store", Connection:"keep-alive" });
      res.write(": connected\n\n"); clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    let target;
    try { target = path.resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`); }
    catch { res.writeHead(400); res.end(); return; }
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || target.includes("\0")) { res.writeHead(403); res.end(); return; }
    let stat;
    try { stat = fs.statSync(target); } catch { res.writeHead(404); res.end("Not found"); return; }
    if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
    const extension = path.extname(target).toLowerCase();
    const headers = { "Content-Type":types[extension] || "application/octet-stream", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" };
    if (live && extension === ".html") {
      const html = fs.readFileSync(target, "utf8").replace("</body>", '<script>new EventSource("/__events").onmessage=()=>location.reload();</script></body>');
      headers["Content-Length"] = Buffer.byteLength(html);
      res.writeHead(200, headers); res.end(req.method === "HEAD" ? undefined : html); return;
    }
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, { "Content-Range":`bytes */${stat.size}` }); res.end(); return; }
      if (!range[1]) start = Math.max(0, stat.size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (start > end || start >= stat.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) { res.writeHead(416, { "Content-Range":`bytes */${stat.size}` }); res.end(); return; }
      status = 206; headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers["Accept-Ranges"] = "bytes";
    headers["Content-Length"] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === "HEAD" || !stat.size) { res.end(); return; }
    const stream = fs.createReadStream(target, { start, end });
    stream.on("error", () => res.destroy()); res.on("close", () => stream.destroy()); stream.pipe(res);
  });
  const ready = new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return { server, ready, broadcast: () => clients.forEach(client => client.write(`data: ${Date.now()}\n\n`)), close: () => { clients.forEach(client => client.end()); server.close(); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const instance = serve();
  try { await instance.ready; console.log("预览：http://127.0.0.1:4182/"); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
