let notificationsEnabled = localStorage.getItem("notifications") === "true";
let soundEnabled = localStorage.getItem("sound") === "true";
const prevStatuses = new Map();

function playAlertSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = "sine";
  gain.gain.value = 0.3;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.stop(ctx.currentTime + 0.3);
}

function checkAlerts(sessions) {
  for (const s of sessions) {
    const prev = prevStatuses.get(s.port);
    const nowWaiting = s.status === "waiting" || s.status === "done";
    const wasWorking = prev === "busy" || prev === "starting" || prev === "active";
    if (nowWaiting && wasWorking) {
      if (notificationsEnabled && Notification.permission === "granted") {
        new Notification("Chrome Code", { body: s.dirName + ": " + s.label });
      }
      if (soundEnabled) playAlertSound();
    }
    prevStatuses.set(s.port, s.status);
  }
}

function setAlertSettings(notifications, sound) {
  notificationsEnabled = notifications;
  soundEnabled = sound;
  localStorage.setItem("notifications", notifications);
  localStorage.setItem("sound", sound);
  if (notifications && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function getAlertSettings() {
  return { notificationsEnabled, soundEnabled };
}
