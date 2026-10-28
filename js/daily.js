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

    /* ---- save the chapter that is shown: as a picture (PNG, drawn on a canvas, no network) or as plain text ---- */
    function saveFile(blob, name) {
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }
    function chName(ext) { return "tao-te-ching-" + two(shown) + "-" + ver + "." + ext; }
    function chapterNow() { return (DATA[ver] || [])[shown - 1]; }
    function saveText() {
      var ch = chapterNow(); if (!ch) return;
      var out = "Tao Te Ching, chapter " + shown + " of 81 (" + roman(shown) + ")\n" + (shown === todayCh ? dateLine() + "\n" : "") + "\n";
      ch.b.forEach(function (b) { out += (b[0] === "p" ? b[1] : b[1].join("\n")) + "\n\n"; });
      out += CREDIT[ver] + "\nTwelveCubed, the RoTao page.\n";
      saveFile(new Blob([out], { type: "text/plain;charset=utf-8" }), chName("txt"));
    }
    function savePicture(btn) {
      var ch = chapterNow(); if (!ch) return;
      var DISP = "'IM Fell English', 'Iowan Old Style', Palatino, Georgia, serif", TEXT = "'Literata', Georgia, 'Times New Roman', serif";
      var INK = "#2a2017", SEAL = "#9c2f1f", DIM = "rgba(42,32,23,0.68)";
      var W = 1200, M = 124, TW = W - 2 * M, S = 1.5, LH = 62, GAP = 30;
      var wait = document.fonts && document.fonts.load ? Promise.all(["400 36px Literata", "italic 400 36px Literata", "400 120px 'IM Fell English'", "italic 400 38px 'IM Fell English'"].map(function (f) { return document.fonts.load(f); })).catch(function () { return 0; }) : Promise.resolve(0);
      btn.disabled = true;
      return wait.then(function () {
        var mc = document.createElement("canvas").getContext("2d");
        function wrap(text, font, maxW, firstIndent, restIndent) {
          mc.font = font;
          var words = String(text).split(/\s+/), out = [], cur = "", first = true;
          words.forEach(function (w) {
            var t = cur ? cur + " " + w : w, lim = maxW - (first ? firstIndent : restIndent);
            if (cur && mc.measureText(t).width > lim) { out.push({ s: cur, ind: first ? firstIndent : restIndent }); first = false; cur = w; } else cur = t;
          });
          if (cur) out.push({ s: cur, ind: first ? firstIndent : restIndent });
          return out;
        }
        var F_BODY = "400 36px " + TEXT, F_VERSE = "italic 400 39px " + DISP;
        var rows = [];                                    // {s, x, font, gapAfter, bar}
        ch.b.forEach(function (b) {
          var lines = b[0] === "p" ? [b[1]] : b[1], verse = b[0] === "v", startRow = rows.length;
          lines.forEach(function (ln) {
            wrap(ln, verse ? F_VERSE : F_BODY, TW - (verse ? 44 : 0), 0, b[0] === "s" ? 50 : 0).forEach(function (w) {
              rows.push({ s: w.s, x: M + (verse ? 44 : 0) + w.ind, font: verse ? F_VERSE : F_BODY, lh: verse ? 58 : LH, bar: verse });
            });
          });
          if (rows.length > startRow) rows[rows.length - 1].gap = GAP;
        });
        var top = 560, bodyH = rows.reduce(function (n, r) { return n + r.lh + (r.gap || 0); }, 0), H = Math.max(1500, top + bodyH + 250);
        var cv = document.createElement("canvas"); cv.width = W * S; cv.height = H * S;
        var c = cv.getContext("2d"); c.scale(S, S);
        var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f2e9cf"); g.addColorStop(0.55, "#e9dcb8"); g.addColorStop(1, "#dccb9f");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        var rg = c.createRadialGradient(W / 2, 0, 20, W / 2, 0, H * 0.7); rg.addColorStop(0, "rgba(255,250,232,0.85)"); rg.addColorStop(1, "rgba(255,250,232,0)");
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
        c.strokeStyle = "rgba(120,85,30,0.55)"; c.lineWidth = 3; c.strokeRect(40, 40, W - 80, H - 80);
        c.strokeStyle = "rgba(120,85,30,0.3)"; c.lineWidth = 1.5; c.strokeRect(52, 52, W - 104, H - 104);
        // the yin-yang
        var cx = W / 2, cy = 150, r = 48;
        c.fillStyle = "#f6edd2"; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false); c.arc(cx, cy + r / 2, r / 2, Math.PI / 2, Math.PI * 1.5, false); c.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.fill();
        c.beginPath(); c.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#f6edd2"; c.beginPath(); c.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2); c.fill();
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
        c.textAlign = "center";
        c.fillStyle = DIM; c.font = "400 25px " + TEXT; if ("letterSpacing" in c) c.letterSpacing = "7px";
        c.fillText(("Tao Te Ching · Chapter " + shown + " of 81").toUpperCase(), W / 2 + 3, 266);
        if ("letterSpacing" in c) c.letterSpacing = "0px";
        c.fillStyle = SEAL; c.font = "400 150px " + DISP; c.fillText(roman(shown), W / 2, 420);
        if (shown === todayCh) { c.fillStyle = DIM; c.font = "italic 400 31px " + DISP; c.fillText(dateLine(), W / 2, 478); }
        c.strokeStyle = "rgba(42,32,23,0.22)"; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 90, 520); c.lineTo(W / 2 + 90, 520); c.stroke();
        c.textAlign = "left"; var y = top + 40, barFrom = null;
        rows.forEach(function (rw, i) {
          c.font = rw.font; c.fillStyle = INK; c.fillText(rw.s, rw.x, y);
          if (rw.bar && barFrom === null) barFrom = y - rw.lh * 0.7;
          var last = !rows[i + 1] || !rows[i + 1].bar || rw.gap;
          if (rw.bar && last) { c.fillStyle = "rgba(156,47,31,0.4)"; c.fillRect(M + 8, barFrom, 3, y + 14 - barFrom); barFrom = null; }
          y += rw.lh + (rw.gap || 0);
        });
        c.textAlign = "center"; c.strokeStyle = "rgba(42,32,23,0.2)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(M + 80, H - 190); c.lineTo(W - M - 80, H - 190); c.stroke();
        c.fillStyle = DIM; c.font = "400 25px " + TEXT; c.fillText(CREDIT[ver], W / 2, H - 140);
        c.font = "italic 400 28px " + DISP; c.fillText("TwelveCubed · RoTao", W / 2, H - 98);
        return new Promise(function (res) { cv.toBlob(res, "image/png"); });
      }).then(function (blob) { btn.disabled = false; if (blob) saveFile(blob, chName("png")); }, function () { btn.disabled = false; });
    }
    $$("[data-dl]").forEach(function (b) {
      b.addEventListener("click", function (ev) { if (ev.shiftKey) saveText(); else savePicture(b); });
    });

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
  /* the sky libraries (astronomy-engine, our chart maths, glyphs) are shared by the celestial clock and the Moon calendar; loaded once, in order */
  var libsPromise = null;
  function loadLibs() {
    if (libsPromise) return libsPromise;
    var seq = [];
    if (!window.Astronomy) seq.push("vendor/astronomy.browser.min.js");
    if (!window.TCAstro) seq.push("js/astro.js");
    if (!window.TC_CHIRON) seq.push("js/chiron.js");
    if (!window.TCEphem) seq.push("js/ephem.js");
    if (!window.TC_GLYPHS) seq.push("js/glyphs.js");
    if (!window.TCWheel) seq.push("js/chartwheel.js");
    if (!window.TC_TZPLACE) seq.push("data/tzplace.js");
    libsPromise = seq.reduce(function (p, s) { return p.then(function () { return loadScript(s); }); }, Promise.resolve());
    libsPromise.catch(function () { libsPromise = null; });
    return libsPromise;
  }

  function mountCosmos() {
    var sec = $("[data-cosmos]");
    if (!sec || sec.hasAttribute("data-soon")) return;
    var started = false;
    function go() {
      if (started) return; started = true;
      loadLibs()
        .then(function () { return window.TC_LAND ? null : loadScript("data/land.js"); })
        .then(function () { return window.TCAstrolabe ? null : loadScript("js/astrolabe.js"); })
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

  /* ================================================================ 4. the Moon calendar (lazy) ======= */
  function mountMoonCal() {
    var sec = $("[data-mooncal]");
    if (!sec) return;
    var started = false;
    function go() {
      if (started) return; started = true;
      loadLibs()
        .then(function () { return window.TCMoonCal ? null : loadScript("js/mooncal.js"); })
        .then(function () { window.TCMoonCal.mount($("[data-mc]", sec)); })
        .catch(function (e) {
          started = false;
          var m = $("[data-mc]", sec); if (m) m.innerHTML = '<p class="notice">The Moon calendar could not load. Reload the page to try again.</p>';
          if (window.console) console.error(e);
        });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); go(); } }); }, { rootMargin: "700px 0px" });
      io.observe(sec);
    } else go();
  }

  /* ================================================================ 5. the motto card as a picture ======= */
  /* The card under "the manifesto" (the motto, the name and the six tongues) drawn on a canvas and saved as a large PNG, always in the
     dark blue and orange of the site whatever theme is on. The words are read from the card itself, so manifesto.json stays the one source.
     The globe and the sun halo come from data/art.js (data addresses, so the canvas can be exported from file:// pages too). Nothing is sent anywhere. */
  function mountManifesto() {
    var sec = $(".manifesto"), btn = $("[data-mf-save]");
    if (!sec || !btn) return;
    var label = $("span", btn), idle = label ? label.textContent : "", busy = false;
    var DISP = "'IM Fell English', 'Iowan Old Style', Palatino, Georgia, serif", TEXT = "'Literata', Georgia, 'Times New Roman', serif";
    var ORANGE = "#ffa31a", GROUND = "#08104a", PAPER = "#eaf1ee", DIM = "#c4d3da";
    var FONT = {
      la: TEXT, he: "'Noto Serif Hebrew', 'SBL Hebrew', serif", syr: "'TC Syriac', 'Noto Sans Syriac', 'Estrangelo Edessa', serif",
      ar: "'TC Arabic', 'Noto Naskh Arabic', 'Amiri', serif", el: "'TC Greek', 'Literata', Georgia, serif",
      ja: "'TC Japanese', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
    };
    var SIZE = { la: 47, he: 56, syr: 48, ar: 58, el: 46, ja: 45 }, LHM = { la: 1.45, he: 1.42, syr: 1.55, ar: 1.5, el: 1.45, ja: 1.5 };

    function readCard() {
      return {
        lines: $$(".mf-main > span", sec).map(function (sp) {
          return Array.prototype.map.call(sp.childNodes, function (n) { return { t: n.textContent, em: n.nodeType === 1 }; });
        }),
        name: $(".mf-name", sec).textContent, title: $(".mf-title", sec).textContent,
        tongues: $$(".mf-t", sec).map(function (t) {
          var s = $(".mf-script", t), tr = $(".mf-tr", t);
          return { name: $(".mf-lang", t).textContent, text: s.textContent, lang: s.getAttribute("lang") || "la", rtl: s.getAttribute("dir") === "rtl", tr: tr ? tr.textContent : "" };
        })
      };
    }
    function loadImage(src) {
      return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
    }
    function prepare(card) {
      var fonts = ["italic 400 100px 'IM Fell English'", "400 100px 'IM Fell English'", "400 40px Literata", "italic 400 28px Literata", "600 20px Literata"]
        .map(function (f) { return document.fonts.load(f, "That we are, for all things serve. Johan D. halevikohen Mysticus Vagus"); });
      card.tongues.forEach(function (t) {
        fonts.push(document.fonts.load("400 48px " + FONT[t.lang], t.text));
        if (t.tr) fonts.push(document.fonts.load("italic 400 28px Literata", t.tr));
      });
      var fontsReady = document.fonts && document.fonts.load ? Promise.all(fonts).catch(function () { return 0; }) : Promise.resolve(0);
      return Promise.all([fontsReady, loadArt()]).then(function () {
        return Promise.all([loadImage(window.TC_ART.globe), loadImage(window.TC_ART.sun)]);
      }).then(function (im) {
        if (!im[0] || !im[1]) throw new Error("The pictures for the card could not be decoded.");      // never save a card without its globe and sun
        return im;
      });
    }
    /* data/art.js holds the globe and the sun halo. An older copy of that file (from an earlier version of the site, kept by the browser or by the
       offline copy) lacks them: then it is fetched again once, a moment later, because the offline worker refreshes it in the background. */
    function loadArt() {
      var ok = function () { return window.TC_ART && window.TC_ART.globe && window.TC_ART.sun; };
      function pull(first) {
        if (ok()) return Promise.resolve();
        return loadScript(first ? "data/art.js" : "data/art.js?r=" + Date.now()).then(function () {
          if (ok()) return;
          if (!first) throw new Error("The pictures file is out of date. Reload the page and try again.");
          return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return pull(false); });
        });
      }
      return pull(true);
    }

    function draw(card, globe, sun, cap) {
      var W = 1400, PAD = 96, COLW = 600, mc = document.createElement("canvas").getContext("2d");
      function wrap(text, font, maxW, joiner) {
        mc.font = font;
        var toks = String(text).replace(/([、，])/g, "$1 ").split(/\s+/).filter(Boolean), out = [], cur = "";
        toks.forEach(function (w) {
          var t = cur ? cur + joiner + w : w;
          if (cur && mc.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
        });
        if (cur) out.push(cur);
        var fin = [];
        out.forEach(function (ln) {        // a line still too wide (a long unbroken run) is cut by letters
          if (mc.measureText(ln).width <= maxW) { fin.push(ln); return; }
          var part = "";
          Array.prototype.forEach.call(ln, function (ch) { if (part && mc.measureText(part + ch).width > maxW) { fin.push(part); part = ch; } else part += ch; });
          if (part) fin.push(part);
        });
        return fin;
      }
      // ---- layout
      var GW = 380, GH = 475, GY = 150, GX = (W - GW) / 2;
      var mainSize = 116, mainLines = card.lines;
      function mainWidth(ln, size) {
        return ln.reduce(function (n, s) { mc.font = (s.em ? "400 " : "italic 400 ") + size + "px " + DISP; return n + mc.measureText(s.t).width; }, 0);
      }
      while (mainSize > 60 && Math.max.apply(null, mainLines.map(function (l) { return mainWidth(l, mainSize); })) > W - 2 * PAD - 40) mainSize -= 4;
      var yMain = GY + GH + 40 + mainSize * 0.95, mainLH = mainSize * 1.14;
      var yName = yMain + mainLH * (mainLines.length - 1) + 118, yTitle = yName + 56, yOrn = yTitle + 56, yTong = yOrn + 70;
      var blocks = card.tongues.map(function (t) {
        var f = "400 " + SIZE[t.lang] + "px " + FONT[t.lang], lh = SIZE[t.lang] * LHM[t.lang];
        var sl = wrap(t.text, f, COLW - 20, t.lang === "ja" ? "" : " "), tl = t.tr ? wrap(t.tr, "italic 400 29px " + TEXT, COLW - 20, " ") : [];
        return { t: t, f: f, lh: lh, sl: sl, tl: tl, h: 34 + 12 + sl.length * lh + (tl.length ? 10 + tl.length * 40 : 0) };
      });
      var colX = [PAD + COLW / 2, W - PAD - COLW / 2], lastBottom = [yTong, yTong], prevY = yTong, prevH = 0, bottom = yTong;
      blocks.forEach(function (b, i) {
        var col = i % 2, y = i === 0 ? yTong : Math.max(prevY + prevH * 0.56 + 18, lastBottom[col] + 30);
        b.x = colX[col]; b.y = y; lastBottom[col] = y + b.h; prevY = y; prevH = b.h; bottom = Math.max(bottom, y + b.h);
      });
      var yFoot = bottom + 110, H = Math.round(yFoot + 120);
      var S = Math.min(2.5, Math.sqrt(cap / (W * H)));

      // ---- paint
      var cv = document.createElement("canvas"); cv.width = Math.round(W * S); cv.height = Math.round(H * S);
      var c = cv.getContext("2d"); c.scale(S, S);
      function ls(px) { if ("letterSpacing" in c) c.letterSpacing = px + "px"; }
      function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function arch(x, y, w, h, r2) {
        var r = w / 2; c.beginPath(); c.moveTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0);
        c.lineTo(x + w, y + h - r2); c.quadraticCurveTo(x + w, y + h, x + w - r2, y + h); c.lineTo(x + r2, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r2); c.closePath();
      }
      function archOut(e) { arch(GX - e, GY - e, GW + 2 * e, GH + 2 * e, 24 + e); }
      function diamond(x, y, s) {
        c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = ORANGE; c.shadowColor = "rgba(255,170,40,0.8)"; c.shadowBlur = 16; c.fillRect(-s / 2, -s / 2, s, s); c.restore();
      }
      c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
      var FX = 34, FY = 34, FW = W - 68, FH = H - 68;
      rr(FX, FY, FW, FH, 34); c.save(); c.clip();
      var rg = c.createRadialGradient(W / 2, FY, 0, W / 2, FY, W * 0.66); rg.addColorStop(0, "rgba(255,166,38,0.22)"); rg.addColorStop(1, "rgba(255,166,38,0)");
      c.fillStyle = rg; c.fillRect(FX, FY, FW, FH);
      c.fillStyle = "rgba(234,241,238,0.045)"; c.fillRect(FX, FY, FW, FH);
      if (sun) { c.globalAlpha = 0.13; c.drawImage(sun, W / 2 - 480, GY + GH / 2 - 480, 960, 960); c.globalAlpha = 1; }
      c.restore();
      rr(FX, FY, FW, FH, 34); c.strokeStyle = "rgba(255,166,38,0.45)"; c.lineWidth = 2; c.stroke();
      rr(FX + 14, FY + 14, FW - 28, FH - 28, 24); c.strokeStyle = "rgba(255,166,38,0.24)"; c.lineWidth = 1.5; c.stroke();
      diamond(FX + 30, FY + 30, 15); diamond(FX + FW - 30, FY + 30, 15); diamond(FX + 30, FY + FH - 30, 15); diamond(FX + FW - 30, FY + FH - 30, 15);

      // the globe in its arch
      c.save(); c.shadowColor = "rgba(255,166,38,0.28)"; c.shadowBlur = 56; c.shadowOffsetY = 14; archOut(8); c.fillStyle = GROUND; c.fill(); c.restore();
      archOut(7); c.fillStyle = GROUND; c.fill(); archOut(7.5); c.strokeStyle = "rgba(255,166,38,0.38)"; c.lineWidth = 1.5; c.stroke();
      if (globe) {
        c.save(); arch(GX, GY, GW, GH, 24); c.clip();
        var k = Math.max(GW / globe.width, GH / globe.height), dw = globe.width * k, dh = globe.height * k;
        c.drawImage(globe, GX + (GW - dw) / 2, GY + (GH - dh) / 2, dw, dh); c.restore();
      }
      archOut(1); c.strokeStyle = "rgba(255,166,38,0.78)"; c.lineWidth = 2.5; c.stroke();

      // the motto
      c.textBaseline = "alphabetic"; c.textAlign = "left";
      mainLines.forEach(function (ln, i) {
        var x = (W - mainWidth(ln, mainSize)) / 2, y = yMain + i * mainLH;
        ln.forEach(function (s) {
          c.font = (s.em ? "400 " : "italic 400 ") + mainSize + "px " + DISP; c.fillStyle = s.em ? ORANGE : PAPER;
          c.shadowColor = "rgba(255,166,38,0.5)"; c.shadowBlur = 30; c.fillText(s.t, x, y); c.shadowBlur = 0; c.shadowColor = "transparent";
          x += c.measureText(s.t).width;
        });
      });
      c.textAlign = "center";
      c.font = "400 58px " + DISP; c.fillStyle = PAPER; ls(3.5); c.fillText(card.name, W / 2 + 2, yName); ls(0);
      c.font = "italic 400 31px " + TEXT; c.fillStyle = ORANGE; ls(7.5); c.fillText(card.title, W / 2 + 4, yTitle); ls(0);
      // the ornament: two fading lines and a diamond
      var lg = c.createLinearGradient(W / 2 - 250, 0, W / 2 - 22, 0); lg.addColorStop(0, "rgba(255,166,38,0)"); lg.addColorStop(1, "rgba(255,166,38,0.85)");
      c.fillStyle = lg; c.fillRect(W / 2 - 250, yOrn, 228, 1.8);
      var rg2 = c.createLinearGradient(W / 2 + 22, 0, W / 2 + 250, 0); rg2.addColorStop(0, "rgba(255,166,38,0.85)"); rg2.addColorStop(1, "rgba(255,166,38,0)");
      c.fillStyle = rg2; c.fillRect(W / 2 + 22, yOrn, 228, 1.8);
      diamond(W / 2, yOrn + 1, 13);

      // the six tongues, in a zig-zag
      blocks.forEach(function (b) {
        var y = b.y + 22;
        c.direction = "ltr"; c.textAlign = "center"; c.font = "600 21px " + TEXT; c.fillStyle = ORANGE; ls(5.6);
        c.fillText(b.t.name.toUpperCase(), b.x + 3, y); ls(0);
        y += 12; c.fillStyle = PAPER; c.font = b.f; c.direction = b.t.rtl ? "rtl" : "ltr";
        b.sl.forEach(function (ln) { y += b.lh; c.fillText(ln, b.x, y - b.lh * 0.22); });
        c.direction = "ltr";
        if (b.tl.length) {
          y += 10 - 4; c.font = "italic 400 29px " + TEXT; c.fillStyle = DIM;
          b.tl.forEach(function (ln) { y += 40; c.fillText(ln, b.x, y - 10); });
        }
      });
      c.textAlign = "center"; c.direction = "ltr";
      c.strokeStyle = "rgba(255,166,38,0.28)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W / 2 - 160, yFoot - 44); c.lineTo(W / 2 + 160, yFoot - 44); c.stroke();
      c.fillStyle = "rgba(196,211,218,0.85)"; c.font = "italic 400 29px " + DISP; c.fillText("TwelveCubed · RoTao", W / 2, yFoot);
      // a phone that cannot hold a canvas this big sometimes gives back an empty picture without saying so: look at the middle of the globe
      var gx = Math.round(W / 2 * S) - 4, gy = Math.round((GY + GH * 0.55) * S) - 4, drawn = false;
      try {
        var px = c.getImageData(gx, gy, 9, 9).data;
        for (var q = 0; q < px.length; q += 4) if (px[q + 3] > 0 && (Math.abs(px[q] - 8) > 24 || Math.abs(px[q + 1] - 16) > 24 || Math.abs(px[q + 2] - 74) > 24)) { drawn = true; break; }
      } catch (e) { drawn = true; }             // the browser will not let the pixels be read: trust the drawing
      if (!drawn) return Promise.resolve(null);
      return new Promise(function (res) { cv.toBlob(function (b) { res(b && b.size > 150000 ? b : null); }, "image/png"); });
    }
    /* the largest size the device can make: 15 million pixels on a computer, fewer on a phone, and smaller again if the first try fails */
    function make(card, im) {
      var phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
      var caps = phone ? [9e6, 5e6, 2.5e6] : [15e6, 9e6, 4e6], i = 0;
      function next() {
        return draw(card, im[0], im[1], caps[i]).then(function (blob) { if (blob) return blob; return ++i < caps.length ? next() : null; });
      }
      return next();
    }

    function saveBlob(blob) {
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "that-we-are-for-all-things-serve-motto-card.png"; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }
    btn.addEventListener("click", function () {
      if (busy) return; busy = true; btn.disabled = true; if (label) label.textContent = "Drawing the card…";
      var card = readCard(), wait = 900;
      prepare(card).then(function (im) { return make(card, im); })
        .then(function (blob) { if (blob) saveBlob(blob); else { wait = 5000; if (label) label.textContent = "Your browser could not save it"; } })
        .catch(function (e) { wait = 6000; if (label) label.textContent = /pictures/.test(e && e.message || "") ? "Reload the page, then try again" : "Could not draw the card"; if (window.console) console.error(e); })
        .then(function () { setTimeout(function () { busy = false; btn.disabled = false; if (label) label.textContent = idle; }, wait); });
    });
  }

  window.TCDaily = { clock: clock, chapterOfDay: chapterOfDay, roman: roman };
  mountManifesto();
  mountScroll();
  mountCistercian();
  mountCosmos();
  mountMoonCal();
})();
