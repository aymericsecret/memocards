import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("dist", import.meta.url)));
const port = Number(process.env.PORT ?? 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function getAssetPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const requestedPath = normalize(join(root, pathname));

  if (!requestedPath.startsWith(root)) return null;
  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) return requestedPath;

  return join(root, "index.html");
}

createServer((request, response) => {
  const assetPath = getAssetPath(request.url ?? "/");

  if (!assetPath || !existsSync(assetPath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": assetPath.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "Content-Type": contentTypes[extname(assetPath)] ?? "application/octet-stream"
  });
  createReadStream(assetPath).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Memocards frontend listening on port ${port}`);
});
