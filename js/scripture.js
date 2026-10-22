/* RoTao page: the daily Zohar (behind the gate) and the daily Torah.
     Zohar  window.TC_ZOHAR_IDX + TC_ZOHAR_P[n]  (data/zohar/, built by tools/make_zohar.py from the Sefaria files in content/daily/zohar/src/)
     Torah  window.TC_TORAH_IDX + TC_TORAH_P[n]  (data/torah/, public domain: Westminster Leningrad Codex + JPS 1917, by tools/make_torah.py)
   Both show the original Hebrew/Aramaic beside the English, paragraph by paragraph or verse by verse. Everything is loaded from the
   site's own files, lazily; nothing is sent anywhere. The only things stored in the browser are the reader's own choices
   (view, text size, which Zohar list). */
(function () {
  "use strict";

  var ROOT = (document.body && document.body.getAttribute("data-root")) || "";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"];
  var BOOKS_HE = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
  var ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = ROOT + src; s.onload = function () { res(); }; s.onerror = function () { rej(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }
  function onNear(el, fn, margin) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { rootMargin: margin || "600px 0px" });
    io.observe(el);
  }
  function longDate(d) { return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }

  /* the reader's own choices, shared by both readers */
  var prefs = {
    view: store("tc_bi_view") || "both",           // both | he | en
    size: parseInt(store("tc_bi_size"), 10) || 0   // steps of text size: -2..4
  };
  var VIEWS = [["both", "Hebrew and English"], ["he", "Hebrew only"], ["en", "English only"]];
  function applyPrefs(root) {
    root.setAttribute("data-view", prefs.view);
    root.style.setProperty("--bi-size", (1 + 0.1 * prefs.size).toFixed(2));
  }
  function seg(label, name, opts, cur) {
    return '<div class="ap-block"><span class="ap-lab">' + esc(label) + '</span><div class="bi-seg" role="group" aria-label="' + esc(label) + '">' +
      opts.map(function (o) { return '<button type="button" data-' + name + '="' + esc(o[0]) + '" aria-pressed="' + (o[0] === cur ? "true" : "false") + '">' + esc(o[1]) + "</button>"; }).join("") +
      "</div></div>";
  }
  function sizeBlock() {
    return '<div class="ap-block"><span class="ap-lab">Text size</span><div class="ap-row">' +
      '<button type="button" class="ap-btn ap-sq" data-size="-1" aria-label="Smaller text">A−</button>' +
      '<button type="button" class="ap-btn ap-sq" data-size="1" aria-label="Larger text">A+</button></div></div>';
  }
  /* wires the shared view + size buttons inside one reader */
  function wirePrefs(root) {
    applyPrefs(root);
    $$("[data-view-set]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        prefs.view = b.getAttribute("data-view-set"); store("tc_bi_view", prefs.view);
        $$("[data-view-set]", root).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        applyPrefs(root);
      });
    });
    $$("[data-size]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        prefs.size = Math.max(-2, Math.min(5, prefs.size + parseInt(b.getAttribute("data-size"), 10))); store("tc_bi_size", String(prefs.size));
        applyPrefs(root);
      });
    });
  }

  /* English printed with a small-capital opening ("IN THE beginning", "HEAR, O ISRAEL: THE LORD...") */
  function openingCaps(s) {
    var t = s.split(" "), i = 0;
    function cap(w) { var l = w.replace(/[^A-Za-z]/g, ""); return l.length > 0 && l === l.toUpperCase() && (l.length > 1 || (i > 0 && /^[AIO]$/.test(l))); }
    while (i < t.length && cap(t[i])) i++;
    if (i === 0) return esc(s);
    if (i === 1 && /^(LORD|GOD)\b/.test(t[0])) return esc(s);
    var run = t.slice(0, i).join(" "), rest = t.slice(i).join(" ");
    return esc(run.charAt(0)) + '<span class="smc">' + esc(run.slice(1).toLowerCase()) + "</span>" + (rest ? " " + esc(rest) : "");
  }

  /* ---- a verse as a picture -------------------------------------------------------------------------------------------
     Every verse (Torah) and every paragraph (Zohar) has a small save icon. Touching it draws a card on a canvas, Hebrew first and
     the English after it, then the reference and the sources, in the colours of the plate the reader is on (dark or light),
     and saves it as a PNG. The reader chooses the verse by touching the icon next to it. Nothing leaves the browser. */
  var SAVE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DONE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function saveBtn(what) {
    return '<button type="button" class="bi-save" title="Save this ' + what + ' as a picture" aria-label="Save this ' + what + ' as a picture, Hebrew then English">' + SAVE_ICON + "</button>";
  }
  /* the JPS prints the first words of a verse in capitals ("IN THE beginning"): on a card they read as ordinary words */
  function tame(s) {
    var t = s.split(" "), i = 0;
    function allCaps(w) { var l = w.replace(/[^A-Za-z]/g, ""); return l.length > 0 && l === l.toUpperCase() && (l.length > 1 || (i > 0 && /^[AIO]$/.test(l))); }
    while (i < t.length && allCaps(t[i])) i++;
    if (i === 0 || (i === 1 && /^(LORD|GOD)\b/.test(t[0]))) return s;
    for (var k = 0; k < i; k++) {
      var w = t[k], core = w.replace(/[^A-Za-z]/g, "");
      if (/^(LORD|GOD)$/.test(core) && k > 0) continue;
      if (k > 0 && /^(THE|A|AN|OF|IN|AND|TO|FOR|ON|AT|BY|WITH)$/.test(core)) { t[k] = w.toLowerCase(); continue; }
      t[k] = w.charAt(0) + w.slice(1).toLowerCase();
    }
    return t.join(" ");
  }
  /* straight quotes in the JPS text become curly ones on the card */
  function smart(s) { return s.replace(/(^|[\s(\[\u2014])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[\s(\[\u2014])"/g, "$1\u201c").replace(/"/g, "\u201d"); }
  function plain(html) { var d = document.createElement("div"); d.innerHTML = html; $$(".zpg", d).forEach(function (n) { n.parentNode.removeChild(n); }); return d.textContent.replace(/\s+/g, " ").trim(); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

  function wrapLines(ctx, text, font, maxW, rtl) {
    ctx.font = font; ctx.direction = rtl ? "rtl" : "ltr";
    var words = text.split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function clip(lines, n) {
    if (lines.length <= n) return lines;
    var out = lines.slice(0, Math.max(1, n)); out[out.length - 1] += " …"; return out;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

  function drawCard(d, cs) {
    function tok(n, dflt) { var v = cs.getPropertyValue(n); return (v && v.trim()) || dflt; }
    var C = { ground: tok("--ground", "#0b2a47"), deep: tok("--ground-deep", "#061a2e"), paper: tok("--paper", "#eaf1ee"), dim: tok("--paper-dim", "#a9bdc4"),
              faint: tok("--paper-faint", "#7e97a4"), rule: tok("--rule-strong", "rgba(234,241,238,.42)"), rota: tok("--rota", "#ff8d14"), ink: tok("--rota-ink", "#ff8d14") };
    var W = 1080, PAD = 104, TW = W - 2 * PAD, MAXH = 3200;
    var HEF = function (s) { return "400 " + s + 'px "Noto Serif Hebrew", "SBL Hebrew", "Ezra SIL", "Times New Roman", serif'; };
    var ENF = function (s) { return "400 " + s + 'px Literata, Georgia, "Times New Roman", serif'; };
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.width = W; cv.height = 1200; ctx = cv.getContext("2d");           // a first pass on a scratch height, to measure
    var hasEn = !!d.en, top = 250, bottom = 330, gap = hasEn ? 118 : 0;
    var scales = [1, 0.86, 0.74, 0.64, 0.56], pick = null;
    for (var i = 0; i < scales.length; i++) {
      var s = scales[i], hs = (hasEn ? 62 : 74) * s, es = 38 * s, hl = hs * 1.78, el = es * 1.62;
      var hL = wrapLines(ctx, d.he, HEF(hs), TW, true), eL = hasEn ? wrapLines(ctx, d.en, ENF(es), TW, false) : [];
      var h = top + hL.length * hl + gap + eL.length * el + bottom;
      pick = { hs: hs, es: es, hl: hl, el: el, hL: hL, eL: eL, h: h, cut: false };
      if (h <= MAXH) break;
    }
    if (pick.h > MAXH) {                                                  // still too long: an excerpt that ends with an ellipsis
      var room = MAXH - top - gap - bottom, hRoom = hasEn ? room * 0.5 : room;
      pick.hL = clip(pick.hL, Math.floor(hRoom / pick.hl));
      if (hasEn) pick.eL = clip(pick.eL, Math.floor((room - pick.hL.length * pick.hl) / pick.el));
      pick.h = top + pick.hL.length * pick.hl + gap + pick.eL.length * pick.el + bottom; pick.cut = true;
    }
    var H = Math.max(1080, Math.ceil(pick.h));
    cv.width = W; cv.height = H; ctx = cv.getContext("2d");
    ctx.textBaseline = "alphabetic";
    // plate
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.ground); g.addColorStop(1, C.deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var rg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.75); rg.addColorStop(0, "rgba(255,141,20,0.22)"); rg.addColorStop(1, "rgba(255,141,20,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 2; roundRect(ctx, 34, 34, W - 68, H - 68, 30); ctx.stroke();
    // the short orange bar and the kicker
    ctx.save(); ctx.shadowColor = "rgba(255,141,20,0.7)"; ctx.shadowBlur = 22; ctx.fillStyle = C.rota; roundRect(ctx, W / 2 - 60, 112, 120, 5, 2.5); ctx.fill(); ctx.restore();
    ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.fillStyle = C.ink; ctx.font = "600 25px Literata, Georgia, serif"; spaced(ctx, 8);
    ctx.fillText(d.kicker.toUpperCase(), W / 2 + 4, 168); spaced(ctx, 0);
    // the Hebrew, then the English
    var y = top + pick.hl * 0.72;
    ctx.fillStyle = C.paper; ctx.direction = "rtl"; ctx.font = HEF(pick.hs);
    pick.hL.forEach(function (ln) { ctx.fillText(ln, W / 2, y); y += pick.hl; });
    if (hasEn) {
      y += gap / 2 - pick.hl * 0.72 + 6;
      ctx.strokeStyle = C.rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 150, y); ctx.lineTo(W / 2 - 22, y); ctx.moveTo(W / 2 + 22, y); ctx.lineTo(W / 2 + 150, y); ctx.stroke();
      ctx.fillStyle = C.rota; ctx.beginPath(); ctx.moveTo(W / 2, y - 9); ctx.lineTo(W / 2 + 9, y); ctx.lineTo(W / 2, y + 9); ctx.lineTo(W / 2 - 9, y); ctx.closePath(); ctx.fill();
      y += gap / 2 + pick.el * 0.55;
      ctx.fillStyle = C.paper; ctx.direction = "ltr"; ctx.font = ENF(pick.es);
      pick.eL.forEach(function (ln) { ctx.fillText(ln, W / 2, y); y += pick.el; });
    }
    // the reference, the sources and the name
    y = H - bottom + 96;
    ctx.direction = "ltr"; ctx.fillStyle = C.ink; ctx.font = "600 29px Literata, Georgia, serif"; spaced(ctx, 4);
    wrapLines(ctx, d.ref + (pick.cut ? " (excerpt)" : ""), ctx.font, TW, false).forEach(function (ln) { ctx.fillText(ln, W / 2 + 2, y); y += 42; });
    spaced(ctx, 0); y += 6;
    ctx.fillStyle = C.faint; ctx.font = "400 21px Literata, Georgia, serif";
    wrapLines(ctx, d.credit, ctx.font, TW, false).forEach(function (ln) { ctx.fillText(ln, W / 2, y); y += 31; });
    ctx.fillStyle = C.paper; ctx.font = '400 38px "IM Fell English", Georgia, serif'; ctx.fillText("TwelveCubed", W / 2, H - 76);
    return cv;
  }

  function saveCard(d, btn) {
    if (btn.classList.contains("is-busy")) return;
    btn.classList.add("is-busy");
    var cs = getComputedStyle(btn);
    var fonts = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('400 62px "Noto Serif Hebrew"', d.he.slice(0, 40) || "א"), document.fonts.load("400 38px Literata", "A"), document.fonts.load('400 38px "IM Fell English"', "T")
    ]).catch(function () { /* draw with what is there */ }) : Promise.resolve();
    fonts.then(function () {
      var cv = drawCard(d, cs);
      function done(blob) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = d.file + ".png"; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 5000);
        btn.classList.remove("is-busy"); btn.classList.add("is-done"); btn.innerHTML = DONE_ICON;
        setTimeout(function () { btn.classList.remove("is-done"); btn.innerHTML = SAVE_ICON; }, 1800);
      }
      if (cv.toBlob) cv.toBlob(function (b) { if (b) done(b); else btn.classList.remove("is-busy"); }, "image/png");
      else { var u = cv.toDataURL("image/png").split(",")[1], bin = atob(u), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); done(new Blob([arr], { type: "image/png" })); }
    }).catch(function (e) { btn.classList.remove("is-busy"); if (window.console) console.error(e); });
  }
  function wireSave(root, get) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".bi-save") : null;
      if (!b || !root.contains(b)) return;
      var row = b.closest(".bi-row"), d = row && get(parseInt(row.getAttribute("data-ci"), 10));
      if (d) saveCard(d, b);
    });
  }

  /* a door: a picture that is a button. The first touch opens the panel under it (and runs onFirst once), the next closes it. */
  function mountGate(sec, onFirst) {
    var gate = $("[data-gate]", sec), panel = $("[data-zpanel]", sec), hint = $("[data-gate-hint]", sec);
    if (!gate || !panel) return null;
    var openT = gate.getAttribute("data-open-text") || "", closeT = gate.getAttribute("data-close-text") || "";
    var api = { opened: false, first: true, panel: panel, again: function () { api.first = true; } };
    gate.addEventListener("click", function () {
      api.opened = !api.opened;
      gate.setAttribute("aria-expanded", String(api.opened));
      sec.classList.toggle("is-open", api.opened);
      panel.hidden = !api.opened;
      if (hint) hint.textContent = api.opened ? closeT : openT;
      if (api.opened && api.first) { api.first = false; onFirst(); }
      if (api.opened && !reduce) { try { panel.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { /* old browsers */ } }
    });
    return api;
  }

  /* ================================================================ the Torah ======================== */
  function mountTorah(sec) {
    var app = $("[data-tor-app]", sec);
    if (!app) return;
    var door = mountGate(sec, function () { go(); });
    if (!door) return;
    function go() {
      app.innerHTML = '<p class="bi-wait">Opening\u2026</p>';
      var f = window.TC_TORAH_IDX ? Promise.resolve() : loadScript("data/torah/index.js");
      f.then(function () { build(); }).catch(function (e) {
        door.again(); app.innerHTML = '<p class="notice">The Torah reading could not load. Close the tree and touch it again.</p>'; if (window.console) console.error(e);
      });
    }

    var IDX, israel, today, state;
    function utcDay(d) { return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }

    /* the portion for a date: Sunday to Friday study the coming Shabbat's portion; Shabbat reads it */
    function portionFor(d) {
      var T = IDX.table, start = Date.parse(T.start + "T00:00:00Z"), dow = d.getDay();
      var w = Math.round((utcDay(d) + (6 - dow) * 86400000 - start) / 604800000);
      if (w < 0 || w >= T.d.length) return null;
      var festival = false;
      function code(i) { return israel && T.i[i] !== undefined ? T.i[i] : T.d[i]; }
      var c = code(w);
      while (c === -1 && w + 1 < T.d.length) { w++; c = code(w); festival = true; }
      if (c === -1) return null;
      var key = c >= 100 ? (c - 100 + 1) + "+" + (c - 100 + 2) : String(c + 1);
      return { key: key, festival: festival };
    }
    function nameOf(key) {
      var A = IDX.aliyot[key], parts = key.split("+").map(function (n) { return IDX.names[parseInt(n, 10) - 1]; });
      return { en: A.en.replace("-", "–"), he: parts.map(function (p) { return p.he; }).join("־"), parts: parts };
    }
    function loadParts(key) {
      return Promise.all(key.split("+").map(function (n) {
        var k = parseInt(n, 10);
        if (window.TC_TORAH_P && window.TC_TORAH_P[k]) return Promise.resolve();
        return loadScript("data/torah/p" + (k < 10 ? "0" : "") + k + ".js");
      })).then(function () {
        var rows = [];
        key.split("+").forEach(function (n) { rows = rows.concat(window.TC_TORAH_P[parseInt(n, 10)].v); });
        return rows;
      });
    }
    function cmp(c, v, rc, rv) { return c !== rc ? c - rc : v - rv; }
    function slice(rows, r) { return rows.filter(function (x) { return cmp(x[0], x[1], r[0], r[1]) >= 0 && cmp(x[0], x[1], r[2], r[3]) <= 0; }); }
    function refText(book, r) { return BOOKS[book - 1] + " " + (r[0] === r[2] ? r[0] + ":" + r[1] + "–" + r[3] : r[0] + ":" + r[1] + "–" + r[2] + ":" + r[3]); }

    var cards = [];
    function verseRows(rows, book) {
      var out = "", lastC = 0;
      rows.forEach(function (x) {
        if (x[0] !== lastC) { out += '<h4 class="bi-chap"><span>' + esc(BOOKS[book - 1]) + " " + x[0] + '</span><span class="bi-chap-he" lang="he" dir="rtl">' + esc(BOOKS_HE[book - 1]) + "</span></h4>"; lastC = x[0]; }
        var en = x[3] ? '<p class="bi-en" lang="en">' + openingCaps(x[3]) + "</p>" : '<p class="bi-en bi-miss" lang="en">The English verse is not in our text source (JPS 1917).</p>';
        var ref = BOOKS[book - 1] + " " + x[0] + ":" + x[1];
        cards.push({ he: x[2], en: x[3] ? smart(tame(x[3])) : "", ref: ref, kicker: "The Torah", file: "twelvecubed-" + slug(ref),
                     credit: "Hebrew: Westminster Leningrad Codex. English: Jewish Publication Society, 1917." });
        out += '<div class="bi-row" data-ci="' + (cards.length - 1) + '"><span class="bi-num"><span class="bi-n">' + x[1] + "</span>" + saveBtn("verse") + "</span>" + en +
          '<p class="bi-he" lang="he" dir="rtl">' + esc(x[2]) + (x[4] ? ' <span class="bi-mark" title="' + (x[4] === "פ" ? "open paragraph (petuchah)" : "closed paragraph (setumah)") + '">{' + x[4] + "}</span>" : "") + "</p></div>";
      });
      return out;
    }

    function build() {
      IDX = window.TC_TORAH_IDX;
      israel = false;                       // the calendar outside Israel (the Israel variant was taken out of the page)
      today = new Date();
      state = { key: null, day: today.getDay(), browse: false };
      var opts = IDX.names.map(function (p) { return '<option value="' + p.n + '">' + esc(p.en.replace("-", "–")) + "  " + esc(p.he) + "</option>"; }).join("");
      app.innerHTML =
        '<div class="astro-panel bi-panel" data-bi>' +
        '<div class="bi-head"><p class="bi-kicker" data-t-kick></p><h3 class="bi-title" data-t-title></h3><p class="bi-sub" data-t-sub></p><p class="bi-note" data-t-note hidden></p></div>' +
        '<div class="ap-block"><span class="ap-lab">Day of the week</span><div class="bi-seg bi-days" role="group" aria-label="Reading of the day">' +
        DAYS.map(function (d, i) { return '<button type="button" data-day="' + i + '">' + d.slice(0, 3) + "</button>"; }).join("") + '<button type="button" data-day="whole">Whole portion</button></div></div>' +
        '<div class="bi-ctl">' +
        '<label class="ap-block"><span class="ap-lab">Choose a portion</span><select class="ap-sel" data-t-pick aria-label="Choose a Torah portion">' + opts + "</select></label>" +
        '<div class="ap-block"><span class="ap-lab">This week</span><button type="button" class="ap-btn ap-main" data-t-now>Back to this week</button></div>' +
        seg("Show", "view-set", VIEWS, prefs.view) + sizeBlock() +
        "</div>" +
        '<div class="bi-text" data-t-text aria-live="polite"></div></div>';
      var root = $("[data-bi]", app);
      wirePrefs(root);
      wireSave(root, function (i) { return cards[i]; });
      $$("[data-day]", root).forEach(function (b) {
        b.addEventListener("click", function () { var v = b.getAttribute("data-day"); state.day = v === "whole" ? "whole" : parseInt(v, 10); show(); });
      });
      $("[data-t-pick]", root).addEventListener("change", function (e) { state.key = e.target.value; state.browse = true; show(); });
      $("[data-t-now]", root).addEventListener("click", function () { state.browse = false; state.day = new Date().getDay(); show(); });
      show();
    }

    function show() {
      var root = $("[data-bi]", app), text = $("[data-t-text]", root);
      today = new Date();
      var p = portionFor(today);
      if (!state.browse) state.key = p ? p.key : "1";
      var key = state.key, A = IDX.aliyot[key], nm = nameOf(key);
      var single = key.indexOf("+") < 0;
      $("[data-t-pick]", root).value = single ? key : key.split("+")[0];
      $$("[data-day]", root).forEach(function (b) {
        var v = b.getAttribute("data-day"); b.setAttribute("aria-pressed", String(v === String(state.day)));
        if (v !== "whole" && !state.browse && parseInt(v, 10) === today.getDay()) b.setAttribute("data-today", "1"); else b.removeAttribute("data-today");
      });
      var whole = state.day === "whole";
      var n = whole ? 0 : state.day + 1;                      // Sunday = 1st reading ... Friday = 6th, Shabbat = 7th (with the maftir)
      var range = whole ? [A.a["1"][0], A.a["1"][1], A.a["7"][2], A.a["7"][3]] : A.a[String(n)];
      var d0 = nm.parts.length > 1 ? nm.parts[0].en + " and " + nm.parts[1].en : nm.en;
      $("[data-t-kick]", root).textContent = state.browse ? "Torah portion" : "Torah portion of the week";
      $("[data-t-title]", root).innerHTML = esc(nm.en) + ' <span class="bi-he-title" lang="he" dir="rtl">' + esc(nm.he) + "</span>";
      $("[data-t-sub]", root).textContent = refText(A.b, [A.a["1"][0], A.a["1"][1], A.a["7"][2], A.a["7"][3]]) + (whole ? "" : "  ·  " + (state.day === 6 ? "Shabbat: 7th reading and maftir" : DAYS[state.day] + ": " + ORD[n] + " reading") + ", " + refText(A.b, range).replace(BOOKS[A.b - 1] + " ", ""));
      var note = $("[data-t-note]", root);
      if (!state.browse && p && p.festival) { note.hidden = false; note.textContent = "This week's Shabbat is a festival, so no regular portion is read on it. This is the next portion, to read ahead."; }
      else if (!state.browse && !p) { note.hidden = false; note.textContent = "The schedule runs to the year 2100. Choose a portion below."; }
      else note.hidden = true;
      text.innerHTML = '<p class="bi-wait">Loading…</p>';
      var mine = ++show.n;
      loadParts(key).then(function (rows) {
        if (mine !== show.n) return;
        cards = [];
        var html = verseRows(slice(rows, range), A.b);
        if (!whole && state.day === 6 && A.a.M) html += '<h4 class="bi-chap bi-maftir"><span>Maftir: ' + esc(refText(A.b, A.a.M)) + " (the closing verses are read again)</span></h4>" + verseRows(slice(rows, A.a.M), A.b);
        text.innerHTML = html;
      }).catch(function (e) { text.innerHTML = '<p class="notice">This portion could not load.</p>'; if (window.console) console.error(e); });
    }
    show.n = 0;
  }

  /* ================================================================ the Zohar, behind the gate ======== */
  function mountZohar(sec) {
    var door = mountGate(sec, function () { start(); });
    if (!door) return;
    var panel = door.panel;
    var IDX, mode, list, pos, cur, token = 0, cards = [];
    function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86400000); }

    function start() {
      panel.innerHTML = '<p class="bi-wait">Opening…</p>';
      loadScript("data/zohar/index.js").then(function () { IDX = window.TC_ZOHAR_IDX; build(); }).catch(function () {
        door.again();
        panel.innerHTML = '<div class="bi-missing"><p><strong>The Zohar texts are not part of this copy of the site.</strong></p>' +
          '<p>The folder <code>data/zohar/</code> did not load. If you are opening a copy of the site, keep that folder beside the other pages. ' +
          'To rebuild it from the source files: run <code>python3 tools/make_zohar.py</code> in the project.</p></div>';
      });
    }

    function buildList() {
      list = [];
      IDX.parts.forEach(function (p) { for (var s = 0; s < p.n; s++) { if (mode === "all" || p.cov.charAt(s) === "2") list.push([p.i, s]); } });
    }
    function posOf(p, s) {
      for (var i = 0; i < list.length; i++) { if (list[i][0] > p || (list[i][0] === p && list[i][1] >= s)) return i; }
      return list.length - 1;
    }
    function build() {
      mode = store("tc_zo_mode") === "all" ? "all" : "tr";
      var total = 0, tr = 0;
      IDX.parts.forEach(function (p) { total += p.n; tr += (p.cov.match(/2/g) || []).length; });
      panel.innerHTML =
        '<div class="astro-panel bi-panel" data-bi>' +
        '<div class="bi-head"><p class="bi-kicker" data-z-kick></p><h3 class="bi-title" data-z-title></h3><p class="bi-sub" data-z-sub></p></div>' +
        '<div class="bi-ctl">' +
        seg("Which passages", "zmode", [["tr", "With English (" + tr + ")"], ["all", "The whole Zohar (" + total + ")"]], mode) +
        seg("Show", "view-set", VIEWS, prefs.view) + sizeBlock() +
        "</div>" +
        '<div class="bi-ctl">' +
        '<div class="ap-block"><span class="ap-lab">Move</span><div class="ap-row"><button type="button" class="ap-btn" data-z-prev aria-label="Previous passage">‹ Previous</button><button type="button" class="ap-btn ap-main" data-z-today>Today</button><button type="button" class="ap-btn" data-z-next aria-label="Next passage">Next ›</button></div></div>' +
        '<label class="ap-block"><span class="ap-lab">Part of the Zohar</span><select class="ap-sel" data-z-part aria-label="Part of the Zohar"></select></label>' +
        '<label class="ap-block"><span class="ap-lab">Passage</span><select class="ap-sel" data-z-sec aria-label="Passage"></select></label>' +
        "</div>" +
        '<div class="bi-text" data-z-text aria-live="polite"></div>' +
        '<p class="bi-credit" data-z-credit></p></div>';
      var root = $("[data-bi]", panel);
      wirePrefs(root);
      wireSave(root, function (i) { return cards[i]; });
      $$("[data-zmode]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          mode = b.getAttribute("data-zmode"); store("tc_zo_mode", mode);
          $$("[data-zmode]", root).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          buildList(); fillParts(); goToday();
        });
      });
      $("[data-z-today]", root).addEventListener("click", goToday);
      $("[data-z-prev]", root).addEventListener("click", function () { step(-1); });
      $("[data-z-next]", root).addEventListener("click", function () { step(1); });
      $("[data-z-part]", root).addEventListener("change", function (e) {
        var p = parseInt(e.target.value, 10), i = posOf(p, 0);
        if (list[i][0] !== p) { /* nothing from this part in the list */ }
        showAt(list[i][0] === p ? i : posOf(p, 0));
      });
      $("[data-z-sec]", root).addEventListener("change", function (e) { var v = e.target.value.split(":"); showAt(posOf(parseInt(v[0], 10), parseInt(v[1], 10))); });
      var cr = IDX.credit || {}, enList = cr.en || [];
      var enTxt = enList.length === 1
        ? "English: <em>" + esc(enList[0]) + "</em>" + (cr.en_license ? " (" + esc(String(cr.en_license).toLowerCase()) + ", as marked on Sefaria)" : "") + ". "
        : "English: from Sefaria, paragraph by paragraph the best available of " + esc(enList.join("; ")) + ". ";
      $("[data-z-credit]", root).innerHTML = "Hebrew and Aramaic: <em>" + esc((cr.he || []).join("; ") || "Vocalized Zohar") + "</em>, vowelled; the small boxed marks are the page numbers of the Vilna edition. " +
        enTxt + "The English does not reach every passage, and a passage may show only some paragraphs in English. Texts from <a href=\"https://www.sefaria.org\" rel=\"noopener\">sefaria.org</a>.";
      buildList(); fillParts(); goToday();
    }
    function fillParts() {
      var root = $("[data-bi]", panel), sel = $("[data-z-part]", root);
      sel.innerHTML = IDX.parts.map(function (p) {
        var n = mode === "all" ? p.n : (p.cov.match(/2/g) || []).length;
        return '<option value="' + p.i + '"' + (n ? "" : " disabled") + ">" + esc(p.en) + "  " + esc(p.he) + "  · " + n + (mode === "all" ? " passages" : " with English") + "</option>";
      }).join("");
    }
    function goToday() { showAt(mod(dayNumber(new Date()), list.length), true); }
    function step(d) { showAt(mod(pos + d, list.length)); }

    function showAt(i, isToday) {
      pos = i; cur = list[i];
      var root = $("[data-bi]", panel), p = IDX.parts[cur[0]], my = ++token;
      var text = $("[data-z-text]", root);
      var d = new Date();
      $("[data-z-kick]", root).textContent = isToday ? "The passage for " + longDate(d) : "Zohar passage " + (i + 1) + " of " + list.length;
      $("[data-z-title]", root).innerHTML = esc(p.en) + ' <span class="bi-he-title" lang="he" dir="rtl">' + esc(p.he) + "</span>";
      text.innerHTML = '<p class="bi-wait">Loading…</p>';
      var f = window.TC_ZOHAR_P && window.TC_ZOHAR_P[p.i] ? Promise.resolve() : loadScript("data/zohar/p" + (p.i < 10 ? "0" : "") + p.i + ".js");
      f.then(function () {
        if (my !== token) return;
        var S = window.TC_ZOHAR_P[p.i].s[cur[1]];
        $("[data-z-sub]", root).textContent = "Zohar, " + p.en + ", section " + (cur[1] + 1) + " of " + p.n + (S.p ? "  ·  Vilna edition, vol. " + p.vol + ", " + S.p : "");
        var partSel = $("[data-z-part]", root); partSel.value = String(p.i);
        var secSel = $("[data-z-sec]", root), opts = "";
        for (var s = 0; s < p.n; s++) {
          if (mode === "tr" && p.cov.charAt(s) !== "2") continue;
          var pg = window.TC_ZOHAR_P[p.i].s[s].p;
          opts += '<option value="' + p.i + ":" + s + '">Section ' + (s + 1) + (pg ? "  ·  " + pg : "") + (p.cov.charAt(s) === "0" ? "" : p.cov.charAt(s) === "2" ? "  ·  English" : "  ·  some English") + "</option>";
        }
        secSel.innerHTML = opts; secSel.value = p.i + ":" + cur[1];
        var html = "", have = 0;
        S.c.forEach(function (c) { if (c[1]) have++; });
        cards = [];
        S.c.forEach(function (c, j) {
          var ref = "Zohar, " + p.en + ", section " + (cur[1] + 1) + ", paragraph " + (j + 1) + (S.p ? ". Vilna edition " + S.p : "");
          cards.push({ he: plain(c[0]), en: c[1] ? plain(c[1]) : "", ref: ref, kicker: "The Zohar", file: "twelvecubed-zohar-" + slug(p.en) + "-s" + (cur[1] + 1) + "-p" + (j + 1),
                       credit: "Aramaic: Vocalized Zohar, Israel 2013. English: Soncino Press, 1933. Both from Sefaria." });
          html += '<div class="bi-row bi-zrow" data-ci="' + j + '"><span class="bi-num">' + saveBtn("passage") + '</span><p class="bi-en' + (c[1] ? "" : " bi-miss") + '" lang="en">' + (c[1] ? c[1] : "Not translated into English in the supplied files.") + "</p>" +
            '<p class="bi-he" lang="he" dir="rtl">' + c[0] + "</p></div>";
        });
        if (!have) html = '<p class="bi-solo-note">There is no English translation of this passage in the supplied files, so the Aramaic stands alone.</p>' + html;
        text.className = "bi-text" + (have ? "" : " bi-solo");
        text.innerHTML = html;
        if (!isToday || reduce) return;
      }).catch(function (e) { text.innerHTML = '<p class="notice">This part of the Zohar could not load.</p>'; if (window.console) console.error(e); });
    }
  }

  var z = $("[data-zohar]"), t = $("[data-torah]");
  if (z) mountZohar(z);
  if (t) mountTorah(t);
})();
