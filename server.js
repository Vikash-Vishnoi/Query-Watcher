const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const events = require("./api/events");
const got = require("./api/got");

const root = __dirname;
const port = Number(process.env.PORT);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/got" || url.pathname === "/got") {
    await got(req, res);
    return;
  }

  if (url.pathname === "/api/events") {
    await events(req, res);
    return;
  }

  const filePath = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript"
  };

  res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Lab receiver running at http://localhost:${port}`);
});
