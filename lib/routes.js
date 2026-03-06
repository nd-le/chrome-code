const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const sessions = require("./sessions");

function jsonResponse(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function setup(server, { getSettings, setSettings, host }) {
  const publicDir = path.join(__dirname, "..", "public");
  const faviconPath = path.join(__dirname, "..", "favicon.png");

  server.on("request", async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // --- Static files ---

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(path.join(publicDir, "index.html")));
      return;
    }

    if (url.pathname === "/favicon.png" && req.method === "GET") {
      if (fs.existsSync(faviconPath)) {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(fs.readFileSync(faviconPath));
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    if (url.pathname.startsWith("/js/") && req.method === "GET") {
      const filePath = path.join(publicDir, url.pathname);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(publicDir) || !fs.existsSync(resolved)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(resolved);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(fs.readFileSync(resolved));
      return;
    }

    // --- API ---

    if (url.pathname === "/api/pick-folder" && req.method === "GET") {
      const proc = spawn("osascript", ["-e", 'tell application "Finder" to activate', "-e", 'POSIX path of (choose folder with prompt "Choose a project folder")']);
      let stdout = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          jsonResponse(res, 200, { dir: stdout.trim().replace(/\/$/, "") });
        } else {
          jsonResponse(res, 200, { dir: null });
        }
      });
      return;
    }

    if (url.pathname === "/api/sessions" && req.method === "GET") {
      const list = [];
      for (const [port, session] of sessions.getAll()) {
        const status = sessions.getStatus(port);
        list.push({ port, dir: session.dir, dirName: session.dirName, startedAt: session.startedAt, ...status });
      }
      jsonResponse(res, 200, list);
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "GET") {
      jsonResponse(res, 200, getSettings());
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "POST") {
      try {
        const updates = JSON.parse(await readBody(req));
        jsonResponse(res, 200, setSettings(updates));
      } catch {
        jsonResponse(res, 400, { error: "Bad request" });
      }
      return;
    }

    if (url.pathname === "/api/start" && req.method === "POST") {
      try {
        const { dir, theme } = JSON.parse(await readBody(req));
        if (!dir || !fs.existsSync(dir)) {
          jsonResponse(res, 400, { error: "Invalid directory" });
          return;
        }
        const settings = getSettings();
        const result = sessions.start(dir, {
          host,
          fontSize: settings.fontSize,
          theme: theme || settings.theme,
        });
        // Small delay so ttyd can bind its port
        setTimeout(() => jsonResponse(res, 200, result), 500);
      } catch {
        jsonResponse(res, 400, { error: "Bad request" });
      }
      return;
    }

    if (url.pathname === "/api/stop" && req.method === "POST") {
      try {
        const { port } = JSON.parse(await readBody(req));
        jsonResponse(res, 200, { stopped: sessions.stop(port) });
      } catch {
        jsonResponse(res, 400, { error: "Bad request" });
      }
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });
}

module.exports = { setup };
