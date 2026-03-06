const path = require("path");
const os = require("os");
const fs = require("fs");

const SETTINGS_PATH = path.join(__dirname, "..", "settings.json");

const DEFAULTS = {
  defaultDir: os.homedir(),
  fontSize: 16,
  theme: "dark",
  host: "127.0.0.1",
  serverPort: 7680,
  ttydStartPort: 7681,
};

function load() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) };
    }
  } catch {}
  return { ...DEFAULTS };
}

function save(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

module.exports = { load, save };
