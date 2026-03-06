function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  // Save to server settings so new sessions use the right theme
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
}

function getTheme() {
  return document.documentElement.getAttribute("data-theme");
}

function initTheme() {
  applyTheme(localStorage.getItem("theme") || "dark");
  document.getElementById("theme-btn").addEventListener("click", () => {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  });
}
