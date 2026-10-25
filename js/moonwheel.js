/* The Moon wheel: one month of the Moon as a single round picture (an SVG that js/mooncal.js turns into a PNG).

   From the rim inwards:
     the degree ring, the twelve signs (Aries at the left, the signs running anticlockwise as on a chart), the planets where they stand
     in the middle of the month, then the Moon of each day, one disc a day, placed at her true place in the zodiac at noon and spiralling
     inward as the month goes on (she circles the sky in about 27 days, so the last days of a long month lie just inside the first).
     The four main phases are ringed in gold at their exact moment, and an eclipse carries its own small symbol.
   In the middle: the Earth as the celestial clock draws it (at the Full Moon or the New Moon, with the night side and the places where
   the Sun and the Moon stand overhead), or Sol and Luna, the Rota, the TwelveCubed mark, or the month written out.
   Under the wheel: the phases and the eclipses of the month, with their date, time and degree.

   window.TCMoonWheel.build(model, { south, light, centre, zone }) -> Promise of { w, h, bg, svg }
   model: TCMoonCal.compute(...). Needs TCMoonCal.kit, TCEphem, TCWheel, TC_GLYPHS; the Earth also needs data/land.js and js/astrolabe.js
   (loaded here when asked for), Sol and the Rota need data/art.js (loaded by js/mooncal.js). Nothing is sent anywhere. */
