/* The Daily Tao page.
     1. the yin-yang button: one turn, then the scroll unfolds with the chapter of the day (James Legge, 1891, public domain)
     2. the Cistercian clock: hours, minutes and seconds, and the date, in Cistercian numerals (and the Buddha analog face)
     3. the shared clock (window.TCDaily.clock) that drives the clock and the celestial astrolabe (js/astrolabe.js)
   One chapter per UTC day, counting from 1 January 2026 and repeating every 81 days. No network, nothing stored except the
   time-zone choice for the clock. */
(function () {
  "use strict";

  var ROOT = (document.body && document.body.getAttribute("data-root")) || "";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = ROOT + src; s.onload = function () { res(); }; s.onerror = function () { rej(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  /* ================================================================ the shared clock ================ */
  var clock = (function () {
    var c = { base: Date.now(), perf: performance.now(), speed: 1, playing: true, subs: [], raf: 0, dirty: true };
    c.now = function () { return c.playing ? c.base + (performance.now() - c.perf) * c.speed : c.base; };
    function rebase() { c.base = c.now(); c.perf = performance.now(); }
    c.on = function (fn) { c.subs.push(fn); c.kick(); };
    c.kick = function () { c.dirty = true; if (!c.raf) c.raf = requestAnimationFrame(loop); };
    c.set = function (ms) { c.base = ms; c.perf = performance.now(); c.kick(); };
    c.setSpeed = function (s) { rebase(); c.speed = s; c.kick(); };
    c.play = function () { if (!c.playing) { c.base = c.base; c.perf = performance.now(); c.playing = true; } c.kick(); };
    c.pause = function () { rebase(); c.playing = false; c.kick(); };
    c.toggle = function () { if (c.playing) c.pause(); else c.play(); };
    c.live = function () { c.base = Date.now(); c.perf = performance.now(); c.speed = 1; c.playing = true; c.kick(); };
    c.isLive = function () { return c.playing && c.speed === 1 && Math.abs(c.now() - Date.now()) < 1500; };
    function loop() {
      c.raf = 0;
      var ms = c.now(), force = c.dirty; c.dirty = false;
      for (var i = 0; i < c.subs.length; i++) { try { c.subs[i](ms, force); } catch (e) { if (window.console) console.error(e); } }
      if (c.playing && !document.hidden) c.raf = requestAnimationFrame(loop);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) c.kick(); });
    return c;
  })();

  /* ================================================================ 1. the yin-yang and the scroll ====== */
  var ROMAN = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  function roman(n) { var s = ""; ROMAN.forEach(function (r) { while (n >= r[0]) { s += r[1]; n -= r[0]; } }); return s; }
  function mod(a, n) { return ((a % n) + n) % n; }
  var EPOCH = Date.UTC(2026, 0, 1);
  function chapterOfDay(ms) {
    var d = new Date(ms), day = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - EPOCH) / 86400000);
    return mod(day, 81) + 1;
  }

  function mountScroll() {
    var btn = $("[data-yy]"), scroll = $("[data-scroll]");
    if (!btn || !scroll) return;
    var spin = btn.querySelector("svg"), hint = $("[data-yy-hint]"), sheet = $("[data-sheet]");
    var body = $("[data-chapter]"), prev = $("[data-prev]"), next = $("[data-next]"), today = $("[data-today]"), pick = $("[data-pick]");
    var DATA = window.TC_TAO || {}, todayCh = chapterOfDay(Date.now()), shown = todayCh, angle = 0, busy = false;
    var CREDIT = { mitchell: "Tao Te Ching, English version by Stephen Mitchell.", legge: "Tao Te Ching, translated by James Legge (1891; public domain)." };
    var ver = store("tc_tao_ver") === "legge" && DATA.legge ? "legge" : (DATA.mitchell ? "mitchell" : "legge");
    var vbtns = $$("[data-ver]");

    function dateLine() {
      var d = new Date(Date.now());
      return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear() + " (UTC)";
    }
    function blocks(ch) {
      return ch.b.map(function (b) {
        if (b[0] === "s") return '<p class="stanza">' + b[1].map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + "</p>";
        if (b[0] === "v") return '<p class="verse">' + b[1].map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("<br>") + "</p>";
        return "<p>" + esc(b[1]) + "</p>";
      }).join("");
    }
    function show(n) {
      var ch = (DATA[ver] || [])[n - 1];
      if (!ch) { body.innerHTML = "<p>The text could not be loaded.</p>"; return; }
      shown = n;
      body.innerHTML =
        '<p class="ch-kicker">' + (n === todayCh ? "Today&rsquo;s chapter" : "Chapter") + " &middot; " + n + " of 81</p>" +
        '<h2 class="ch-roman" aria-label="Chapter ' + n + '">' + roman(n) + "</h2>" +
        (n === todayCh ? '<p class="ch-date">' + dateLine() + "</p>" : "") +
        '<div class="ch-body">' + blocks(ch) + "</div>" +
        '<p class="ch-credit">' + CREDIT[ver] + "</p>";
      var p = n === 1 ? 81 : n - 1, q = n === 81 ? 1 : n + 1;
      prev.textContent = "‹ " + p; prev.setAttribute("aria-label", "Chapter " + p);
      next.textContent = q + " ›"; next.setAttribute("aria-label", "Chapter " + q);
      today.hidden = n === todayCh;
      if (pick) pick.value = String(n);
    }
    vbtns.forEach(function (b) {
      var v = b.getAttribute("data-ver");
      if (!DATA[v]) { b.hidden = true; return; }
      b.setAttribute("aria-pressed", String(v === ver));
      b.addEventListener("click", function () {
        ver = v; store("tc_tao_ver", v);
        vbtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-ver") === ver)); });
        show(shown);
      });
    });
    if (pick) {
      var o = ""; for (var i = 1; i <= 81; i++) o += '<option value="' + i + '">' + i + "</option>";
      pick.innerHTML = o;
      pick.addEventListener("change", function () { show(+pick.value); });
    }
    prev.addEventListener("click", function () { show(shown === 1 ? 81 : shown - 1); });
    next.addEventListener("click", function () { show(shown === 81 ? 1 : shown + 1); });
    today.addEventListener("click", function () { todayCh = chapterOfDay(Date.now()); show(todayCh); });

    function setOpen(open) {
      scroll.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Roll the scroll up" : "Open today’s chapter");
      sheet.inert = !open; sheet.setAttribute("aria-hidden", open ? "false" : "true");
      if (hint) hint.textContent = open ? "Touch the symbol again to roll the scroll up." : "Touch the yin-yang to unfold today’s chapter.";
    }
    setOpen(false);
    show(todayCh);

    btn.addEventListener("click", function () {
      if (busy) return;
      var open = !scroll.classList.contains("is-open");
      if (reduce) { setOpen(open); return; }
      busy = true;
      angle += open ? 360 : -360;
      spin.style.transform = "rotate(" + angle + "deg)";
      btn.classList.add("is-turning");
      setTimeout(function () { setOpen(open); }, open ? 780 : 120);
      setTimeout(function () { busy = false; btn.classList.remove("is-turning"); }, 1500);
    });

    if (/#(today|open)\b/.test(location.hash)) setTimeout(function () { btn.click(); }, 500);
  }

  /* ================================================================ 2. the Cistercian clock ============= */
  function mountCistercian() {
    var root = $("[data-cist]"), C = window.TCCist;
    if (!root || !C) return;
    var slots = {};
    $$("[data-g]", root).forEach(function (el) { slots[el.getAttribute("data-g")] = { el: el, last: null }; });
    /* three choices: UTC and My clock show the Cistercian signs; Analog shows the Buddha face on the visitor's own clock */
    var saved = store("tc_daily_zone"), mode = saved === "local" || saved === "analog" ? saved : "utc";
    var zone = mode === "utc" ? "utc" : "local";
    var face = $("[data-analog]", root), box = root.querySelector(".cist-clock");
    var hands = {}; $$("[data-an]", root).forEach(function (g) { hands[g.getAttribute("data-an")] = g; });
    function setMode(m) { mode = m; zone = m === "utc" ? "utc" : "local"; if (box) box.classList.toggle("is-analog", m === "analog" && !!face); }
    setMode(mode);
    var tzBtns = $$("[data-zone]", root), tag = $("[data-sim]", root), dline = $("[data-dateline]", root), zline = $("[data-zoneline]", root);
    var live = $("[data-live]", root), readout = $("[data-cist-read]", root);

    function put(name, n, compact, text) {
      var s = slots[name]; if (!s) return;
      var sig = n + ":" + compact;
      if (s.last === sig) return;
      s.last = sig;
      s.el.querySelector(".cc-sign").innerHTML = C.svg(n, { compact: compact, label: text + " in Cistercian numerals" });
      s.el.querySelector(".cc-num").textContent = (compact ? two(n) : String(n));
    }
    function parts(ms) {
      var d = new Date(ms);
      if (zone === "utc") return { h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), D: d.getUTCDate(), M: d.getUTCMonth() + 1, Y: d.getUTCFullYear(), w: d.getUTCDay() };
      return { h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds(), D: d.getDate(), M: d.getMonth() + 1, Y: d.getFullYear(), w: d.getDay() };
    }
    function zoneName() {
      if (zone === "utc") return "UTC, Coordinated Universal Time";
      try { return "Your clock: " + Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return "Your clock"; }
    }
    var lastLine = "";
    function render(ms) {
      var p = parts(ms);
      put("h", p.h, true, "hours " + p.h); put("m", p.mi, true, "minutes " + p.mi); put("s", p.s, true, "seconds " + p.s);
      put("D", p.D, true, "day " + p.D); put("M", p.M, true, "month " + p.M); put("Y", p.Y, false, "year " + p.Y);
      var line = DAYS[p.w] + " " + p.D + " " + MONTHS[p.M - 1] + " " + p.Y;
      if (line !== lastLine) { lastLine = line; dline.textContent = line; }
      var z = zoneName(); if (zline.textContent !== z) zline.textContent = z;
      var spoken = two(p.h) + ":" + two(p.mi) + ":" + two(p.s) + " " + line + (zone === "utc" ? " UTC" : "");
      if (readout && Math.floor(ms / 60000) !== render.m) { render.m = Math.floor(ms / 60000); readout.textContent = spoken; }
      if (mode === "analog" && face) {
        var fr = (((ms % 1000) + 1000) % 1000) / 1000, sf = p.s + fr;
        hands.h.setAttribute("transform", "rotate(" + (((p.h % 12) + (p.mi + sf / 60) / 60) * 30).toFixed(2) + ")");
        hands.m.setAttribute("transform", "rotate(" + ((p.mi + sf / 60) * 6).toFixed(2) + ")");
        hands.s.setAttribute("transform", "rotate(" + (sf * 6).toFixed(2) + ")");
      }
      var isLive = clock.isLive();
      if (tag) tag.hidden = isLive;
      if (live && !isLive) live.textContent = clock.playing ? "Simulated time, " + speedText(clock.speed) : "Simulated time, paused";
    }
    function speedText(s) {
      var a = Math.abs(s), sign = s < 0 ? "backwards " : "";
      if (a === 1) return sign + "real speed";
      if (a < 3600) return sign + "×" + a;
      return sign + "×" + a.toLocaleString("en-US");
    }
    tzBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-zone") === mode));
      b.addEventListener("click", function () {
        setMode(b.getAttribute("data-zone")); store("tc_daily_zone", mode);
        tzBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        Object.keys(slots).forEach(function (k) { slots[k].last = null; });
        render(clock.now());
      });
    });
    var nowBtn = $("[data-cist-now]", root);
    if (nowBtn) nowBtn.addEventListener("click", function () { clock.live(); });
    clock.on(function (ms) { render(ms); });

    /* the converter: any number from 0 to 9999 */
    var form = $("[data-conv]"), inp = form && form.querySelector("input"), out = form && form.querySelector("[data-conv-out]");
    if (form) {
      var run = function () {
        var v = parseInt(inp.value, 10);
        if (!(v >= 0 && v <= 9999)) { out.innerHTML = '<span class="conv-note">Type a whole number from 0 to 9999.</span>'; return; }
        out.innerHTML = C.svg(v, { label: v + " in Cistercian numerals" });
      };
      inp.addEventListener("input", run); form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
      inp.value = String(new Date().getUTCFullYear()); run();
    }
    var key = $("[data-key]"); if (key) key.innerHTML = C.key();
  }

  /* ================================================================ 3. the celestial clock (lazy) ====== */
  function mountCosmos() {
    var sec = $("[data-cosmos]");
    if (!sec || sec.hasAttribute("data-soon")) return;
    var started = false;
    function go() {
      if (started) return; started = true;
      var seq = [];
      if (!window.Astronomy) seq.push("vendor/astronomy.browser.min.js");
      if (!window.TCAstro) seq.push("js/astro.js");
      if (!window.TC_CHIRON) seq.push("js/chiron.js");
      if (!window.TCEphem) seq.push("js/ephem.js");
      if (!window.TC_GLYPHS) seq.push("js/glyphs.js");
      if (!window.TCWheel) seq.push("js/chartwheel.js");
      if (!window.TC_TZPLACE) seq.push("data/tzplace.js");
      if (!window.TC_LAND) seq.push("data/land.js");
      if (!window.TCAstrolabe) seq.push("js/astrolabe.js");
      seq.reduce(function (p, s) { return p.then(function () { return loadScript(s); }); }, Promise.resolve())
        .then(function () { window.TCAstrolabe.mount($("[data-astro]", sec), clock); })
        .catch(function (e) {
          started = false;
          var m = $("[data-astro]", sec); if (m) m.innerHTML = '<p class="notice">The celestial clock could not load. Reload the page to try again.</p>';
          if (window.console) console.error(e);
        });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); go(); } }); }, { rootMargin: "700px 0px" });
      io.observe(sec);
    } else go();
  }

  window.TCDaily = { clock: clock, chapterOfDay: chapterOfDay, roman: roman };
  mountScroll();
  mountCistercian();
  mountCosmos();
})();
