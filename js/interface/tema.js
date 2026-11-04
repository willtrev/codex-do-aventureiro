/* ================= Tema ================= */
let theme = "auto",
  hostTheme = document.documentElement.getAttribute("data-theme"),
  settingTheme = false;
try {
  theme = localStorage.getItem("grimorio-tema") || "auto";
} catch (e) {}
function applyTheme() {
  settingTheme = true;
  const r = document.documentElement;
  const v = theme === "auto" ? hostTheme : theme;
  if (v) r.setAttribute("data-theme", v);
  else r.removeAttribute("data-theme");
  settingTheme = false;
}
new MutationObserver(() => {
  if (settingTheme) return;
  const v = document.documentElement.getAttribute("data-theme");
  if (theme === "auto") hostTheme = v;
  else if (v !== theme) applyTheme();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
applyTheme();
