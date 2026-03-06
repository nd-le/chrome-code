let activePort = null;
const welcomeEl = document.getElementById("welcome");

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  return Math.floor(hrs / 24) + "d";
}

function getOrCreateIframe(port) {
  const main = document.getElementById("main");
  let iframe = main.querySelector('iframe[data-port="' + port + '"]');
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.dataset.port = port;
    iframe.src = "http://127.0.0.1:" + port;
    main.appendChild(iframe);
  }
  return iframe;
}

function removeIframe(port) {
  const iframe = document.querySelector('#main iframe[data-port="' + port + '"]');
  if (iframe) iframe.remove();
}

function showSession(port) {
  activePort = port;
  if (welcomeEl) welcomeEl.style.zIndex = "-1";
  document.querySelectorAll("#main iframe").forEach(f => f.classList.remove("active"));
  getOrCreateIframe(port).classList.add("active");
  document.querySelectorAll(".session-item").forEach(el => {
    el.classList.toggle("active", el.dataset.port == port);
  });
}

function showWelcome() {
  activePort = null;
  document.querySelectorAll("#main iframe").forEach(f => f.classList.remove("active"));
  if (welcomeEl) welcomeEl.style.zIndex = "";
}

function updateTitle(sessions) {
  if (!sessions || sessions.length === 0) { document.title = "Chrome Code"; return; }
  const waiting = sessions.filter(s => s.status === "waiting").length;
  const busy = sessions.filter(s => s.status === "busy").length;
  const parts = [];
  if (waiting) parts.push(waiting + " needs input");
  if (busy) parts.push(busy + " working");
  const status = parts.length ? parts.join(", ") + " | " : "";
  document.title = status + sessions.length + " session" + (sessions.length === 1 ? "" : "s") + " - Chrome Code";
}

const STATUS_DOT = {
  busy:     '<span class="status-dot busy" title="Working"></span>',
  waiting:  '<span class="status-dot waiting" title="Needs approval"></span>',
  done:     '<span class="status-dot done" title="Done"></span>',
  idle:     '<span class="status-dot idle" title="Ready"></span>',
  active:   '<span class="status-dot active" title="Active"></span>',
  starting: '<span class="status-dot starting" title="Starting"></span>',
  unknown:  '<span class="status-dot unknown" title="Unknown"></span>',
};

async function loadSessions() {
  const data = await (await fetch("/api/sessions")).json();
  const list = document.getElementById("session-list");
  const main = document.getElementById("main");

  updateTitle(data);
  checkAlerts(data);

  if (data.length === 0) {
    list.innerHTML = '<li class="no-sessions">No active sessions</li>';
    main.querySelectorAll("iframe").forEach(f => f.remove());
    if (activePort) showWelcome();
    return;
  }

  const activePorts = new Set(data.map(s => String(s.port)));
  main.querySelectorAll("iframe").forEach(f => {
    if (!activePorts.has(f.dataset.port)) f.remove();
  });

  list.innerHTML = data.map(s =>
    '<li class="session-item' + (s.port === activePort ? ' active' : '') + '" data-port="' + s.port + '">' +
    (STATUS_DOT[s.status] || STATUS_DOT.unknown) +
    '<div class="session-info-col">' +
    '<span class="session-name">' + s.dirName + '</span>' +
    '<span class="session-status-text">' + (s.label || "") + '</span>' +
    '</div>' +
    '<span class="session-age">' + timeAgo(s.startedAt) + '</span>' +
    '<button class="session-close" data-port="' + s.port + '" title="Stop">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button></li>'
  ).join("");

  list.querySelectorAll(".session-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".session-close")) return;
      showSession(parseInt(el.dataset.port));
    });
  });

  list.querySelectorAll(".session-close").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const port = parseInt(btn.dataset.port);
      await fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port }),
      });
      removeIframe(port);
      if (activePort === port) showWelcome();
      loadSessions();
    });
  });

  if (activePort && !data.find(s => s.port === activePort)) showWelcome();
}
