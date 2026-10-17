/* Page chrome that behaves with the reader's hand:
   - the header is pinned; while the reader scrolls, moves a pointer, touches or types it shows,
     and after IDLE ms of nothing (or when the window loses the pointer or focus) it tucks away.
     At the very top of a page, with the menu open, or with focus inside it, it stays.
   - on the catalogue page three faint buttons (top, middle, bottom) follow the same rule.
   - the copyright year runs from 2026 to the current year.
   No network, no storage. */
(function () {
  "use strict";
  var IDLE = 5000, NEAR_TOP = 80, START_YEAR = 2026;
  var header = document.querySelector(".masthead");
  var nav = document.getElementById("site-nav");
  var jumps = null;
  var timer = 0;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- copyright year ---- */
  var now = new Date().getFullYear();
  Array.prototype.forEach.call(document.querySelectorAll("[data-years]"), function (el) {
    el.textContent = now > START_YEAR ? START_YEAR + "–" + now : String(START_YEAR);
  });

  function y() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function holding() {
    if (!header) return false;
    if (nav && nav.getAttribute("data-open") === "true") return true;
    if (header.contains(document.activeElement) && document.activeElement !== document.body) return true;
    try { if (header.matches(":hover")) return true; } catch (e) { /* old engines */ }
    return false;
  }

  function setJumps(on) { if (jumps) jumps.classList.toggle("is-on", on); }
  function show() {
    if (header) { header.classList.remove("is-hidden"); header.classList.toggle("is-pinned", y() > NEAR_TOP); }
    setJumps(true);
  }
  function hide() {
    if (header && y() > NEAR_TOP && !holding()) header.classList.add("is-hidden");
    setJumps(false);
  }
  function wake() {
    show();
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, IDLE);
  }
  function away() {              /* the pointer left the window, or the tab lost focus */
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, 600);
  }

  if (header) {
    ["scroll", "wheel", "mousemove", "pointerdown", "touchstart", "touchmove", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });
    });
    header.addEventListener("focusin", wake);
    document.documentElement.addEventListener("mouseleave", away);
    window.addEventListener("blur", away);
    document.addEventListener("visibilitychange", function () { if (document.hidden) away(); else wake(); });
    show();
    timer = window.setTimeout(hide, IDLE);
  }

  /* ---- catalogue: jump to the top, the middle, the end ---- */
  if (document.body.classList.contains("page-catalogue")) {
    var ICON = {
      up: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 14.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      mid: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      down: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    jumps = document.createElement("div");
    jumps.className = "jumps";
    jumps.setAttribute("role", "group");
    jumps.setAttribute("aria-label", "Jump along the catalogue");
    jumps.innerHTML =
      '<button type="button" class="jump" data-jump="top" aria-label="Jump to the top">' + ICON.up + "</button>" +
      '<button type="button" class="jump" data-jump="mid" aria-label="Jump to the middle of the list">' + ICON.mid + "</button>" +
      '<button type="button" class="jump" data-jump="end" aria-label="Jump to the end of the list">' + ICON.down + "</button>";
    document.body.appendChild(jumps);
    jumps.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-jump]");
      if (!b) return;
      var which = b.getAttribute("data-jump");
      function target() {
        var doc = document.documentElement, list = document.getElementById("list");
        var max = Math.max(0, doc.scrollHeight - window.innerHeight);
        if (which === "end") return max;
        if (which === "mid") {
          var top = list ? list.getBoundingClientRect().top + y() : 0, h = list ? list.offsetHeight : max;
          return Math.min(max, Math.max(0, top + h / 2 - window.innerHeight / 2));
        }
        return 0;
      }
      window.scrollTo({ top: target(), behavior: reduce ? "auto" : "smooth" });
      /* the list can settle a little after fonts load; once the glide is over, correct any drift */
      window.setTimeout(function () {
        var t = target();
        if (Math.abs(y() - t) > 40) window.scrollTo({ top: t, behavior: "auto" });
      }, reduce ? 50 : 1600);
      wake();
    });
    jumps.addEventListener("focusin", wake);
  }
})();
