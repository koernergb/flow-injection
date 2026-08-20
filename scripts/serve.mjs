import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const host = process.env.FLOW_INJECTION_HOST ?? "127.0.0.1";
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".wgsl", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
]);

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, relative === "/" ? "index.html" : relative);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, "index.html");
  response.setHeader("Content-Type", types.get(extname(file)) ?? "application/octet-stream");
  response.setHeader("Cache-Control", "no-store");
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  process.stdout.write(`Flow Injection: http://${host}:${port}\n`);
});
