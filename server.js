const http = require("http");
const settings = require("./lib/settings");
const sessions = require("./lib/sessions");
const routes = require("./lib/routes");

let currentSettings = settings.load();
const HOST = process.env.HOST || currentSettings.host;
const PORT = parseInt(process.env.PORT || String(currentSettings.serverPort), 10);

sessions.init(currentSettings.ttydStartPort, HOST, currentSettings);

const server = http.createServer();

routes.setup(server, {
  host: HOST,
  getSettings: () => currentSettings,
  setSettings: (updates) => {
    currentSettings = { ...currentSettings, ...updates };
    settings.save(currentSettings);
    return currentSettings;
  },
});

process.on("SIGINT", () => { console.log("\nStopping all sessions..."); sessions.cleanupAll(); process.exit(0); });
process.on("SIGTERM", () => { console.log("\nStopping all sessions..."); sessions.cleanupAll(); process.exit(0); });

server.listen(PORT, HOST, () => {
  console.log(`Chrome Code server running at http://${HOST}:${PORT}`);
  console.log(`Default directory: ${currentSettings.defaultDir}`);
});