(function () {
  "use strict";
  var E = window.TCEphem, W = window.TCWheel, GL = window.TC_GLYPHS || {}, K = window.TCMoonCal.kit;
  var RAD = Math.PI / 180, SIGNS = K.SIGNS;
  var BASE = (function () { var c = document.currentScript && document.currentScript.src; return c ? c.replace(/js\/moonwheel\.js(\?.*)?$/, "") : ""; })();
  var LOGO = "<circle r=\"237.5\" fill=\"#00a2e8\"/><path d=\"M-160.79 0.00L-216.79 -96.99A237.5 237.5 0 0 0 -216.79 96.99Z\" fill=\"#ff7f27\"/><path d=\"M160.79 0.00L216.79 -96.99A237.5 237.5 0 0 1 216.79 96.99Z\" fill=\"#22b14c\"/><path d=\"M0.00 -222.50L-48.06 -139.25L48.06 -139.25Z\" fill=\"#73fbfd\"/><path d=\"M-192.69 111.25L-96.56 111.25L-144.63 28.00Z\" fill=\"#3f48cc\"/><path d=\"M192.69 111.25L144.63 28.00L96.56 111.25Z\" fill=\"#fff200\"/><path d=\"M-0.00 222.50L48.06 139.25L-48.06 139.25Z\" fill=\"#ed1c24\"/><path d=\"M-192.69 -111.25L-144.63 -28.00L-96.56 -111.25Z\" fill=\"#3282f6\"/><path d=\"M192.69 -111.25L96.56 -111.25L144.63 -28.00Z\" fill=\"#b5e61d\"/><path d=\"M0.00 -278.50L-241.19 139.25L241.19 139.25ZM0.00 -222.50L-192.69 111.25L192.69 111.25Z\" fill=\"#ffffff\" fill-rule=\"evenodd\"/><path d=\"M-0.00 278.50L241.19 -139.25L-241.19 -139.25ZM-0.00 222.50L192.69 -111.25L-192.69 -111.25Z\" fill=\"#ffffff\" fill-rule=\"evenodd\"/><circle r=\"251.5\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"28.0\"/><path d=\"M128.46 -0.00L64.23 -111.25L-64.23 -111.25L-128.46 -0.00L-64.23 111.25L64.23 111.25Z\" fill=\"#ffffff\"/><path d=\"M128.46 -0.00L64.23 -111.25L-64.23 -111.25L-128.46 -0.00L-64.23 111.25L64.23 111.25Z\" fill=\"none\" stroke=\"#7a8a96\" stroke-width=\"1.2\"/><circle r=\"73.5\" fill=\"#000\"/><circle r=\"77.25\" fill=\"none\" stroke=\"#fff200\" stroke-width=\"7.5\"/>";                       // the TwelveCubed mark, in a box from -285 to 285

  var PW = 2400, PH = 3140, CX = 1200, CY = 1530;
  var R_RIM = 1120, R_BAND0 = 1092, R_BAND1 = 992, R_PL = 944, R_S0 = 830, R_S1 = 705, R_IN = 614, R_MED = 600;
  var SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', serif";
  var PLANETS = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

  function f(n) { return (Math.round(n * 10) / 10).toString(); }
  function pos(r, lon) { var a = lon * RAD; return [CX - r * Math.cos(a), CY + r * Math.sin(a)]; }        // longitude 0 at the left, growing anticlockwise
  function pt(p) { return f(p[0]) + " " + f(p[1]); }
  function loadScript(rel, test) {
    if (test()) return Promise.resolve(true);
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = BASE + rel; el.onload = function () { resolve(true); }; el.onerror = function () { reject(new Error("Could not load " + rel)); };
      document.head.appendChild(el);
    });
  }
  function earthLibs() {
    return loadScript("data/land.js", function () { return window.TC_LAND; })
      .then(function () { return loadScript("js/astrolabe.js", function () { return window.TCAstrolabe && window.TCAstrolabe.earth; }); });
  }

  function build(model, o) {
    var light = !!o.light, south = !!o.south, kind = o.centre || "earth-full", tz = model.tz;
    var P = light ? { bg: "#eef1f8", ink: "#08104a", dim: "#4c5688", rule: "#b9c1dc", accent: "#ad6100", gold: "#c77900", plate: "#e4e9f6", glow: "rgba(173,97,0,0.10)" }
                  : { bg: "#08104a", ink: "#eaf1ee", dim: "#aeb9da", rule: "#2a3480", accent: "#ffa31a", gold: "#ffb21c", plate: "#0c1660", glow: "rgba(255,166,38,0.13)" };
    var PAL = W.PAL[light ? "paper" : "night"];
    var EL = light ? ["#c9283e", "#8a6a10", "#0f8d93", "#2a35c8"] : ["#ff6a7c", "#e0bb55", "#58d2d6", "#8a97ff"];
    var EDGE = light ? "#08104a" : "#aeb9da", GOLDP = light ? "#e08a00" : "#ffb21c";
    var span = model.last - model.first, mid = Math.round((model.first + model.last) / 2);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var title = months[model.m] + " " + model.y;
    var dateF = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
    var o_ = [], id = 0;

    function txt(x, y, s, size, fill, weight, anchor, extra) {
      return '<text x="' + f(x) + '" y="' + f(y) + '" font-size="' + size + '" fill="' + fill + '"' + (weight ? ' font-weight="' + weight + '"' : "") +
        (anchor ? ' text-anchor="' + anchor + '"' : "") + (extra || "") + ">" + K.esc(s) + "</text>";
    }
    function g(x, y, size, inner) { return '<g transform="translate(' + f(x - size / 2) + " " + f(y - size / 2) + ") scale(" + (size / 100).toFixed(4) + ')">' + inner + "</g>"; }
    function planet(key, x, y, size, col) { return g(x, y, size, W.GLYPH[key](col)); }
    function sign(idx, x, y, size, col) { return g(x, y, size, '<path d="' + (GL[SIGNS[idx]] || "") + '" fill="' + col + '"/>'); }
    function ec(body, kd, x, y, size) { return g(x, y, size, '<g transform="translate(50 50)">' + K.eclipseInner(body, kd, EDGE, GOLDP) + "</g>"); }
    function moon(info, cx, cy, r, ring) {
      var d = K.moonPath(info), flip = K.flipFor(info, south) ? "scale(-1 1)" : "";
      return '<g transform="translate(' + f(cx) + " " + f(cy) + ") scale(" + (r / 40).toFixed(3) + ')"><circle r="40" fill="' + K.MOON_DARK + '" stroke="' + (light ? "#08104a" : K.MOON_EDGE) + '" stroke-width="2"/>' +
        (d ? '<path d="' + d + '" fill="' + K.MOON_LIT + '"' + (flip ? ' transform="' + flip + '"' : "") + "/>" : "") +
        (ring ? '<circle r="46" fill="none" stroke="' + P.gold + '" stroke-width="4.5"/>' : "") + "</g>";
    }
    function wedge(r0, r1, l0, l1) {
      var a = pos(r1, l0), b = pos(r1, l1), c = pos(r0, l1), d = pos(r0, l0);
      return "M" + pt(a) + "A" + r1 + " " + r1 + " 0 0 0 " + pt(b) + "L" + pt(c) + "A" + r0 + " " + r0 + " 0 0 1 " + pt(d) + "Z";
    }
    function circ(r, extra) { return '<circle cx="' + CX + '" cy="' + CY + '" r="' + r + '" ' + extra + "/>"; }

    /* ---- the plate and the header ---- */
    o_.push('<defs><radialGradient id="mwglow" cx="' + CX + '" cy="' + CY + '" r="1300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + P.glow.replace(/[\d.]+\)$/, "0.30)") + '"/><stop offset="0.55" stop-color="' + P.glow + '"/><stop offset="1" stop-color="' + P.glow.replace(/[\d.]+\)$/, "0)") + '"/></radialGradient>' +
      '<clipPath id="mwmed"><circle cx="' + CX + '" cy="' + CY + '" r="' + R_MED + '"/></clipPath></defs>');
    o_.push('<rect width="' + PW + '" height="' + PH + '" fill="' + P.bg + '"/>');
    o_.push('<rect width="' + PW + '" height="' + PH + '" fill="url(#mwglow)"/>');
    o_.push('<rect x="34" y="34" width="' + (PW - 68) + '" height="' + (PH - 68) + '" fill="none" stroke="' + P.rule + '" stroke-width="3"/>');
    o_.push(txt(110, 112, "THE MOON WHEEL", 32, P.accent, 600, null, ' letter-spacing="10"'));
    o_.push(txt(106, 246, title, 124, P.ink, 400));
    o_.push(txt(112, 304, "Where the Moon stood each day, round the zodiac · times in " + model.zone, 30, P.dim, 400, null, ' font-style="italic"'));
    o_.push('<g transform="translate(2170 200) scale(' + (190 / 570).toFixed(4) + ')">' + LOGO + "</g>");

    /* ---- the signs and the degree ring ---- */
    for (var i = 0; i < 12; i++) {
      o_.push('<path d="' + wedge(R_BAND1, R_BAND0, i * 30, i * 30 + 30) + '" fill="' + EL[i % 4] + '" fill-opacity="' + (light ? 0.13 : 0.15) + '"/>');
      var gp = pos((R_BAND0 + R_BAND1) / 2, i * 30 + 15);
      o_.push(sign(i, gp[0], gp[1], 66, EL[i % 4]));
      var a = pos(R_BAND1, i * 30), b = pos(R_RIM, i * 30);
      o_.push('<path d="M' + pt(a) + "L" + pt(b) + '" stroke="' + P.rule + '" stroke-width="3"/>');
    }
    o_.push(circ(R_RIM, 'fill="none" stroke="' + P.rule + '" stroke-width="3"'), circ(R_BAND0, 'fill="none" stroke="' + P.rule + '" stroke-width="2"'), circ(R_BAND1, 'fill="none" stroke="' + P.rule + '" stroke-width="3"'));
    var ticks = "";
    for (var dg = 0; dg < 360; dg++) {
      if (dg % 30 === 0) continue;
      var len = dg % 10 === 0 ? 28 : dg % 5 === 0 ? 19 : 10, t0 = pos(R_RIM, dg), t1 = pos(R_RIM - len, dg);
      ticks += "M" + pt(t0) + "L" + pt(t1);
    }
    o_.push('<path d="' + ticks + '" stroke="' + P.dim + '" stroke-width="1.6" stroke-opacity="0.8" fill="none"/>');

    /* ---- the planets of mid-month, kept apart where they crowd ---- */
    var pl = PLANETS.map(function (k) { return { k: k, lon: E.lonOf(k, mid), show: 0 }; }).sort(function (x, y) { return x.lon - y.lon; });
    pl.forEach(function (p) { p.show = p.lon; });
    for (var pass = 0; pass < 60; pass++) {
      for (var j = 0; j < pl.length; j++) {
        var n2 = pl[(j + 1) % pl.length], gap = ((n2.show - pl[j].show) + 360) % 360;
        if (gap < 6.2) { var need = (6.2 - gap) / 2 + 0.01; pl[j].show -= need; n2.show += need; }
      }
    }
    pl.forEach(function (p) {
      var a2 = pos(R_BAND1, p.lon), b2 = pos(R_PL + 26, p.show), c2 = pos(R_PL, p.show);
      o_.push('<path d="M' + pt(a2) + "L" + pt(b2) + '" stroke="' + P.dim + '" stroke-width="2" stroke-opacity="0.75"/>' + '<circle cx="' + f(a2[0]) + '" cy="' + f(a2[1]) + '" r="4.5" fill="' + P.dim + '"/>');
      o_.push(planet(p.k, c2[0], c2[1], 54, PAL[p.k] || P.ink));
    });

    /* ---- the Moon's month: a faint trail, then one disc a day ---- */
    var trail = "";
    for (var tms = model.first; tms <= model.last; tms += 3 * 3600000) {
      var tp = pos(R_S0 + (R_S1 - R_S0) * ((tms - model.first) / span), E.lonOf("moon", tms));
      trail += (trail ? "L" : "M") + pt(tp);
    }
    o_.push('<path d="' + trail + '" fill="none" stroke="' + P.dim + '" stroke-width="3.2" stroke-opacity="0.7" stroke-dasharray="1 13" stroke-linecap="round"/>');
    var lap = 0, prevLon = null;
    model.days.forEach(function (day) {
      var fr = (day.moon.ms - model.first) / span, r = R_S0 + (R_S1 - R_S0) * fr, c = pos(r, day.moon.lon), dr = day.quarter ? 50 : 38;
      if (prevLon !== null) lap += (day.moon.lon - prevLon + 540) % 360 - 180;          // how far round the zodiac she has gone since the 1st
      prevLon = day.moon.lon;
      var inside = lap > 330, vr = day.quarter ? dr * 1.18 : dr;                      // after a full turn the day numbers go on the inner side, clear of the first turn
      o_.push(moon(day.moon, c[0], c[1], dr, day.quarter));
      var np = pos(inside ? r - vr - 24 : r + vr + 24, day.moon.lon);
      o_.push(txt(np[0], np[1] + 9, String(day.d), day.quarter ? 30 : 26, day.quarter ? P.accent : P.ink, day.quarter ? 700 : 400, "middle"));
      day.events.forEach(function (e) {
        if (e.type !== "eclipse") return;
        var ep = pos(inside ? r + vr + 34 : r - vr - 34, day.moon.lon);
        o_.push(ec(e.body, e.kind, ep[0], ep[1], 62));
      });
    });

    /* ---- the middle ---- */
    o_.push(circ(R_IN, 'fill="none" stroke="' + P.gold + '" stroke-width="4"'));
    var capEarth = "", centreP = loadCentre();
    function loadCentre() {
      if (kind.indexOf("earth") === 0) return earthLibs();
      return Promise.resolve(true);
    }
    return centreP.then(function () {
      var m = "";
      if (kind.indexOf("earth") === 0) {
        var want = kind === "earth-new" ? 0 : 2, q = null;
        model.events.forEach(function (e) { if (e.type === "phase" && e.quarter === want && !q) q = e; });
        var ems = q ? q.ms : mid, E_ = window.TCAstrolabe.earth(1500, ems), rr = R_MED;
        function onMap(lat, lon) { var d = rr * (90 - lat) / 180, a3 = lon * RAD; return [CX + d * Math.sin(a3), CY + d * Math.cos(a3)]; }
        m += '<image href="' + E_.url + '" x="' + (CX - rr) + '" y="' + (CY - rr) + '" width="' + (2 * rr) + '" height="' + (2 * rr) + '" clip-path="url(#mwmed)"/>';
        var sp = onMap(E_.sun.lat, E_.sun.lon), mp = onMap(E_.moon.lat, E_.moon.lon);
        m += '<circle cx="' + f(sp[0]) + '" cy="' + f(sp[1]) + '" r="46" fill="rgba(255,196,64,0.28)" stroke="#ffc440" stroke-width="3"/>' + planet("sun", sp[0], sp[1], 64, "#ffd166");
        m += '<circle cx="' + f(mp[0]) + '" cy="' + f(mp[1]) + '" r="42" fill="rgba(5,10,40,0.5)" stroke="#f6edc4" stroke-width="3"/>' + planet("moon", mp[0], mp[1], 56, "#f6edc4");
        m += '<g transform="translate(' + CX + " " + CY + ") scale(" + (96 / 570).toFixed(4) + ')">' + '<circle r="300" fill="#08104a" opacity="0.75"/>' + LOGO + "</g>";
        var u = new Date(ems).toISOString();
        capEarth = "Middle: the Earth seen from above the North Pole " + (q ? "at the " + q.name : "on the 15th") + ", " + u.slice(8, 10).replace(/^0/, "") + " " + months[+u.slice(5, 7) - 1].slice(0, 3) + " " + u.slice(11, 16) + " UTC. The night side is shaded; the Sun and the Moon stand overhead at the marked places.";
      } else if (kind === "sol") {
        m += circ(R_MED, 'fill="#ffffff"') + '<image href="' + window.TC_ART.sol + '" x="' + (CX - 575) + '" y="' + (CY - 439) + '" width="1150" height="878" preserveAspectRatio="xMidYMid meet" clip-path="url(#mwmed)"/>';
        capEarth = "Middle: Sol and Luna, the Sun and the Moon face to face.";
      } else if (kind === "rota") {
        m += circ(R_MED, 'fill="' + P.plate + '"') + '<image href="' + window.TC_ART.rota + '" x="' + (CX - 480) + '" y="' + (CY - 480) + '" width="960" height="960" clip-path="url(#mwmed)"/>';
        capEarth = "Middle: the Rota, the turning wheel of the RoTao page.";
      } else if (kind === "cubed") {
        m += circ(R_MED, 'fill="#08104a"') + '<g transform="translate(' + CX + " " + CY + ") scale(" + (1040 / 570).toFixed(4) + ')">' + LOGO + "</g>";
        capEarth = "Middle: the TwelveCubed mark, 12 × 12 × 12 = 1,728.";
      } else {
        m += circ(R_MED, 'fill="' + P.plate + '"');
        m += txt(CX, CY - 40, months[model.m], 160, P.ink, 400, "middle");
        m += txt(CX, CY + 70, String(model.y), 96, P.accent, 400, "middle", ' letter-spacing="8"');
        var qs = model.events.filter(function (e) { return e.type === "phase"; }).slice(0, 5);
        var step = 150, x0 = CX - (qs.length - 1) * step / 2;
        qs.forEach(function (e, n) {
          var info = [{ illum: 0, waxing: true, angle: 0 }, { illum: 0.5, waxing: true, angle: 90 }, { illum: 1, waxing: true, angle: 180 }, { illum: 0.5, waxing: false, angle: 270 }][e.quarter];
          m += moon(info, x0 + n * step, CY + 230, 46, true) + txt(x0 + n * step, CY + 330, dateF.format(new Date(e.ms)).replace(/^\w+ /, ""), 26, P.dim, 400, "middle");
        });
        capEarth = "";
      }
      o_.push(m);
      o_.push(circ(R_MED, 'fill="none" stroke="' + P.gold + '" stroke-width="7" stroke-opacity="0.9"'));

      /* ---- under the wheel: how to read it, and the phases and eclipses of the month ---- */
      var y = CY + R_RIM + 62;
      o_.push(txt(PW / 2, y, "One disc a day, at the Moon’s place in the zodiac at noon, from the outer turn inward. She circles the sky in about 27 days, so the last days of a long month lie just inside the first.", 26, P.dim, 400, "middle", ' font-style="italic"'));
      y += 38;
      o_.push(txt(PW / 2, y, "A gold ring marks a main phase at its exact moment. The planets stand where they are in the middle of the month. " + (south ? "The Moon is drawn as seen from the southern sky." : "The Moon is drawn as seen from the northern sky."), 26, P.dim, 400, "middle", ' font-style="italic"'));
      if (capEarth) { y += 38; o_.push(txt(PW / 2, y, capEarth.length > 175 ? capEarth.slice(0, capEarth.lastIndexOf(". ", 175) + 1) : capEarth, 26, P.dim, 400, "middle", ' font-style="italic"')); }
      var list = model.events.filter(function (e) { return e.type === "phase" || e.type === "eclipse"; });
      var rows = Math.ceil(list.length / 2), ly = y + 66, colX = [130, 1250];
      list.forEach(function (e, n) {
        var col = n < rows ? 0 : 1, row = col === 0 ? n : n - rows, x = colX[col], yy = ly + row * 56;
        var sg = SIGNS[e.sign];
        if (e.type === "eclipse") o_.push(ec(e.body, e.kind, x + 24, yy - 11, 46), txt(x + 66, yy, K.ecLabel(e), 29, P.ink, 700));
        else {
          var info = [{ illum: 0, waxing: true, angle: 0 }, { illum: 0.5, waxing: true, angle: 90 }, { illum: 1, waxing: true, angle: 180 }, { illum: 0.5, waxing: false, angle: 270 }][e.quarter];
          o_.push(moon(info, x + 24, yy - 11, 21, false), txt(x + 66, yy, e.name, 29, P.accent, 700));
        }
        o_.push(txt(x + 400, yy, dateF.format(new Date(e.ms)), 28, P.ink, 400), txt(x + 590, yy, K.hhmm(e.ms, tz), 28, P.dim, 400),
          txt(x + 700, yy, e.deg + "°", 28, P.ink, 400), sign(e.sign, x + 790, yy - 10, 32, P.ink), txt(x + 818, yy, sg, 28, P.dim, 400));
      });
      var fy = PH - 78;
      o_.push(txt(PW / 2, fy, "© TwelveCubed · tropical zodiac, geocentric apparent positions · for reflection, not prediction", 24, P.dim, 400, "middle"));
      return { w: PW, h: PH, bg: P.bg, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + '" height="' + PH + '" viewBox="0 0 ' + PW + " " + PH + '" style="font-family:' + SERIF.replace(/"/g, "'") + '"><title>' + K.esc("Moon wheel, " + title) + "</title>" + o_.join("") + "</svg>" };
    });
  }

  window.TCMoonWheel = { build: build };
})();
