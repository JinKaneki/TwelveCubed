/* The sky section: a natal-style chart wheel (js/chartwheel.js) with its table of positions, the Moon's phase,
   the houses and the aspects. One module serves the home page ("the sky now", for the place your clock is set to)
   and the finder (the chart of the date, time and place that were entered).

   window.TCSky.mount(container, { mode: "now" | "chart", input })   -> { update(input) }
   window.TCSky.now()                                                -> { chart, place, input }  (used by the Dial)
   input = { ms, lat, lon, tz, place, note }   lat/lon may be null (no houses)

   Needs TCEphem, TCWheel, TCAstro and, for "now", TC_TZPLACE (all loaded by TC.loadSky()). No network. */
(function () {
  "use strict";
  var TC = window.TC, E = window.TCEphem, W = window.TCWheel, A = window.TCAstro;
  var KEY_PLATE = "tc_wheel_plate";
  var DEFAULT_PLACE = { name: "New York, New York, United States", lat: 40.7128, lon: -74.006, tz: "America/New_York", guess: true };

  /* ---------- places and time formats ---------- */
  var regionNames = null;
  function country(cc) {
    try { regionNames = regionNames || new Intl.DisplayNames(["en"], { type: "region" }); return regionNames.of(cc) || cc; } catch (e) { return cc; }
  }
  function deviceZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; }
  }
  function defaultPlace() {
    var tz = deviceZone(), t = window.TC_TZPLACE && window.TC_TZPLACE[tz];
    if (!t) return DEFAULT_PLACE;
    return { name: t[0] + (t[2] ? ", " + t[2] : "") + ", " + country(t[1]), lat: t[3], lon: t[4], tz: tz, fromZone: true };
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function parts(ms, tz) {
    var o = { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true };
    if (tz) o.timeZone = tz;
    var f;
    try { f = new Intl.DateTimeFormat("en-US", o).formatToParts(new Date(ms)); } catch (e) { o.timeZone = "UTC"; f = new Intl.DateTimeFormat("en-US", o).formatToParts(new Date(ms)); }
    var r = {};
    f.forEach(function (p) { r[p.type] = p.value; });
    return r;
  }
  function longDate(ms, tz) {
    var p = parts(ms, tz);
    return p.month + " " + p.day + ", " + p.year + ", " + p.hour + ":" + p.minute + " " + (p.dayPeriod || "").toUpperCase();
  }
  function utText(ms) { var p = parts(ms, "UTC"); return p.hour + ":" + p.minute + " " + (p.dayPeriod || "").toUpperCase() + " UT"; }
  function offsetCode(ms, tz) {
    var s = 0;
    try { s = A.offsetSec(ms, tz) || 0; } catch (e) { s = 0; }
    var m = Math.round(Math.abs(s) / 60);
    return Math.floor(m / 60) + (s < 0 ? "W" : "E") + two(m % 60);
  }
  function dmCoord(v, pos, neg) {
    var a = Math.abs(v), d = Math.floor(a + 1e-9), m = Math.round((a - d) * 60);
    if (m === 60) { d += 1; m = 0; }
    return d + "°" + two(m) + "′" + (v < 0 ? neg : pos);
  }
  function titleLines(inp) {
    var where = inp.place || "";
    var l1 = longDate(inp.ms, inp.tz) + (where ? ", " + where : "");
    var l2;
    if (inp.lat != null && inp.lon != null) {
      l2 = "[" + dmCoord(inp.lon, "E", "W") + " ; " + dmCoord(inp.lat, "N", "S") + "] / " + offsetCode(inp.ms, inp.tz) + ", " + utText(inp.ms);
    } else {
      l2 = utText(inp.ms) + (inp.note ? " · " + inp.note : "");
    }
    return [l1, l2];
  }
  function dayText(ms) {
    var p = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).formatToParts(new Date(ms)), r = {};
    p.forEach(function (x) { r[x.type] = x.value; });
    return r.weekday + ". " + r.day + " " + r.month + ", " + r.hour + ":" + r.minute + " " + String(r.dayPeriod || "").toUpperCase() + " UT";
  }

  /* ---------- the sky right now, for the Dial and for the home section ---------- */
  function now() {
    var pl = defaultPlace(), ms = Date.now();
    var input = { ms: ms, lat: pl.lat, lon: pl.lon, tz: pl.tz, place: pl.name, guess: pl.guess };
    return { chart: E.chart({ ms: ms, lat: pl.lat, lon: pl.lon }), place: pl, input: input };
  }

  /* ---------- small drawing helpers ---------- */
  function moonSvg(m, size) {
    var r = 40, k = m.illum, rx = Math.abs(1 - 2 * k) * r, lit = "#f4ecc8", dark = "#2c2f38";
    var d;
    if (k < 0.004) d = "";
    else {
      d = "M0 -" + r + "A" + r + " " + r + " 0 0 1 0 " + r;
      d += "A" + rx.toFixed(2) + " " + r + " 0 0 " + (k < 0.5 ? 0 : 1) + " 0 -" + r + "Z";
    }
    return '<svg class="moon-disc" viewBox="-44 -44 88 88" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle r="' + r + '" fill="' + dark + '" stroke="#99a" stroke-width="1"/>' +
      (d ? '<path d="' + d + '" fill="' + lit + '"' + (m.waxing ? "" : ' transform="scale(-1 1)"') + "/>" : "") + "</svg>";
  }
  function esc(t) { return TC.esc(t); }
  function glyph(key, color) { return W.glyphSvg(key, 20, color || "currentColor"); }
  var ASPECT_NAME = { opposition: "Opposition", square: "Square", trine: "Trine", sextile: "Sextile", quincunx: "Quincunx", semisextile: "Semi-sextile", conjunction: "Conjunction" };
  function orbText(o) { var m = Math.round(o * 60); return Math.floor(m / 60) + "°" + two(m % 60) + "′"; }
  function nameOf(key) { return W.NAMES[key] || key; }

  /* The aspect symbols and a small drawing kit, shared by the page's aspect grid, the aspect list and the saved SVG. */
  var SERIF = "'Times New Roman', Times, 'Liberation Serif', serif";
  var ASYM = {
    conjunction: '<circle cx="30" cy="70" r="14"/><path d="M40 60L80 20"/>',
    opposition: '<circle cx="22" cy="78" r="12"/><circle cx="78" cy="22" r="12"/><path d="M31 69L69 31"/>',
    trine: '<path d="M50 14L88 82H12Z"/>',
    square: '<rect x="18" y="18" width="64" height="64"/>',
    sextile: '<path d="M50 10V90M16 30L84 70M16 70L84 30"/>',
    quincunx: '<path d="M32 12V88M32 58L76 20"/>',
    semisextile: '<path d="M22 14L50 60L78 14M50 60V90"/>'
  };
  function kitFor(plate) {
    var pal = W.PAL[plate], ink = pal.ink;
    var ACOL = { conjunction: ink, opposition: pal.red, square: pal.red, trine: pal.blue, sextile: pal.sky, quincunx: pal.green, semisextile: pal.purple };
    function gl(key, cx, cy, col, size) {
      var s = size || 22;
      if (!W.GLYPH[key]) return "";
      return '<g transform="translate(' + (cx - s / 2) + " " + (cy - s / 2) + ") scale(" + (s / 100) + ')">' + W.GLYPH[key](col) + "</g>";
    }
    function asym(type, cx, cy, size) {
      var s = ASYM[type];
      if (!s) return "";
      return '<g transform="translate(' + (cx - size / 2) + " " + (cy - size / 2) + ") scale(" + (size / 100) + ')" fill="none" stroke="' + ACOL[type] + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' + s + "</g>";
    }
    function tag(key, cx, cy, size) {                        // a glyph, or AC / MC as letters
      if (key === "asc" || key === "mc") return '<text x="' + cx + '" y="' + (cy + size * 0.33) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + Math.round(size * 0.82) + '" font-weight="700" fill="' + ink + '">' + (key === "asc" ? "AC" : "MC") + "</text>";
      return gl(key, cx, cy, W.POINT_KEYS[key] ? pal.gray : pal[key], size);
    }
    function icon(type, px) {                                // a stand-alone symbol for lists and keys
      return '<svg class="asym" viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true" fill="none" stroke="' + ACOL[type] + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' + (ASYM[type] || "") + "</svg>";
    }
    return { pal: pal, ink: ink, ACOL: ACOL, gl: gl, asym: asym, tag: tag, icon: icon };
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  var uid = 0;

  function mount(box, cfg) {
    cfg = cfg || {};
    var id = ++uid;
    var plate = "paper";
    try { var sv = localStorage.getItem(KEY_PLATE); if (sv === "night" || sv === "paper") plate = sv; } catch (e) { /* private mode */ }
    var st = { input: cfg.input || null, houses: "placidus", aspects: true, points: true, chart: null, svg: "", open: {} };

    box.innerHTML =
      '<div class="sky-card" data-plate="' + plate + '">' +
      '<div class="sky-bar" role="toolbar" aria-label="Chart tools">' +
        '<div class="sky-group">' +
          '<button type="button" class="sky-btn" data-act="zoom" title="Enlarge the wheel"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="lb-l">Zoom</span><span class="lb-s">Zoom</span></button>' +
          '<button type="button" class="sky-btn" data-act="png" title="Picture of the wheel alone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="lb-l">Save PNG</span><span class="lb-s">PNG</span></button>' +
          '<button type="button" class="sky-btn" data-act="fullpng" title="Picture of the whole sheet: wheel, positions, houses, aspect grid and list"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="lb-l">Save Full PNG</span><span class="lb-s">Full PNG</span></button>' +
          '<button type="button" class="sky-btn" data-act="pdf" title="The whole sheet as a PDF; you can name the file before it is saved"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="lb-l">Save PDF</span><span class="lb-s">PDF</span></button>' +
          '<button type="button" class="sky-btn" data-act="svg" title="Vector file with the wheel and the data tables"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="lb-l">Save SVG</span><span class="lb-s">SVG</span></button>' +
        '</div>' +
        '<div class="sky-group sky-opts">' +
          '<div class="sky-seg" role="group" aria-label="Plate"><button type="button" data-plate="paper" aria-pressed="' + (plate === "paper") + '">Paper</button><button type="button" data-plate="night" aria-pressed="' + (plate === "night") + '">Night</button></div>' +
          '<label class="sky-sel">Houses <select data-opt="houses"><option value="placidus">Placidus</option><option value="equal">Equal</option><option value="whole">Whole sign</option></select></label>' +
          '<label class="sky-chk"><input type="checkbox" data-opt="aspects" checked> Aspects</label>' +
          '<label class="sky-chk"><input type="checkbox" data-opt="points" checked> Points</label>' +
        '</div>' +
      '</div>' +
      '<div class="sky-grid">' +
        '<figure class="sky-wheel" data-wheel></figure>' +
        '<div class="sky-side" data-side></div>' +
      '</div>' +
      '<div class="sky-extra" data-extra></div>' +
      '<p class="sky-links" data-links></p>' +
      '<p class="sky-fine" data-fine></p>' +
      '</div>';

    var card = box.querySelector(".sky-card"), wheel = box.querySelector("[data-wheel]"), side = box.querySelector("[data-side]"), extra = box.querySelector("[data-extra]"), links = box.querySelector("[data-links]"), fine = box.querySelector("[data-fine]");
    var timer = 0, modal = null, zoom = 1;

    function currentSvg(extra) {
      var o = { theme: plate, houses: st.houses, aspects: st.aspects, points: st.points, title: titleLines(st.input),
        label: "Chart wheel for " + longDate(st.input.ms, st.input.tz) };
      for (var k in extra) o[k] = extra[k];
      return W.render(st.chart, o);
    }

    /* The saved SVG: the wheel with its data under it (positions, Moon phase, houses, the aspect grid and the aspect list),
       all as live text and vector shapes, so the file stays sharp and searchable. The PNG stays the wheel alone. */
    function sheetSvg() {
      var c = st.chart, pal = W.PAL[plate], VB = W.VIEWBOX, night = plate === "night";
      var hasH = !!(c.houses && c.angles), cusps = hasH ? W.cuspsFor(c, st.houses) : null;
      var ink = pal.ink, head = pal.title, rule = night ? "#3a3f4d" : "#d5d8df", dim = night ? pal.grayDeg : "#6b7287";
      var kit = kitFor(plate), gl = kit.gl, asym = kit.asym, tag = kit.tag;
      var o = [], inp = st.input;
      function txt(x, y, s, size, fill, weight, anchor) {
        return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (weight ? ' font-weight="' + weight + '"' : "") +
          (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(s) + "</text>";
      }
      function line(x1, y1, x2, y2, col, w) { return '<path d="M' + x1 + " " + y1 + "L" + x2 + " " + y2 + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '" fill="none"/>'; }
      var xL = VB.x + 50, top = VB.y + VB.h + 46, RH = 33, yL;
      /* positions, left column */
      o.push(txt(xL, top, "Positions", 22, head, 700));
      var hy = top + 34;
      o.push(txt(xL + 40, hy, "Body", 16, dim, 700), txt(xL + 215, hy, "Position", 16, dim, 700), txt(xL + 332, hy, "Sign", 16, dim, 700));
      if (cusps) o.push(txt(xL + 490, hy, "House", 16, dim, 700, "end"));
      o.push(line(xL, hy + 10, xL + 490, hy + 10, rule, 1.5));
      yL = hy + 10;
      function prow(key, name, lon, retro, house) {
        var ty = yL + RH - 9, cy = yL + RH / 2;
        o.push(tag(key, xL + 14, cy, 22));
        o.push(txt(xL + 40, ty, name, 21, ink));
        o.push(txt(xL + 215, ty, E.dm(lon), 21, ink));
        if (retro) o.push(txt(xL + 304, ty, "R", 19, ink, 700));
        o.push(txt(xL + 332, ty, E.split(lon).sign, 21, ink));
        if (house) o.push(txt(xL + 490, ty, String(house), 21, ink, null, "end"));
        yL += RH;
      }
      c.bodies.forEach(function (b) { prow(b.key, b.name, b.lon, b.retro, cusps ? W.houseOf(b.lon, cusps) : 0); });
      if (c.angles) {
        o.push(line(xL, yL + 4, xL + 490, yL + 4, rule, 1)); yL += 8;
        var extra = [["asc", c.angles.asc], ["mc", c.angles.mc], ["vertex", c.angles.vertex], ["ep", c.angles.ep]];
        if (c.points && c.points.fortune != null) extra.push(["fortune", c.points.fortune]);
        extra.forEach(function (x) { prow(x[0], nameOf(x[0]), x[1], false, W.houseOf(x[1], cusps)); });
      }

      /* right column: Moon, houses, aspect grid */
      var xR = 40, yR = top, m = c.moon;
      o.push(moonSvg(m, 70).replace("<svg ", '<svg x="' + xR + '" y="' + (yR - 14) + '" '));
      o.push(txt(xR + 90, yR + 14, (m.waxing ? "Waxing" : "Waning") + " Moon, " + (m.illum * 100).toFixed(2) + "%", 22, ink, 700));
      o.push(txt(xR + 90, yR + 40, m.name, 20, ink));
      if (m.next) o.push(txt(xR + 90, yR + 64, "Next " + m.next.name + ": " + dayText(m.next.ms), 17, dim));
      yR += 100;
      if (cusps) {
        o.push(txt(xR, yR, "Houses (" + (st.houses === "placidus" ? (c.system || "Placidus") : st.houses === "equal" ? "Equal" : "Whole sign") + ")", 22, head, 700));
        o.push(line(xR, yR + 10, xR + 490, yR + 10, rule, 1.5));
        cusps.forEach(function (x, i) {
          var col = i < 6 ? 0 : 1, row = i % 6, bx = xR + col * 250, by = yR + 40 + row * 29;
          o.push(txt(bx + 24, by, String(i + 1), 19, dim, 700, "end"), txt(bx + 36, by, E.dm(x), 20, ink), txt(bx + 120, by, E.split(x).sign, 20, ink));
        });
        yR += 40 + 6 * 29 + 22;
      }
      var keys = c.bodies.filter(function (b) { return !b.extra; }).map(function (b) { return b.key; });
      if (c.angles) keys.push("asc", "mc");
      var pair = {};
      (c.aspects || []).forEach(function (a) { pair[a.a + "|" + a.b] = a.type; pair[a.b + "|" + a.a] = a.type; });
      var cell = Math.min(38, Math.floor(490 / keys.length));
      o.push(txt(xR, yR, "Aspect grid", 22, head, 700));
      var gx = xR, gy = yR + 22;
      keys.forEach(function (k, i) {
        for (var j = 0; j <= i; j++) {
          var cx = gx + j * cell, cy = gy + i * cell;
          o.push('<rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '" fill="none" stroke="' + rule + '" stroke-width="1.2"/>');
          if (j === i) o.push(tag(k, cx + cell / 2, cy + cell / 2, Math.round(cell * 0.6)));
          else { var t = pair[k + "|" + keys[j]]; if (t) o.push(asym(t, cx + cell / 2, cy + cell / 2, Math.round(cell * 0.56))); }
        }
      });
      yR = gy + keys.length * cell + 24;

      /* aspect list, three columns across the full width */
      var yA = Math.max(yL, yR) + 40;
      var asp = (c.aspects || []).slice().sort(function (a, b) { return a.orb - b.orb; });
      if (asp.length) {
        o.push(txt(xL, yA, "Aspects (" + asp.length + ")", 22, head, 700));
        o.push(line(xL, yA + 10, 510, yA + 10, rule, 1.5));
        var per = Math.ceil(asp.length / 3), cw = 346;
        asp.forEach(function (a, i) {
          var col = Math.floor(i / per), row = i % per, bx = xL + col * cw, by = yA + 44 + row * 30;
          o.push(asym(a.type, bx + 11, by - 7, 20));
          var label = nameOf(a.a) + " " + (ASPECT_NAME[a.type] || a.type).toLowerCase() + " " + nameOf(a.b);
          var fs = Math.max(14, Math.min(18, Math.floor(18 * 236 / (label.length * 18 * 0.53))));   // long names shrink so they never touch the orb
          o.push(txt(bx + 30, by, label, fs, ink));
          o.push(txt(bx + cw - 22, by, orbText(a.orb), 17, dim, null, "end"));
        });
        yA += 44 + per * 30;
      }

      /* key and footnote */
      yA += 26;
      var kx = xL, types = ["conjunction", "sextile", "square", "trine", "opposition", "quincunx", "semisextile"];
      types.forEach(function (t) {
        o.push(asym(t, kx + 11, yA - 7, 20), txt(kx + 28, yA, ASPECT_NAME[t], 16, dim));
        kx += 28 + ASPECT_NAME[t].length * 9 + 26;
      });
      yA += 34;
      o.push(txt(0, yA, "\u00a9TwelveCubed. Tropical zodiac, geocentric apparent positions" + (hasH ? ", " + (st.houses === "placidus" ? (c.system || "Placidus") : st.houses === "equal" ? "Equal" : "Whole-sign") + " houses" : "") + ". For reflection, not prediction.", 16, dim, null, "middle"));
      var H = Math.ceil(yA + 30 - VB.y);

      var wheel = currentSvg({}).replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg x="' + VB.x + '" y="' + VB.y + '" width="' + VB.w + '" height="' + VB.h + '" ');
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + VB.w + '" height="' + H + '" viewBox="' + VB.x + " " + VB.y + " " + VB.w + " " + H + '" role="img" aria-label="' +
        esc("Chart wheel and data for " + longDate(st.input.ms, st.input.tz)) + '" style="font-family:Arial, Helvetica, \'Liberation Sans\', sans-serif">' +
        "<title>" + esc("Chart wheel and data for " + longDate(st.input.ms, st.input.tz)) + "</title>" +
        '<rect x="' + VB.x + '" y="' + VB.y + '" width="' + VB.w + '" height="' + H + '" fill="' + pal.bg + '"/>' + wheel + o.join("") + "</svg>";
    }

    function render() {
      if (!st.input) return;
      st.chart = E.chart({ ms: st.input.ms, lat: st.input.lat, lon: st.input.lon });
      st.svg = currentSvg({});
      wheel.innerHTML = st.svg;
      var hasH = !!st.chart.houses;
      box.querySelector('[data-opt="houses"]').parentNode.hidden = !hasH;
      side.innerHTML = sideHtml();
      extra.innerHTML = extraHtml();
      links.innerHTML = linksHtml();
      fine.textContent = fineText();
      if (modal && modal.open) fillModal();
    }

    function fineText() {
      var i = st.input, t = [];
      if (i.lat == null) t.push("No time or place was given, so the chart shows the sky at 12:00 UT and no houses. Add a time and place on the finder for the Rising and the houses.");
      if (i.guess) t.push("Place not known from your time zone, so New York is used.");
      else if (cfg.mode === "now" && i.place) t.push("Drawn for " + i.place + ", chosen from your device's time zone.");
      t.push("Tropical zodiac, geocentric apparent positions" + (st.chart.houses ? ", " + (st.houses === "placidus" ? (st.chart.system || "Placidus") : st.houses === "equal" ? "Equal" : "Whole-sign") + " houses" : "") + ". Chiron comes from our own orbit table (1900 to 2100). For reflection, not prediction.");
      t.push("If Windows refuses to open a saved PNG, right-click it, choose Properties and tick Unblock.");
      return t.join(" ");
    }

    function sideHtml() {
      var c = st.chart, h = "", cusps = c.houses ? W.cuspsFor(c, st.houses) : null, inp = st.input;
      var cols = cusps ? 5 : 4;
      h += '<table class="sky-table"><caption class="sr">Positions of the planets and points</caption><thead><tr><th scope="col">Body</th><th scope="col">Position</th><th scope="col"><span class="sr">Retrograde</span></th><th scope="col">Sign</th>' + (cusps ? '<th scope="col">House</th>' : "") + "</tr></thead><tbody>";
      c.bodies.forEach(function (b) {
        var gray = !!W.POINT_KEYS[b.key], col = gray ? "#8d93a3" : W.PAL.paper[b.key];
        h += "<tr><th scope=\"row\"><span class=\"nm\" style=\"color:" + col + "\">" + glyph(b.key, col) + "</span> " + esc(b.name) + "</th><td>" + E.dm(b.lon) + "</td><td>" + (b.retro ? '<abbr title="Retrograde">R</abbr>' : "") +
          "</td><td>" + esc(b.sign) + "</td>" + (cusps ? "<td>" + W.houseOf(b.lon, cusps) + "</td>" : "") + "</tr>";
      });
      if (c.angles) {
        h += '<tr class="sep"><td colspan="' + cols + '"></td></tr>';
        var extra = [["asc", c.angles.asc], ["mc", c.angles.mc], ["vertex", c.angles.vertex], ["ep", c.angles.ep]];
        if (c.points && c.points.fortune != null) extra.push(["fortune", c.points.fortune]);
        extra.forEach(function (x) {
          var s = E.split(x[1]);
          h += "<tr><th scope=\"row\">" + (W.GLYPH[x[0]] ? '<span class="nm" style="color:#8d93a3">' + glyph(x[0], "#8d93a3") + "</span> " : '<span class="nm nm-t">' + (x[0] === "asc" ? "AC" : "MC") + "</span> ") + esc(nameOf(x[0])) + "</th><td>" +
            E.dm(x[1]) + "</td><td></td><td>" + esc(s.sign) + "</td><td>" + W.houseOf(x[1], cusps) + "</td></tr>";
        });
      }
      h += "</tbody></table>";

      var m = c.moon;
      h += '<div class="sky-moon">' + moonSvg(m, 64) + '<div><p class="sm-a">' + (m.waxing ? "Waxing" : "Waning") + " Moon, " + (m.illum * 100).toFixed(2) + '%</p><p class="sm-b">' + esc(m.name) + "</p>" +
        (m.next ? '<p class="sm-c">Next ' + esc(m.next.name) + ": " + esc(dayText(m.next.ms)) + "</p>" : "") + "</div></div>";

      return h;
    }

    /* Houses, Aspects and the Aspect grid. Wide screens (computer): all three are open, side by side, the grid on the left.
       Narrow screens (phone): three closed dropdowns, the grid last. What the reader opens or closes is kept across refreshes. */
    function isWide() { try { return !window.matchMedia("(max-width: 62rem)").matches; } catch (e) { return true; } }
    var ASPECT_ORDER = ["conjunction", "sextile", "square", "trine", "opposition", "quincunx", "semisextile"];

    function gridSvg(kit) {
      var c = st.chart, rule = plate === "night" ? "#3a3f4d" : "#d5d8df";
      var keys = c.bodies.filter(function (b) { return !b.extra; }).map(function (b) { return b.key; });
      if (c.angles) keys.push("asc", "mc");
      var pair = {};
      (c.aspects || []).forEach(function (a) { pair[a.a + "|" + a.b] = a; pair[a.b + "|" + a.a] = a; });
      var cell = 40, n = keys.length, o = [];
      keys.forEach(function (k, i) {
        for (var j = 0; j <= i; j++) {
          var x = j * cell, y = i * cell;
          o.push('<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="none" stroke="' + rule + '" stroke-width="1.5"/>');
          if (j === i) o.push(kit.tag(k, x + cell / 2, y + cell / 2, 26));
          else {
            var a = pair[k + "|" + keys[j]];
            if (a) o.push("<g><title>" + esc(nameOf(a.a) + " " + (ASPECT_NAME[a.type] || a.type).toLowerCase() + " " + nameOf(a.b) + ", " + orbText(a.orb)) + "</title>" + kit.asym(a.type, x + cell / 2, y + cell / 2, 22) + "</g>");
          }
        }
      });
      return '<svg class="sky-gridsvg" viewBox="-1 -1 ' + (n * cell + 2) + " " + (n * cell + 2) + '" role="img" aria-label="Aspect grid. Each square shows the aspect between two points; the same aspects are listed in words under Aspects.">' + o.join("") + "</svg>";
    }

    function extraHtml() {
      var c = st.chart, kit = kitFor(plate), cusps = c.houses ? W.cuspsFor(c, st.houses) : null, h = "", n = 0, wide = isWide();
      function det(k, cls, title, body) {
        var open = st.open[k] != null ? st.open[k] : wide;
        n++;
        return '<details class="sky-more' + (cls ? " " + cls : "") + '" data-k="' + k + '"' + (open ? " open" : "") + "><summary>" + title + "</summary>" + body + "</details>";
      }
      if (cusps) {
        var ol = '<ol class="sky-houses">';
        cusps.forEach(function (x, i) { var s = E.split(x); ol += "<li><span>" + (i + 1) + "</span> " + E.dm(x) + " " + esc(s.sign) + "</li>"; });
        h += det("houses", "", "Houses (" + esc(st.houses === "placidus" ? (c.system || "Placidus") : st.houses === "equal" ? "Equal" : "Whole sign") + ")", ol + "</ol>");
      }
      var asp = (c.aspects || []).slice().sort(function (a, b) { return a.orb - b.orb; });
      if (asp.length) {
        var ul = '<ul class="sky-aspects">';
        asp.forEach(function (a) {
          ul += "<li>" + kit.icon(a.type, 16) + esc(nameOf(a.a)) + " " + esc((ASPECT_NAME[a.type] || a.type).toLowerCase()) + " " + esc(nameOf(a.b)) + " <em>" + orbText(a.orb) + "</em></li>";
        });
        h += det("aspects", "", "Aspects (" + asp.length + ")", ul + "</ul>");
        var key = '<ul class="sky-key" aria-label="Aspect symbols">';
        ASPECT_ORDER.forEach(function (t) { key += "<li>" + kit.icon(t, 16) + ASPECT_NAME[t] + "</li>"; });
        h += det("grid", "sky-more--grid", "Aspect grid", gridSvg(kit) + key + "</ul>");
      }
      extra.setAttribute("data-n", String(n));
      return h;
    }

    function linksHtml() {
      if (cfg.mode !== "now") return "";
      return '<button type="button" class="linklike" data-act="where">Use my exact location</button> <span aria-hidden="true">&middot;</span> <a href="' + TC.ROOT + 'find.html">Another date, time or place</a>';
    }

    /* ---------- zoom ---------- */
    function fillModal() {
      var view = modal.querySelector(".sky-zoomview");
      view.innerHTML = currentSvg({});
      modal.querySelector(".sky-zoomview svg").style.width = "calc(" + zoom + " * min(100%, 1100px))";
      modal.querySelector("[data-z]").textContent = Math.round(zoom * 100) + "%";
    }
    function openZoom() {
      if (!modal) {
        modal = document.createElement("dialog");
        modal.className = "sky-modal";
        modal.setAttribute("aria-label", "Chart wheel, enlarged");
        modal.innerHTML = '<div class="sky-mbar"><span class="sky-mt">Chart wheel</span><span class="sky-mz"><button type="button" data-zm="-" aria-label="Zoom out">&minus;</button><output data-z>100%</output><button type="button" data-zm="+" aria-label="Zoom in">+</button></span><button type="button" class="sky-close" data-zm="x" aria-label="Close">&times;</button></div><div class="sky-zoomview" tabindex="0"></div>';
        document.body.appendChild(modal);
        modal.addEventListener("click", function (ev) {
          var b = ev.target.closest("[data-zm]");
          if (b) {
            var z = b.getAttribute("data-zm");
            if (z === "x") modal.close();
            else { zoom = Math.max(1, Math.min(4, zoom + (z === "+" ? 0.5 : -0.5))); fillModal(); }
          } else if (ev.target === modal) modal.close();
        });
      }
      zoom = 1;
      fillModal();
      if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
    }

    /* ---------- saving ---------- */
    function fileStem() {
      var p = parts(st.input.ms, "UTC");
      var d = new Date(st.input.ms);
      return "twelve-cubed-chart-" + d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + "-" + two(d.getUTCHours()) + two(d.getUTCMinutes()) + (p ? "" : "");
    }
    function savePng() {
      var scale = 2, w = Math.round(W.VIEWBOX.w * scale), h = Math.round(W.VIEWBOX.h * scale);
      var svg = currentSvg({}).replace("<svg ", '<svg width="' + w + '" height="' + h + '" ');
      var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        var cx = cv.getContext("2d");
        cx.fillStyle = plate === "night" ? "#000" : "#fff"; cx.fillRect(0, 0, w, h);
        cx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { if (b) download(b, fileStem() + ".png"); }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(url); };
      img.src = url;
    }
    /* The whole sheet (wheel + data tables + aspect grid) drawn to a canvas: for Full PNG and PDF.
       The size is capped (12 megapixels, 8000 px a side) so phones can do it too. */
    function sheetCanvas(cb) {
      var svg = sheetSvg(), m = svg.match(/<svg[^>]*?\swidth="([\d.]+)"\s+height="([\d.]+)"/);
      if (!m) return;
      var w0 = +m[1], h0 = +m[2];
      var k = Math.min(2.2, Math.sqrt(12e6 / (w0 * h0)), 8000 / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
      svg = svg.replace(/(<svg[^>]*?)\swidth="[\d.]+"\s+height="[\d.]+"/, '$1 width="' + w + '" height="' + h + '"');
      var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        var cx = cv.getContext("2d");
        cx.fillStyle = plate === "night" ? "#000" : "#fff"; cx.fillRect(0, 0, w, h);
        cx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cb(cv);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fine.textContent = "This browser could not draw the sheet. Try Save SVG instead."; };
      img.src = url;
    }
    function saveFullPng() {
      sheetCanvas(function (cv) { cv.toBlob(function (b) { if (b) download(b, fileStem() + "-full.png"); }, "image/png"); });
    }

    /* A one-page PDF: the sheet as a high-resolution JPEG inside a hand-written PDF container (no library, nothing sent anywhere). */
    function makePdf(jpeg, pw, ph, title) {
      var enc = new TextEncoder(), chunks = [], offs = [], len = 0;
      function put(x) { var b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); len += b.length; }
      function obj(n, body) { offs[n] = len; put(n + " 0 obj\n" + body + "\nendobj\n"); }
      var W = 595, H = Math.round(595 * ph / pw * 100) / 100;                 // one page, A4 wide, as tall as the sheet needs
      put("%PDF-1.4\n%âãÏÓ\n");
      obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
      obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
      obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
      offs[4] = len;
      put("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + pw + " /Height " + ph + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>\nstream\n");
      put(jpeg); put("\nendstream\nendobj\n");
      var content = "q " + W + " 0 0 " + H + " 0 0 cm /Im0 Do Q";
      obj(5, "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
      var safe = String(title).replace(/[()\\]/g, "");
      obj(6, "<< /Title (" + safe + ") /Creator (TwelveCubed) /Producer (TwelveCubed) >>");
      var xref = len, x = "xref\n0 7\n0000000000 65535 f \n";
      for (var i = 1; i <= 6; i++) x += ("0000000000" + offs[i]).slice(-10) + " 00000 n \n";
      put(x + "trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
      return new Blob(chunks, { type: "application/pdf" });
    }
    function buildPdf(done) {
      sheetCanvas(function (cv) {
        cv.toBlob(function (jb) {
          if (!jb) return;
          jb.arrayBuffer().then(function (buf) { done(makePdf(new Uint8Array(buf), cv.width, cv.height, "\u00a9TwelveCubed chart " + longDate(st.input.ms, st.input.tz))); });
        }, "image/jpeg", 0.94);
      });
    }
    /* Ask for the file name first, so the PDF can be named before it is saved. A real "Save as" window where the browser has one,
       otherwise a small dialog of our own. */
    function askName(def, ext, go) {
      var dlg = document.createElement("dialog");
      dlg.className = "sky-modal sky-ask"; dlg.setAttribute("data-plate", plate); dlg.setAttribute("aria-label", "Name the file");
      dlg.innerHTML = '<form method="dialog" class="sky-askform"><label>Name the file<input type="text" name="n" autocomplete="off" spellcheck="false"></label>' +
        '<p class="sky-askhint">It is saved to your usual downloads folder as <b data-ext></b>.</p>' +
        '<div class="sky-askbtns"><button type="button" data-no>Cancel</button><button type="submit" class="go">Save</button></div></form>';
      document.body.appendChild(dlg);
      var inp = dlg.querySelector("input"), form = dlg.querySelector("form");
      inp.value = def; dlg.querySelector("[data-ext]").textContent = "name" + ext;
      function close() { try { dlg.close(); } catch (e) { /* already closed */ } dlg.remove(); }
      dlg.querySelector("[data-no]").addEventListener("click", close);
      dlg.addEventListener("cancel", function () { dlg.remove(); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var n = inp.value.replace(/[\\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().replace(/\.+$/, "");
        if (!n) n = def;
        if (n.toLowerCase().slice(-ext.length) !== ext) n += ext;
        close(); go(n);
      });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
      inp.focus(); inp.select();
    }
    function savePdf() {
      var name = fileStem() + ".pdf";
      function viaDialog() { askName(fileStem(), ".pdf", function (n) { buildPdf(function (blob) { download(blob, n); }); }); }
      if (window.showSaveFilePicker) {
        window.showSaveFilePicker({ suggestedName: name, types: [{ description: "PDF file", accept: { "application/pdf": [".pdf"] } }] })
          .then(function (fh) {
            buildPdf(function (blob) { fh.createWritable().then(function (w) { return w.write(blob).then(function () { return w.close(); }); }); });
          })
          .catch(function (e) { if (!e || e.name !== "AbortError") viaDialog(); });
      } else viaDialog();
    }
    function saveSvg() {
      download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + sheetSvg()], { type: "image/svg+xml" }), fileStem() + ".svg");
    }

    /* ---------- wiring ---------- */
    box.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-act],button[data-plate]");   // not the card itself, which also carries data-plate
      if (!b || !box.contains(b)) return;
      var act = b.getAttribute("data-act");
      if (act === "zoom") openZoom();
      else if (act === "png") savePng();
      else if (act === "fullpng") saveFullPng();
      else if (act === "pdf") savePdf();
      else if (act === "svg") saveSvg();
      else if (act === "where") {
        if (!navigator.geolocation) { fine.textContent = "This browser cannot share a location."; return; }
        fine.textContent = "Asking your device for its location…";
        navigator.geolocation.getCurrentPosition(function (p) {
          st.input = { ms: Date.now(), lat: p.coords.latitude, lon: p.coords.longitude, tz: deviceZone() || "UTC", place: "your location" };
          render();
        }, function () { fine.textContent = "The location was not shared, so the chart stays as it was."; }, { maximumAge: 600000, timeout: 15000 });
      } else if (b.hasAttribute("data-plate")) {
        plate = b.getAttribute("data-plate");
        card.setAttribute("data-plate", plate);
        box.querySelectorAll(".sky-seg button").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-plate") === plate ? "true" : "false"); });
        try { localStorage.setItem(KEY_PLATE, plate); } catch (e) { /* ignore */ }
        wheel.innerHTML = currentSvg({});
        extra.innerHTML = extraHtml();
        if (modal && modal.open) fillModal();
      }
    });
    box.addEventListener("click", function (ev) {            // remember what the reader opened or closed
      var s = ev.target.closest && ev.target.closest(".sky-extra summary");
      if (!s) return;
      var d = s.parentNode;
      setTimeout(function () { st.open[d.getAttribute("data-k")] = d.open; }, 0);
    });
    box.addEventListener("change", function (ev) {
      var o = ev.target.getAttribute && ev.target.getAttribute("data-opt");
      if (!o) return;
      st[o] = ev.target.type === "checkbox" ? ev.target.checked : ev.target.value;
      render();
    });

    if (cfg.mode === "now") {
      timer = setInterval(function () {
        if (document.hidden || !st.input) return;
        st.input.ms = Date.now();
        render();
      }, 60000);
    }

    if (st.input) render();
    return {
      update: function (input) { st.input = input; render(); },
      destroy: function () { clearInterval(timer); if (modal) modal.remove(); }
    };
  }

  window.TCSky = { mount: mount, now: now, defaultPlace: defaultPlace, titleLines: titleLines };
})();
