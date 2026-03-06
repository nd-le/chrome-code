document.getElementById("new-btn").addEventListener("click", async () => {
  const res = await fetch("/api/pick-folder");
  const data = await res.json();
  if (!data.dir) return;
  const startRes = await fetch("/api/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir: data.dir, theme: getTheme() }),
  });
  const startData = await startRes.json();
  if (startData.port) {
    showSession(startData.port);
    loadSessions();
  }
});

initTheme();
initSettings();
loadSessions();
setInterval(loadSessions, 2000);
