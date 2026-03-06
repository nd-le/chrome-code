function initSettings() {
  const overlay = document.getElementById("settings-overlay");

  document.getElementById("settings-btn").addEventListener("click", async () => {
    const s = await (await fetch("/api/settings")).json();
    document.getElementById("s-defaultDir").value = s.defaultDir || "";
    document.getElementById("s-fontSize").value = s.fontSize || 16;
    document.getElementById("s-theme").value = s.theme || "dark";
    document.getElementById("s-ttydStartPort").value = s.ttydStartPort || 7681;
    const alerts = getAlertSettings();
    document.getElementById("s-notifications").checked = alerts.notificationsEnabled;
    document.getElementById("s-sound").checked = alerts.soundEnabled;
    openPanel(overlay);
  });

  document.getElementById("settings-close").addEventListener("click", () => closePanel(overlay));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePanel(overlay);
  });

  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const body = {
      defaultDir: document.getElementById("s-defaultDir").value,
      fontSize: parseInt(document.getElementById("s-fontSize").value),
      theme: document.getElementById("s-theme").value,
      ttydStartPort: parseInt(document.getElementById("s-ttydStartPort").value),
    };
    setAlertSettings(
      document.getElementById("s-notifications").checked,
      document.getElementById("s-sound").checked
    );
    applyTheme(body.theme);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const msg = document.getElementById("save-msg");
    msg.style.display = "inline";
    setTimeout(() => msg.style.display = "none", 2000);
  });
}
