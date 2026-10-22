/* Light and dark plates, and the mobile menu. Loaded last on every page.
   The plate is set before first paint by a tiny inline script in <head> (so there is no flash);
   this file wires the buttons. A saved choice wins; otherwise the device preference is followed.
   Nothing here touches the network. */
(function () {
  "use strict";
  var KEY = "tc_theme";
  var root = document.documentElement;
  var btn = document.querySelector(".theme-toggle");
  var label = btn ? btn.querySelector(".tt-label") : null;
  var meta = document.querySelector('meta[name="theme-color"]');
  var COLOR = { dark: "#08104a", light: "#eef1f8" };
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function stored() {
    try { var v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : null; } catch (e) { return null; }
  }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: the choice lasts for this page only */ } }
  function current() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function paint(t) {
    root.setAttribute("data-theme", t);
    if (meta) meta.setAttribute("content", COLOR[t]);
    if (btn) {
      var other = t === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to the " + other + " plate");
      if (label) label.textContent = other === "light" ? "Light" : "Dark";
    }
  }

  function flip(t, remember) {
    root.classList.add("theme-switching");
    paint(t);
    if (remember) save(t);
    window.setTimeout(function () { root.classList.remove("theme-switching"); }, 420);
  }

  paint(current());
  if (btn) btn.addEventListener("click", function () { flip(current() === "dark" ? "light" : "dark", true); });

  /* follow the device when no choice has been saved */
  if (mq) {
    var onSystem = function () { if (!stored()) flip(mq.matches ? "light" : "dark", false); };
    if (mq.addEventListener) mq.addEventListener("change", onSystem); else if (mq.addListener) mq.addListener(onSystem);
  }
  /* a choice made in another tab */
  window.addEventListener("storage", function (ev) {
    if (ev.key === KEY && (ev.newValue === "light" || ev.newValue === "dark")) paint(ev.newValue);
  });

  /* ---------- mobile menu ---------- */
  var nav = document.getElementById("site-nav");
  var burger = document.querySelector(".nav-toggle");
  if (!nav || !burger) return;

  function setNav(open, focusBack) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.setAttribute("data-open", open ? "true" : "false");
    if (!open && focusBack) burger.focus();
  }
  setNav(false, false);

  burger.addEventListener("click", function () { setNav(burger.getAttribute("aria-expanded") !== "true", false); });
  nav.addEventListener("click", function (ev) { if (ev.target.closest("a")) setNav(false, false); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && burger.getAttribute("aria-expanded") === "true") setNav(false, true);
  });
  document.addEventListener("click", function (ev) {
    if (burger.getAttribute("aria-expanded") === "true" && !ev.target.closest(".masthead")) setNav(false, false);
  });
  var wide = window.matchMedia ? window.matchMedia("(min-width: 56.01rem)") : null;
  if (wide) {
    var onWide = function () { if (wide.matches) setNav(false, false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
  }
})();
