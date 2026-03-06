# <img src="favicon.png" width="24" height="24"> Chrome Code

Claude Code in a browser tab. Multiple persistent sessions, live status, sound alerts, Chrome notifications.

## Requirements

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude` in PATH)
- [ttyd](https://github.com/tsl0922/ttyd)
- [tmux](https://github.com/tmux/tmux)

```bash
# macOS
brew install ttyd tmux

# Ubuntu/Debian
sudo apt-get install -y ttyd tmux
```

## Usage

```bash
node server.js
```

Open http://127.0.0.1:7680. Click "New session", pick a folder, done.

Sessions run in tmux so they persist when you switch between them.

```bash
# Options
PORT=8080 node server.js
```

## Project Structure

```
server.js              Entry point
lib/
  settings.js          Settings load/save (settings.json)
  sessions.js          Session lifecycle, tmux management, status detection
  routes.js            HTTP API and static file serving
public/
  index.html           Markup and CSS
  js/
    app.js             Wires everything together
    alerts.js          Browser notifications and sound alerts
    theme.js           Light/dark theme toggle
    sessions.js        Session list, iframe management, tab title
    settings.js        Settings panel
    panels.js          Panel open/close helpers
favicon.png            Chrome favicon
```

## Status Detection

Reads tmux pane content to show what Claude is doing:

| Dot | Meaning |
|-----|---------|
| Yellow (pulsing) | Thinking / tool use in progress |
| Red (pulsing) | Needs approval or edit review |
| Blue | Done, waiting for input |
| Green | Ready (fresh session) |

## How It Works

```
Browser tab (localhost:7680)
  └── iframe per session
        └── ttyd (localhost:7681+)
              └── tmux → claude
```

## License

MIT
