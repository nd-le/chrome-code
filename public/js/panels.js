function openPanel(overlay) {
  document.querySelectorAll("#main iframe").forEach(f => f.style.pointerEvents = "none");
  overlay.classList.add("open");
}

function closePanel(overlay) {
  overlay.classList.remove("open");
  document.querySelectorAll("#main iframe").forEach(f => f.style.pointerEvents = "");
}
