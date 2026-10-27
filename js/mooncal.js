/* The Moon calendar: one month at a time, with the Moon's phase for every day, the sign she stands in, the exact time of
   each New, First Quarter, Full and Last Quarter Moon, of each change of sign, of each major aspect she makes to the
   Sun and the planets, and of every solar and lunar eclipse (a small symbol shows which kind). It can be saved as a picture
   (PNG), and as a Moon wheel: the month's Moon drawn round the zodiac, with the Earth, a picture or a logo in the middle.

   window.TCMoonCal.mount(box)               draws the calendar into box
   window.TCMoonCal.compute(y, m, tz)        the month as data: { days[], events[], ... }   (m = 0..11, tz = an IANA zone or "UTC")

   Maths: astronomy-engine (MIT) through js/ephem.js (the Moon and the planets, apparent positions, tropical zodiac;
   the eclipses from its eclipse search: the instant of greatest eclipse, anywhere on Earth for a solar one).
   Every time is found by bisection to the second and shown to the nearest minute. No data files, nothing is sent anywhere.
   Needs Astronomy, TCAstro, TCEphem, TCWheel and TC_GLYPHS (loaded by js/daily.js before this file). */
(function () {
  "use strict";
  var Astro = window.Astronomy, A = window.TCAstro, E = window.TCEphem, W = window.TCWheel, GL = window.TC_GLYPHS || {};
  var RAD = Math.PI / 180, MIN = 60000, HOUR = 3600000, DAY = 86400000, STEP = 2 * HOUR;
  var KEY = "tc_mooncal";
  var BASE = (function () { var c = document.currentScript && document.currentScript.src; return c ? c.replace(/js\/mooncal\.js(\?.*)?$/, "") : ""; })();   // the site's root, to find the files that load on demand
  var loaded = {};
  function loadScript(rel, test) {
    if (test && test()) return Promise.resolve(true);
    if (loaded[rel]) return loaded[rel];
    return (loaded[rel] = new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = BASE + rel; el.onload = function () { resolve(true); };
      el.onerror = function () { delete loaded[rel]; reject(new Error("Could not load " + rel)); };
      document.head.appendChild(el);
    }));
  }
  var CENTRES = [["earth-full", "The Earth at the Full Moon"], ["earth-new", "The Earth at the New Moon"], ["sol", "Sol and Luna"], ["rota", "The Rota"], ["cubed", "The TwelveCubed mark"], ["month", "The month, written"], ["all", "All four together"]];
  var SIGNS = E.SIGNS;
  var QUARTERS = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"];
  var WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var PLANETS = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  var ASP = [
    { k: "conjunction", a: 0, verb: "conjunct" }, { k: "sextile", a: 60, verb: "sextile" }, { k: "square", a: 90, verb: "square" },
    { k: "trine", a: 120, verb: "trine" }, { k: "opposition", a: 180, verb: "opposite" }
  ];
  var ASYM = {   /* the aspect symbols, the same drawings as the chart sheet (100 x 100 box) */
    conjunction: '<circle cx="30" cy="70" r="14"/><path d="M40 60L80 20"/>',
    opposition: '<circle cx="22" cy="78" r="12"/><circle cx="78" cy="22" r="12"/><path d="M31 69L69 31"/>',
    trine: '<path d="M50 14L88 82H12Z"/>',
    square: '<rect x="18" y="18" width="64" height="64"/>',
    sextile: '<path d="M50 10V90M16 30L84 70M16 70L84 30"/>'
  };
  var POSTER_ASP = {   /* aspect colours on the saved picture, per plate */
    dark: { conjunction: "#eaf1ee", opposition: "#ff5c6c", square: "#ff5c6c", trine: "#7d90ff", sextile: "#56c8ee" },
    light: { conjunction: "#08104a", opposition: "#d00000", square: "#d00000", trine: "#1010d0", sextile: "#0a86b0" }
  };

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function deviceZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } }
  function minute(ms) { return Math.round(ms / MIN) * MIN; }

  /* ---------- time in a zone ---------- */
  var FM = {};
  function clockFmt(tz) {
    return FM[tz] || (FM[tz] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  }
  function hhmm(ms, tz) { return clockFmt(tz).format(new Date(ms)).replace(/^24:/, "00:"); }
  function ymdIn(ms, tz) {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month - 1, d: +p.day };
  }
  function dayStart(y, m, d, tz) {                      // the instant a calendar day begins in the zone (m = 0..11; d may overflow)
    var n = new Date(Date.UTC(y, m, d));
    if (tz === "UTC") return n.getTime();
    return A.localToUtc(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), 0, 0, tz).ms;
  }
  function offsetText(ms, tz) {
    if (tz === "UTC") return "UTC";
    var s = 0;
    try { s = A.offsetSec(ms, tz); } catch (e) { s = 0; }
    var mm = Math.round(Math.abs(s) / 60);
    return "UTC" + (s < 0 ? "−" : "+") + two(Math.floor(mm / 60)) + ":" + two(mm % 60);
  }

  /* ---------- the sky ---------- */
  function bisect(f, a, b) {        // f(a) < 0 <= f(b); the instant f crosses zero
    for (var i = 0; i < 26; i++) { var mid = (a + b) / 2; if (f(mid) < 0) a = mid; else b = mid; }
    return (a + b) / 2;
  }
  function moonAt(ms) {
    var ang = Astro.MoonPhase(new Date(ms)), lon = E.lonOf("moon", ms), s = E.split(lon);
    return { ms: ms, angle: ang, illum: (1 - Math.cos(ang * RAD)) / 2, waxing: ang < 180, lon: lon, sign: s.idx, deg: s.deg };
  }
  function phaseName(angle) {
    var idx = Math.floor(((angle + 22.5) % 360) / 45);
    return E.PHASES[idx];
  }

  function compute(y, m, tz) {
    var nDays = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), starts = [], d, k, i;
    for (d = 1; d <= nDays + 1; d++) starts.push(dayStart(y, m, d, tz));
    var first = starts[0], last = starts[nDays];
    var t0 = first - STEP, n = Math.ceil((last + STEP - t0) / STEP) + 1, T = [], moon = [], pl = {};
    PLANETS.forEach(function (p) { pl[p] = []; });
    for (k = 0; k < n; k++) {
      var t = t0 + k * STEP; T.push(t);
      moon.push(E.lonOf("moon", t));
      PLANETS.forEach(function (p) { pl[p].push(E.lonOf(p, t)); });
    }
    var events = [];

    /* the four quarters */
    var q = Astro.SearchMoonQuarter(new Date(first - MIN));
    while (q && q.time.date.getTime() < last) {
      var qms = minute(q.time.date.getTime());
      if (qms >= first && qms < last) {
        var ql = E.lonOf("moon", qms), qs = E.split(ql);
        events.push({ type: "phase", ms: qms, quarter: q.quarter, name: QUARTERS[q.quarter], sign: qs.idx, deg: qs.deg });
      }
      q = Astro.NextMoonQuarter(q);
    }

    /* the eclipses: the Sun's are found for the whole Earth (the greatest eclipse), the Moon's are seen from the whole night side */
    function addEclipse(body, info) {
      var ems = minute(info.peak.date.getTime());
      if (ems < first || ems >= last) return;
      var es = E.split(E.lonOf("moon", ems)), kind = info.kind, ob = info.obscuration || 0, note;
      if (body === "lunar") {
        note = kind === "total" ? "The Moon is wholly inside the Earth’s shadow and turns copper-red. Seen from everywhere the Moon is above the horizon."
          : kind === "partial" ? Math.round(ob * 100) + "% of the Moon’s disc is inside the Earth’s dark shadow."
          : "Only the Earth’s faint outer shadow touches her: a subtle dimming, often hard to notice.";
      } else {
        note = kind === "total" ? "The Moon covers the Sun completely along a narrow path; a partial eclipse is seen over a much wider area."
          : kind === "annular" ? "The Moon is too far to cover the Sun and leaves a ring of light, along a narrow path."
          : "The Moon covers up to " + Math.round(ob * 100) + "% of the Sun at the best place on Earth.";
      }
      events.push({ type: "eclipse", body: body, kind: kind, ms: ems, sign: es.idx, deg: es.deg, obs: ob, note: note });
    }
    var le = Astro.SearchLunarEclipse(new Date(first - 3 * DAY));
    while (le && le.peak.date.getTime() < last + DAY) { addEclipse("lunar", le); le = Astro.NextLunarEclipse(le.peak); }
    var se = Astro.SearchGlobalSolarEclipse(new Date(first - 3 * DAY));
    while (se && se.peak.date.getTime() < last + DAY) { addEclipse("solar", se); se = Astro.NextGlobalSolarEclipse(se.peak); }

    /* a change of sign, and the aspects to the Sun and the planets */
    for (k = 0; k < n - 1; k++) {
      var sa = Math.floor(moon[k] / 30), sb = Math.floor(moon[k + 1] / 30);
      if (sa !== sb) {
        var target = sb * 30;
        var ing = minute(bisect(function (ms) { return E.diff(E.lonOf("moon", ms), target); }, T[k], T[k + 1]));
        if (ing >= first && ing < last) events.push({ type: "ingress", ms: ing, sign: sb });
      }
      PLANETS.forEach(function (p) {
        ASP.forEach(function (as) {
          if (p === "sun" && (as.a === 0 || as.a === 90 || as.a === 180)) return;   // these are the four phases
          var fa = E.diff(moon[k] - pl[p][k], as.a), fb = E.diff(moon[k + 1] - pl[p][k + 1], as.a);
          if (fa < 0 && fb >= 0 && fa > -20 && fb < 20) {
            var ex = minute(bisect(function (ms) { return E.diff(E.lonOf("moon", ms) - E.lonOf(p, ms), as.a); }, T[k], T[k + 1]));
            if (ex >= first && ex < last) events.push({ type: "aspect", ms: ex, planet: p, aspect: as.k, verb: as.verb });
          }
        });
      });
    }
    events.sort(function (a, b) { return a.ms - b.ms || RANK[a.type] - RANK[b.type]; });

    /* the days */
    var days = [], ei = 0;
    for (i = 0; i < nDays; i++) {
      var s0 = starts[i], s1 = starts[i + 1], list = [];
      while (ei < events.length && events[ei].ms < s1) { if (events[ei].ms >= s0) list.push(events[ei]); ei++; }
      var quarter = null, eclipse = null;
      list.forEach(function (e) { if (e.type === "phase") quarter = e; else if (e.type === "eclipse" && !eclipse) eclipse = e; });
      var mo = moonAt(quarter ? quarter.ms : Math.round((s0 + s1) / 2));   // on a quarter day the picture shows the exact moment
      var noon = quarter ? moonAt(Math.round((s0 + s1) / 2)) : mo;
      days.push({ d: i + 1, start: s0, end: s1, moon: mo, sign: noon.sign, deg: noon.deg, name: quarter ? quarter.name : phaseName(noon.angle), quarter: !!quarter, eclipse: eclipse, events: list });
    }
    return { y: y, m: m, tz: tz, nDays: nDays, days: days, events: events, first: first, last: last,
      zone: tz === "UTC" ? "UTC" : tz.replace(/_/g, " ") + ", " + offsetText(Math.round((first + last) / 2), tz) };
  }

  /* ---------- drawing pieces ---------- */
  var MOON_DARK = "#232a66", MOON_LIT = "#f6edc4", MOON_EDGE = "rgba(150,160,215,0.65)";
  function moonPath(info) {
    var k = info.illum, rx = Math.abs(1 - 2 * k) * 40;
    if (k < 0.004) return "";
    return "M0 -40A40 40 0 0 1 0 40A" + rx.toFixed(2) + " 40 0 0 " + (k < 0.5 ? 0 : 1) + " 0 -40Z";
  }
  function flipFor(info, south) { return (info.waxing !== south) ? "" : ' transform="scale(-1 1)"'; }   // the lit side: right when waxing in the north
  function moonSvg(info, south, label) {
    var d = moonPath(info);
    return '<svg class="mc-moon" viewBox="-44 -44 88 88" role="img" aria-label="' + esc(label) + '" focusable="false">' +
      '<circle r="40" fill="' + MOON_DARK + '" stroke="' + MOON_EDGE + '" stroke-width="2"/>' +
      (d ? '<path d="' + d + '" fill="' + MOON_LIT + '"' + flipFor(info, south) + "/>" : "") + "</svg>";
  }
  function signSvg(idx, cls) {
    return '<svg class="mc-sg ' + (cls || "") + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="' + (GL[SIGNS[idx]] || "") + '" fill="currentColor"/></svg>';
  }
  function planetSvg(key, size) {
    return '<svg class="mc-pg" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + W.GLYPH[key]("currentColor") + "</svg>";
  }
  function asymSvg(type) {
    return '<svg class="mc-as ' + type + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' + ASYM[type] + "</svg>";
  }
  var RANK = { phase: 0, eclipse: 1, ingress: 2, aspect: 3 };
  /* ---------- the eclipse symbols: a drawing of what happens in the sky (100 x 100 box, centre 0,0) ---------- */
  var ecN = 0, GOLD = "#f29a00", SHADOW = "#05072a", COPPER = "#a63b25", LIT = "#f6edc4";
  function ecKind(e) { return e.kind.charAt(0).toUpperCase() + e.kind.slice(1); }
  function ecLabel(e) { return ecKind(e) + " " + e.body + " eclipse"; }
  function ecShort(e) { return ecKind(e) + " " + e.body; }
  function eclipseInner(body, kind, edge, gold) {
    var s = "", id = "tcec" + (++ecN), k;
    gold = gold || GOLD; edge = edge || "currentColor";
    if (body === "solar") {
      if (kind === "total") {                                  // a black disc with the corona round it
        for (k = 0; k < 8; k++) {
          var a = k * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
          s += '<path d="M' + (c * 37).toFixed(1) + " " + (sn * 37).toFixed(1) + "L" + (c * 48).toFixed(1) + " " + (sn * 48).toFixed(1) + '" stroke="' + gold + '" stroke-width="6" stroke-linecap="round"/>';
        }
        s += '<circle r="32" fill="' + SHADOW + '" stroke="' + gold + '" stroke-width="6"/>';
      } else if (kind === "annular") {                         // the ring of light
        s += '<circle r="43" fill="' + gold + '"/><circle r="27" fill="' + SHADOW + '"/>';
      } else {                                                 // the Sun with a bite out of it
        s += '<clipPath id="' + id + '"><circle r="43"/></clipPath><circle r="43" fill="' + gold + '"/><circle cx="26" cy="-19" r="35" fill="' + SHADOW + '" clip-path="url(#' + id + ')"/>' +
          '<circle r="43" fill="none" stroke="' + gold + '" stroke-width="3"/>';
      }
    } else if (kind === "total") {                             // the blood Moon
      s += '<circle r="43" fill="' + COPPER + '" stroke="' + edge + '" stroke-opacity="0.7" stroke-width="3"/><circle cx="-12" cy="-12" r="17" fill="#d4694a" opacity="0.55"/>';
    } else if (kind === "partial") {                           // the Moon with the Earth's shadow across her
      s += '<clipPath id="' + id + '"><circle r="43"/></clipPath><circle r="43" fill="' + LIT + '"/><circle cx="-24" cy="17" r="33" fill="#7d2b1d" clip-path="url(#' + id + ')"/>' +
        '<circle r="43" fill="none" stroke="' + edge + '" stroke-opacity="0.7" stroke-width="3"/>';
    } else {                                                   // penumbral: a faint shading and a dotted edge
      s += '<circle r="43" fill="' + LIT + '"/><circle r="43" fill="#39407f" opacity="0.38"/><circle r="43" fill="none" stroke="' + edge + '" stroke-opacity="0.75" stroke-width="3" stroke-dasharray="3 6"/>';
    }
    return s;
  }
  function eclipseSvg(body, kind, cls, label) {
    return '<svg class="mc-ec ' + (cls || "") + '" viewBox="-50 -50 100 100" ' + (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + ' focusable="false">' + eclipseInner(body, kind) + "</svg>";
  }
  var PNAME = { sun: "the Sun", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" };
  function eventText(e) {
    if (e.type === "phase") return e.name + " at " + e.deg + "° " + SIGNS[e.sign];
    if (e.type === "eclipse") return ecLabel(e) + " at " + e.deg + "° " + SIGNS[e.sign];
    if (e.type === "ingress") return "Moon enters " + SIGNS[e.sign];
    return "Moon " + e.verb + " " + PNAME[e.planet];
  }

  /* ---------- the page ---------- */
  function mount(box) {
    var tzDev = deviceZone();
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
    var southDefault = !!(window.TC_TZPLACE && window.TC_TZPLACE[tzDev] && window.TC_TZPLACE[tzDev][3] < 0);
    var centreOk = function (c) { return CENTRES.some(function (x) { return x[0] === c; }); };
    var st = { zone: saved.zone === "utc" ? "utc" : "my", south: typeof saved.south === "boolean" ? saved.south : southDefault, centre: centreOk(saved.centre) ? saved.centre : "earth-full", y: 0, m: 0, model: null };
    function remember() { try { localStorage.setItem(KEY, JSON.stringify({ zone: st.zone, south: st.south, centre: st.centre })); } catch (e) { /* private mode */ } }
    function tz() { return st.zone === "utc" ? "UTC" : tzDev; }
    var now = ymdIn(Date.now(), tz());
    st.y = now.y; st.m = now.m;

    var months = []; for (var i = 0; i < 12; i++) months.push(new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, i, 1))));

    box.innerHTML =
      '<div class="mc-bar">' +
        '<div class="mc-nav">' +
          '<button type="button" class="mc-btn" data-mc="prev" aria-label="Previous month">&lsaquo;</button>' +
          '<select data-mc="month" aria-label="Month">' + months.map(function (n, k) { return '<option value="' + k + '">' + n + "</option>"; }).join("") + "</select>" +
          '<input type="number" data-mc="year" min="1800" max="2100" step="1" inputmode="numeric" aria-label="Year">' +
          '<button type="button" class="mc-btn" data-mc="next" aria-label="Next month">&rsaquo;</button>' +
          '<button type="button" class="mc-btn mc-today" data-mc="today">This month</button>' +
        "</div>" +
        '<div class="mc-opts">' +
          '<span class="seg" role="group" aria-label="Time zone of the times"><button type="button" data-zone="my">My time</button><button type="button" data-zone="utc">UTC</button></span>' +
          '<span class="seg" role="group" aria-label="The sky the Moon is drawn for"><button type="button" data-sky="north">Northern sky</button><button type="button" data-sky="south">Southern sky</button></span>' +
          '<button type="button" class="mc-save" data-mc="png"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Save as PNG</button>' +
        "</div>" +
      "</div>" +
      '<h3 class="mc-title" data-mc-title aria-live="polite"></h3>' +
      '<p class="mc-zone" data-mc-zone></p>' +
      '<div class="mc-gridwrap"><table class="mc-grid"><caption class="mc-cap" data-mc-cap></caption><thead><tr>' +
        WEEK.map(function (w) { return '<th scope="col">' + w + "</th>"; }).join("") + "</tr></thead><tbody data-mc-body></tbody></table></div>" +
      '<ul class="mc-key" aria-label="Key">' +
        '<li><span class="mc-keymoon">' + moonSvg({ illum: 0.5, waxing: true, angle: 90 }, false, "") + '</span>the phase of the Moon</li>' +
        '<li><span class="mc-keysign">' + signSvg(5) + "</span>her sign and degree at noon</li>" +
        '<li class="mc-keyec"><span class="mc-ecset">' + eclipseSvg("solar", "total") + eclipseSvg("solar", "annular") + eclipseSvg("solar", "partial") + "</span>solar eclipse: total, annular, partial</li>" +
        '<li class="mc-keyec"><span class="mc-ecset">' + eclipseSvg("lunar", "total") + eclipseSvg("lunar", "partial") + eclipseSvg("lunar", "penumbral") + "</span>lunar eclipse: total, partial, penumbral</li>" +
        ASP.map(function (a) { return '<li>' + asymSvg(a.k) + a.k + "</li>"; }).join("") +
      "</ul>" +
      '<div class="mc-wheelbox">' +
        '<div class="mc-wheeltxt"><h4>The Moon wheel</h4><p>The same month as one round picture: a disc for every day, spiralling inward round the zodiac at the Moon&rsquo;s true place, with the planets of mid-month, the four phases and the eclipses marked, and a picture of your choice in the middle. Big enough to print.</p></div>' +
        '<div class="mc-wheelctl"><label>In the middle <select data-mc="centre" aria-label="What is drawn in the middle of the Moon wheel">' + CENTRES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + "</option>"; }).join("") + "</select></label>" +
        '<button type="button" class="mc-btn" data-mc="wheel-show">Show it here</button>' +
        '<button type="button" class="mc-save" data-mc="wheel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Save the Moon wheel</button></div>' +
        '<figure class="mc-wheelfig" data-mc-wheelfig hidden></figure>' +
      "</div>" +
      '<details class="mc-list" data-mc-list><summary data-mc-sum></summary><div data-mc-events></div></details>' +
      '<p class="mc-fine" data-mc-fine></p>' +
      '<p class="mc-status" role="status" data-mc-status></p>';

    var $ = function (s) { return box.querySelector(s); };
    var el = { month: $('[data-mc="month"]'), year: $('[data-mc="year"]'), title: $("[data-mc-title]"), zone: $("[data-mc-zone]"), cap: $("[data-mc-cap]"),
      centre: $('[data-mc="centre"]'), wheelfig: $("[data-mc-wheelfig]"), body: $("[data-mc-body]"), list: $("[data-mc-list]"), sum: $("[data-mc-sum]"), events: $("[data-mc-events]"), fine: $("[data-mc-fine]"), status: $("[data-mc-status]") };

    function monthTitle() { return months[st.m] + " " + st.y; }
    function dayLabel(day) {
      var dt = new Date(Date.UTC(st.y, st.m, day.d)), wd = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(dt);
      return wd + " " + day.d + " " + months[st.m] + " " + st.y;
    }

    function eventHtml(e) {
      var t = '<time>' + hhmm(e.ms, st.model.tz) + "</time>";
      if (e.type === "phase") return '<p class="mc-e mc-ph"><b>' + e.name + "</b>" + t + "</p>";
      if (e.type === "eclipse") return '<p class="mc-e mc-ecl" title="' + esc(eventText(e)) + '"><span>' + eclipseSvg(e.body, e.kind) + "<em>" + ecShort(e) + "</em></span>" + t + "</p>";
      if (e.type === "ingress") return '<p class="mc-e mc-in"><span><i aria-hidden="true">&rarr;</i>' + signSvg(e.sign) + SIGNS[e.sign] + "</span>" + t + "</p>";
      return '<p class="mc-e mc-ap" title="' + esc(eventText(e)) + '"><span>' + planetSvg("moon", 14) + asymSvg(e.aspect) + planetSvg(e.planet, 14) +
        '<span class="mc-sr">' + esc(eventText(e)) + "</span></span>" + t + "</p>";
    }

    function paint() {
      var model = st.model = compute(st.y, st.m, tz()), today = ymdIn(Date.now(), model.tz);
      el.month.value = String(st.m); el.year.value = String(st.y); el.centre.value = st.centre;
      if (!el.wheelfig.hidden) { el.wheelfig.hidden = true; el.wheelfig.innerHTML = ""; }       // a picture of another month or setting is not shown any longer
      el.title.textContent = monthTitle();
      el.cap.textContent = "Moon calendar for " + monthTitle();
      el.zone.textContent = "Times in " + model.zone + ". Moon drawn for the " + (st.south ? "southern" : "northern") + " sky.";
      box.querySelectorAll("[data-zone]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-zone") === st.zone)); });
      box.querySelectorAll("[data-sky]").forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-sky") === "south") === st.south)); });

      var lead = (new Date(Date.UTC(st.y, st.m, 1)).getUTCDay() + 6) % 7, cells = [], r;
      for (r = 0; r < lead; r++) cells.push('<td class="mc-pad"></td>');
      model.days.forEach(function (day) {
        var isToday = today.y === st.y && today.m === st.m && today.d === day.d;
        var tip = dayLabel(day) + ": " + day.name + ", " + Math.round(day.moon.illum * 100) + "% lit, Moon in " + SIGNS[day.sign] + " " + day.deg + "°";
        var ecs = day.events.filter(function (e) { return e.type === "eclipse"; });
        ecs.forEach(function (e) { tip += ". " + eventText(e) + " at " + hhmm(e.ms, model.tz); });
        cells.push('<td class="mc-c' + (day.quarter ? " is-quarter" : "") + (ecs.length ? " has-eclipse" : "") + (isToday ? " is-today" : "") + '" title="' + esc(tip) + '">' +
          '<div class="mc-d"><span class="mc-n">' + day.d + '</span><span class="mc-mw">' + moonSvg(day.moon, st.south, day.name + ", " + Math.round(day.moon.illum * 100) + "% lit") +
          ecs.map(function (e) { return eclipseSvg(e.body, e.kind, "mc-ecb", ecLabel(e)); }).join("") + "</span>" +
          '<span class="mc-s" title="Moon in ' + SIGNS[day.sign] + '">' + signSvg(day.sign) + "<i>" + day.deg + "°</i></span></div>" +
          '<div class="mc-evs">' + day.events.map(eventHtml).join("") + "</div></td>");
      });
      while (cells.length % 7) cells.push('<td class="mc-pad"></td>');
      var rows = [];
      for (r = 0; r < cells.length; r += 7) rows.push("<tr>" + cells.slice(r, r + 7).join("") + "</tr>");
      el.body.innerHTML = rows.join("");

      /* the list of every event, by day */
      var html = "", cur = 0;
      model.days.forEach(function (day) {
        if (!day.events.length) return;
        html += '<h4>' + dayLabel(day) + "</h4><ul>" + day.events.map(function (e) {
          if (e.type === "eclipse") return '<li class="is-eclipse"><time>' + hhmm(e.ms, model.tz) + "</time><span>" + eclipseSvg(e.body, e.kind) + "<span><b>" + esc(eventText(e)) + "</b><small>" + esc(e.note) + "</small></span></span></li>";
          return '<li class="' + (e.type === "phase" ? "is-phase" : "") + '"><time>' + hhmm(e.ms, model.tz) + "</time> " + esc(eventText(e)) + "</li>";
        }).join("") + "</ul>";
        cur += day.events.length;
      });
      el.events.innerHTML = html;
      el.sum.textContent = "Every event this month, in order (" + cur + ")";
      if (window.matchMedia && window.matchMedia("(max-width: 48rem)").matches) el.list.setAttribute("open", ""); else el.list.removeAttribute("open");
      el.fine.innerHTML = "Tropical zodiac; apparent geocentric positions from astronomy-engine. Times are exact to the minute. The Moon is drawn at noon of each day, and at the exact moment on the day of a New, First Quarter, Full or Last Quarter Moon. Conjunction, square and opposition to the Sun are the four phases, so only her sextile and trine to the Sun are listed. An eclipse is shown on the day of its greatest eclipse; a solar eclipse is found for the whole Earth, so whether you can see it from where you live depends on the path of the shadow, and a total or annular one is seen only along a narrow track. <a href=\"../about.html#how-calculated\">How the sky is calculated</a>.";
    }

    function go(dm) { var t = st.y * 12 + st.m + dm; st.y = Math.floor(t / 12); st.m = t - st.y * 12; clampYear(); paint(); }
    function clampYear() { if (st.y < 1800) { st.y = 1800; st.m = 0; } if (st.y > 2100) { st.y = 2100; st.m = 11; } }
    box.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b || !box.contains(b)) return;
      var a = b.getAttribute("data-mc"), z = b.getAttribute("data-zone"), s = b.getAttribute("data-sky");
      if (a === "prev") go(-1); else if (a === "next") go(1);
      else if (a === "today") { var n = ymdIn(Date.now(), tz()); st.y = n.y; st.m = n.m; paint(); }
      else if (a === "png") savePng();
      else if (a === "wheel") saveWheel();
      else if (a === "wheel-show") showWheel();
      else if (z) { if (st.zone !== z) { st.zone = z; remember(); paint(); } }
      else if (s) { var south = s === "south"; if (st.south !== south) { st.south = south; remember(); paint(); } }
    });
    el.month.addEventListener("change", function () { st.m = +el.month.value; paint(); });
    el.centre.addEventListener("change", function () { st.centre = el.centre.value; remember(); if (!el.wheelfig.hidden) showWheel(); });
    el.year.addEventListener("change", function () { var v = parseInt(el.year.value, 10); if (isFinite(v)) { st.y = v; clampYear(); } paint(); });

    /* ---------- the saved picture ---------- */
    function poster() {
      var model = st.model, light = document.documentElement.getAttribute("data-theme") === "light";
      var P = light ? { bg: "#eef1f8", ink: "#08104a", dim: "#4c5688", rule: "#b9c1dc", accent: "#ad6100", cell: "#e4e9f6", today: "#ad6100" }
                    : { bg: "#08104a", ink: "#eaf1ee", dim: "#aeb9da", rule: "#2a3480", accent: "#ffa31a", cell: "#0c1660", today: "#ffa31a" };
      var AC = POSTER_ASP[light ? "light" : "dark"];
      var lead = (new Date(Date.UTC(st.y, st.m, 1)).getUTCDay() + 6) % 7, rows = Math.ceil((lead + model.nDays) / 7);
      var PW = 1800, M = 40, GW = PW - 2 * M, CW = GW / 7, CH = 292, HEAD = 250, WK = 54, FOOT = 176;
      var PH = Math.round(HEAD + WK + rows * CH + FOOT + M);
      var o = [], SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', serif";
      function txt(x, y, s, size, fill, weight, anchor, extra) {
        return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (weight ? ' font-weight="' + weight + '"' : "") +
          (anchor ? ' text-anchor="' + anchor + '"' : "") + (extra || "") + ">" + esc(s) + "</text>";
      }
      function g(x, y, size, inner) { return '<g transform="translate(' + (x - size / 2).toFixed(1) + " " + (y - size / 2).toFixed(1) + ") scale(" + (size / 100).toFixed(4) + ')">' + inner + "</g>"; }
      function planet(key, x, y, size, col) { return g(x, y, size, W.GLYPH[key](col)); }
      function sign(idx, x, y, size, col) { return g(x, y, size, '<path d="' + (GL[SIGNS[idx]] || "") + '" fill="' + col + '"/>'); }
      function asym(type, x, y, size) { return g(x, y, size, '<g fill="none" stroke="' + AC[type] + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' + ASYM[type] + "</g>"); }
      var EDGE = light ? "#08104a" : "#aeb9da", GOLDP = light ? "#e08a00" : "#ffb21c";
      function ecg(body, kind, x, y, size) { return g(x, y, size, '<g transform="translate(50 50)">' + eclipseInner(body, kind, EDGE, GOLDP) + "</g>"); }   // drawn round 0,0; g() wants a 0..100 box
      function moon(info, cx, cy, r) {
        var d = moonPath(info), flip = flipFor(info, st.south) ? "scale(-1 1)" : "";
        return '<g transform="translate(' + cx + " " + cy + ") scale(" + (r / 40).toFixed(3) + ')"><circle r="40" fill="' + MOON_DARK + '" stroke="' + (light ? "#08104a" : MOON_EDGE) + '" stroke-width="2"/>' +
          (d ? '<path d="' + d + '" fill="' + MOON_LIT + '"' + (flip ? ' transform="' + flip + '"' : "") + "/>" : "") + "</g>";
      }
      o.push('<rect width="' + PW + '" height="' + PH + '" fill="' + P.bg + '"/>');
      o.push(txt(M + 14, 92, "THE MOON CALENDAR", 28, P.accent, 600, null, ' letter-spacing="9"'));
      o.push(txt(M + 12, 188, monthTitle(), 100, P.ink, 400));
      o.push(txt(M + 14, 232, "Phases, the Moon’s sign and her aspects · times in " + model.zone, 26, P.dim, 400, null, ' font-style="italic"'));
      o.push(moon({ illum: 0.5, waxing: true, angle: 90 }, PW - M - 60, 120, 56));
      var gy = HEAD;
      for (var c = 0; c < 7; c++) o.push(txt(M + c * CW + CW / 2, gy + 36, WEEK[c].toUpperCase(), 24, P.dim, 600, "middle", ' letter-spacing="4"'));
      gy += WK;
      o.push('<rect x="' + M + '" y="' + gy + '" width="' + GW + '" height="' + rows * CH + '" fill="none" stroke="' + P.rule + '" stroke-width="2"/>');
      for (c = 1; c < 7; c++) o.push('<path d="M' + (M + c * CW) + " " + gy + "V" + (gy + rows * CH) + '" stroke="' + P.rule + '" stroke-width="1.5"/>');
      for (var r = 1; r < rows; r++) o.push('<path d="M' + M + " " + (gy + r * CH) + "H" + (M + GW) + '" stroke="' + P.rule + '" stroke-width="1.5"/>');
      model.days.forEach(function (day, idx) {
        var pos = lead + idx, col = pos % 7, row = Math.floor(pos / 7), x0 = M + col * CW, y0 = gy + row * CH;
        var isToday = (function () { var t = ymdIn(Date.now(), model.tz); return t.y === st.y && t.m === st.m && t.d === day.d; })();
        if (day.quarter) o.push('<rect x="' + (x0 + 1) + '" y="' + (y0 + 1) + '" width="' + (CW - 2) + '" height="' + (CH - 2) + '" fill="' + P.cell + '"/>');
        if (isToday) o.push('<rect x="' + (x0 + 4) + '" y="' + (y0 + 4) + '" width="' + (CW - 8) + '" height="' + (CH - 8) + '" fill="none" stroke="' + P.today + '" stroke-width="3"/>');
        o.push(txt(x0 + 16, y0 + 40, String(day.d), 32, P.ink, 600));
        o.push(moon(day.moon, x0 + CW - 46, y0 + 48, 30));
        day.events.forEach(function (e) { if (e.type === "eclipse") o.push(ecg(e.body, e.kind, x0 + CW - 74, y0 + 72, 36)); });
        o.push(sign(day.sign, x0 + 28, y0 + 72, 26, P.ink));
        o.push(txt(x0 + 46, y0 + 80, day.deg + "°", 21, P.dim, 400));
        var ly = y0 + 120, shown = day.events.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
          return (RANK[a.e.type] < 2 ? 0 : 1) - (RANK[b.e.type] < 2 ? 0 : 1) || a.i - b.i;      // the phase and the eclipse first, then the rest in time
        }).slice(0, 6).map(function (x) { return x.e; });
        shown.forEach(function (e, n) {
          var y = ly + n * 28, tm = hhmm(e.ms, model.tz);
          if (e.type === "eclipse") {
            var lab = ecShort(e), tl = lab.length * 9.6 > 128 ? ' textLength="128" lengthAdjust="spacingAndGlyphs"' : "";
            o.push(ecg(e.body, e.kind, x0 + 26, y - 7, 26), txt(x0 + 46, y, lab, 19, P.ink, 700, null, tl), txt(x0 + CW - 12, y, tm, 20, P.dim, 400, "end"));
          } else if (e.type === "phase") {
            o.push(txt(x0 + 14, y, e.name, 21, P.accent, 700), txt(x0 + CW - 12, y, tm, 21, P.accent, 700, "end"));
          } else if (e.type === "ingress") {
            o.push(txt(x0 + 14, y, "→", 22, P.dim, 400), sign(e.sign, x0 + 52, y - 7, 22, P.ink), txt(x0 + 70, y, SIGNS[e.sign], 20, P.ink, 400), txt(x0 + CW - 12, y, tm, 20, P.dim, 400, "end"));
          } else {
            o.push(planet("moon", x0 + 26, y - 7, 22, P.ink), asym(e.aspect, x0 + 58, y - 7, 22), planet(e.planet, x0 + 90, y - 7, 22, P.ink), txt(x0 + CW - 12, y, tm, 20, P.dim, 400, "end"));
          }
        });
        if (day.events.length > shown.length) o.push(txt(x0 + 14, ly + 6 * 28, "+" + (day.events.length - shown.length) + " more", 18, P.dim, 400));
      });
      var fy = gy + rows * CH + 48, kx = M + 6;
      ASP.forEach(function (a) { o.push(asym(a.k, kx + 12, fy - 7, 24), txt(kx + 32, fy, a.k, 22, P.dim, 400)); kx += 48 + a.k.length * 11.5 + 28; });
      o.push(txt(PW - M - 6, fy, "Moon " + (st.south ? "as seen from the southern sky" : "as seen from the northern sky"), 22, P.dim, 400, "end", ' font-style="italic"'));
      var ex = PW / 2 - 470;
      o.push(ecg("solar", "total", ex, fy + 44, 34), ecg("solar", "annular", ex + 44, fy + 44, 34), ecg("solar", "partial", ex + 88, fy + 44, 34), txt(ex + 118, fy + 51, "solar eclipse: total, annular, partial", 21, P.dim, 400));
      ex += 560;
      o.push(ecg("lunar", "total", ex, fy + 44, 34), ecg("lunar", "partial", ex + 44, fy + 44, 34), ecg("lunar", "penumbral", ex + 88, fy + 44, 34), txt(ex + 118, fy + 51, "lunar eclipse: total, partial, penumbral", 21, P.dim, 400));
      o.push(txt(PW / 2, fy + 112, "© TwelveCubed · tropical zodiac, geocentric apparent positions · for reflection, not prediction", 20, P.dim, 400, "middle"));
      return { w: PW, h: PH, bg: P.bg, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + '" height="' + PH + '" viewBox="0 0 ' + PW + " " + PH + '" style="font-family:' + SERIF.replace(/"/g, "'") + '"><title>' + esc("Moon calendar, " + monthTitle()) + "</title>" + o.join("") + "</svg>" };
    }

    function download(blob, name) {
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
    }
    function drawPng(p) {                     // { w, h, bg, svg } -> a PNG blob, at most 12 megapixels so that phones can do it too
      return new Promise(function (resolve, reject) {
        var k = Math.min(2, Math.sqrt(12e6 / (p.w * p.h))), w = Math.round(p.w * k), h = Math.round(p.h * k);
        var svg = p.svg.replace('width="' + p.w + '" height="' + p.h + '"', 'width="' + w + '" height="' + h + '"');
        var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
        img.onload = function () {
          var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          var cx = cv.getContext("2d"); cx.fillStyle = p.bg; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          cv.toBlob(function (b) { if (b) resolve(b); else reject(new Error("This browser could not make the picture.")); }, "image/png");
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("This browser could not draw the picture.")); };
        img.src = url;
      });
    }
    function savePng() {
      var p;
      try { p = poster(); } catch (e) { el.status.textContent = "The picture could not be made."; if (window.console) console.error(e); return; }
      drawPng(p).then(function (b) {
        download(b, "twelve-cubed-moon-" + st.y + "-" + two(st.m + 1) + (st.zone === "utc" ? "-utc" : "") + ".png");
        el.status.textContent = "Saved " + monthTitle() + " as a picture.";
      }, function (e) { el.status.textContent = e.message; });
    }

    /* ---------- the Moon wheel (js/moonwheel.js and data/art.js load when first asked for) ---------- */
    var wheelBusy = false;
    function wheelPoster() {
      el.status.textContent = "Drawing the Moon wheel…";
      var needArt = st.centre === "sol" || st.centre === "rota" || st.centre === "all";
      return loadScript("js/moonwheel.js", function () { return window.TCMoonWheel; })
        .then(function () { return needArt ? loadScript("data/art.js", function () { return window.TC_ART; }) : true; })
        .then(function () { return window.TCMoonWheel.build(st.model, { south: st.south, light: document.documentElement.getAttribute("data-theme") === "light", centre: st.centre, zone: st.zone }); });
    }
    function showWheel() {
      if (wheelBusy) return; wheelBusy = true;
      wheelPoster().then(function (p) {
        var url = URL.createObjectURL(new Blob([p.svg], { type: "image/svg+xml;charset=utf-8" }));
        el.wheelfig.innerHTML = '<img alt="The Moon wheel for ' + esc(monthTitle()) + ': the Moon of each day spiralling round the zodiac, with the planets, the four phases and the eclipses" width="' + p.w + '" height="' + p.h + '">' +
          "<figcaption>" + esc(monthTitle()) + ". Save the Moon wheel to keep it as a PNG.</figcaption>";
        var im = el.wheelfig.querySelector("img"); im.onload = function () { URL.revokeObjectURL(url); }; im.src = url;
        el.wheelfig.hidden = false; el.status.textContent = "";
      }).catch(function (e) { el.status.textContent = e && e.message ? e.message : "The Moon wheel could not be made."; if (window.console) console.error(e); })
        .then(function () { wheelBusy = false; });
    }
    function saveWheel() {
      if (wheelBusy) return; wheelBusy = true;
      wheelPoster().then(drawPng).then(function (b) {
        download(b, "twelve-cubed-moon-wheel-" + st.y + "-" + two(st.m + 1) + "-" + st.centre + ".png");
        el.status.textContent = "Saved the Moon wheel for " + monthTitle() + ".";
      }).catch(function (e) { el.status.textContent = e && e.message ? e.message : "The Moon wheel could not be made."; if (window.console) console.error(e); })
        .then(function () { wheelBusy = false; });
    }

    paint();
    return { go: go, state: st, poster: poster };
  }

  window.TCMoonCal = { mount: mount, compute: compute, kit: {
    moonPath: moonPath, flipFor: flipFor, eclipseInner: eclipseInner, ecShort: ecShort, ecLabel: ecLabel, hhmm: hhmm, esc: esc, two: two,
    SIGNS: SIGNS, QUARTERS: QUARTERS, MOON_DARK: MOON_DARK, MOON_LIT: MOON_LIT, MOON_EDGE: MOON_EDGE, PLANETS: PLANETS
  } };
})();
