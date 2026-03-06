const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SESSIONS_PATH = path.join(__dirname, "..", ".sessions.json");
const sessions = new Map();
let nextPort;

function saveToDisk() {
  const data = [];
  for (const [port, session] of sessions) {
    data.push({ port, dir: session.dir, dirName: session.dirName, startedAt: session.startedAt });
  }
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(data));
}

function init(startPort, host, settings) {
  nextPort = startPort;
  // Recover sessions from previous server runs
  try {
    if (!fs.existsSync(SESSIONS_PATH)) return;
    const saved = JSON.parse(fs.readFileSync(SESSIONS_PATH, "utf-8"));
    for (const s of saved) {
      if (!s.dir || !fs.existsSync(s.dir)) continue;
      const port = s.port;
      // Kill any orphaned ttyd/tmux on this port
      try { execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`); } catch {}
      try { execSync(`tmux kill-session -t cct-${port} 2>/dev/null`); } catch {}
      // Re-spawn ttyd → tmux → claude
      const dirName = s.dirName || path.basename(s.dir);
      const isLight = (settings.theme) === "light";
      const themeArgs = isLight
        ? ["-t", 'theme={"background":"#ffffff","foreground":"#1f2328","cursor":"#1f2328","selectionBackground":"#0969da33"}']
        : ["-t", 'theme={"background":"#0d1117","foreground":"#c9d1d9","cursor":"#c9d1d9","selectionBackground":"#58a6ff33"}'];
      const proc = spawn("ttyd", [
        "-p", String(port),
        "-i", host,
        "-W",
        "-t", `titleFixed=Claude-${dirName}`,
        "-t", `fontSize=${settings.fontSize}`,
        ...themeArgs,
        "tmux", "new-session", "-A", "-s", `cct-${port}`, "-c", s.dir, "claude",
      ], { stdio: "ignore", detached: false, env: { ...process.env, CLAUDECODE: "" } });
      proc.on("exit", () => { sessions.delete(port); saveToDisk(); });
      sessions.set(port, { proc, dir: s.dir, dirName, startedAt: s.startedAt });
      if (port >= nextPort) nextPort = port + 1;
      console.log(`Recovered session: ${dirName} (port ${port})`);
    }
  } catch {}
}

function isPortFree(port) {
  try {
    const result = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: "utf-8" });
    return !result.trim();
  } catch {
    return true; // lsof exits non-zero when nothing found = port is free
  }
}

function findAvailablePort() {
  while (sessions.has(nextPort) || !isPortFree(nextPort)) nextPort++;
  return nextPort++;
}

function getAll() {
  return sessions;
}

function start(dir, { host, fontSize, theme }) {
  for (const [port, session] of sessions) {
    if (session.dir === dir) return { port, existing: true };
  }

  const port = findAvailablePort();
  const dirName = path.basename(dir);
  const isLight = theme === "light";
  const themeArgs = isLight
    ? ["-t", 'theme={"background":"#ffffff","foreground":"#1f2328","cursor":"#1f2328","selectionBackground":"#0969da33"}']
    : ["-t", 'theme={"background":"#0d1117","foreground":"#c9d1d9","cursor":"#c9d1d9","selectionBackground":"#58a6ff33"}'];

  const proc = spawn("ttyd", [
    "-p", String(port),
    "-i", host,
    "-W",
    "-t", `titleFixed=Claude-${dirName}`,
    "-t", `fontSize=${fontSize}`,
    ...themeArgs,
    "tmux", "new-session", "-A", "-s", `cct-${port}`, "-c", dir, "claude",
  ], { stdio: "ignore", detached: false, env: { ...process.env, CLAUDECODE: "" } });

  proc.on("exit", () => { sessions.delete(port); saveToDisk(); });
  sessions.set(port, { proc, dir, dirName, startedAt: new Date().toISOString() });
  saveToDisk();
  return { port, existing: false };
}

function stop(port) {
  const session = sessions.get(port);
  if (!session) return false;
  try { execSync(`tmux kill-session -t cct-${port} 2>/dev/null`); } catch {}
  session.proc.kill("SIGTERM");
  sessions.delete(port);
  saveToDisk();
  return true;
}

function getStatus(port) {
  try {
    const output = execSync(`tmux capture-pane -t cct-${port} -p 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 2000,
    });
    const lines = output.trim();
    if (!lines) return { status: "starting", label: "Starting" };

    const recent = lines.split("\n").slice(-25).join("\n");
    const bottom = lines.split("\n").slice(-6).join("\n");

    if (/Enter to select/i.test(bottom)) return { status: "waiting", label: "Select option" };
    if (/accept edit/i.test(bottom)) return { status: "waiting", label: "Review edit" };
    if (/Allow|Deny/i.test(bottom)) return { status: "waiting", label: "Needs approval" };
    if (/\(y\/n\)|yes\/no|Do you want to proceed|Continue\?/i.test(bottom)) return { status: "waiting", label: "Confirm" };

    if (/\u2733/.test(recent) || /tokens\)/.test(recent)) {
      const match = recent.match(/\u2733\s*([^\n(]+)/);
      if (match) {
        const verb = match[1].replace(/\.{2,}$/, "").trim();
        return { status: "busy", label: verb || "Thinking" };
      }
      return { status: "busy", label: "Thinking" };
    }

    const busyPatterns = [
      [/Reading\s/i, "Reading"], [/Searching/i, "Searching"],
      [/Writing\s/i, "Writing"], [/Editing\s/i, "Editing"],
      [/Running\s/i, "Running"], [/Executing/i, "Executing"],
      [/Building/i, "Building"], [/Installing/i, "Installing"],
      [/Fetching/i, "Fetching"], [/Creating/i, "Creating"],
      [/Updating/i, "Updating"], [/Compiling/i, "Compiling"],
      [/Testing/i, "Testing"],
    ];
    for (const [pattern, label] of busyPatterns) {
      if (pattern.test(recent)) return { status: "busy", label };
    }

    if (/\u276F/.test(bottom) || /\? for shortcuts/i.test(bottom)) return { status: "done", label: "Done" };
    if (/What would you like/i.test(recent) && !/Enter to select/i.test(recent)) return { status: "idle", label: "Ready" };
    if (/\$\s*$/m.test(bottom)) return { status: "idle", label: "Shell" };

    return { status: "active", label: "Active" };
  } catch {
    return { status: "unknown", label: "Unknown" };
  }
}

function cleanupAll() {
  for (const [port, session] of sessions) {
    try { execSync(`tmux kill-session -t cct-${port} 2>/dev/null`); } catch {}
    session.proc.kill("SIGTERM");
  }
}

module.exports = { init, getAll, start, stop, getStatus, cleanupAll };
