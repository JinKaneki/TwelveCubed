/* The celestial clock: a chart wheel with the Earth in its middle.

   window.TCAstrolabe.mount(element, clock)      clock = window.TCDaily.clock (js/daily.js)

   What is drawn, from the centre outwards (one 1000-unit square, centre 0,0, outer radius 500):
     0 - 330   the Earth, seen from above the North Pole (azimuthal equidistant projection), Greenwich straight down, east to the right.
               The map is fixed. The night side is shaded from the real height of the Sun above each point. The Sun and the Moon stand
               over the places where they are at the zenith. A pin marks the place whose houses are drawn.
     336-370   a 24-hour clock in UTC, 00 at the top and 12 at the bottom, the hours running clockwise, with an hour, a minute and a second hand
     374-420   the zodiac, a thin ring in the element colours, with degree ticks at 1, 5 and 10 degrees
     420-448   the houses of the pinned place (Placidus), numbered, with the Ascendant, Descendant, Midheaven and Imum Coeli
     452-500   the Sun, the Moon, the planets, Chiron and the True Node, on short leaders to their true degree
   The zodiac turns with the sky: the sign that is on the meridian of the pin (the Midheaven) points along the pin's meridian on the map.
   The Sun on the ring and the Sun over the map can differ by a few degrees. The ring is measured along the ecliptic and the map along
   the equator, and the two are tilted 23.4 degrees to each other.

   Two canvases carry the map (sharp at any pixel density) and the shading (a small buffer that the browser smooths); one SVG carries the rest.
   Positions come from astronomy-engine (via TCEphem, the same engine as the chart pages). Nothing is sent anywhere. */
(function () {
  "use strict";

  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var A = window.Astronomy, E = window.TCEphem, W = window.TCWheel, GL = window.TC_GLYPHS || {}, LAND = window.TC_LAND, TZP = window.TC_TZPLACE || {};
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var RM = 330;                      // the map
  var RB0 = 336, RB1 = 370;          // the 24-hour bezel
  var RZ0 = 374, RZ1 = 420;          // the zodiac
  var RH1 = 448;                     // outer edge of the houses ring
  var RP = 478, RPB = 18;            // planet beads: centre radius, bead radius
  var SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var TINT = ["rgba(255,77,98,0.16)", "rgba(217,177,74,0.15)", "rgba(76,203,208,0.14)", "rgba(100,117,255,0.18)"];   // fire earth air water
  var ELCOL = ["#ff6a7c", "#e0bb55", "#58d2d6", "#8a97ff"];
  var BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "node"];
  var NAMES = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto", chiron: "Chiron", node: "True Node" };
  var QUOTE = ["Man follows the earth,", "the earth follows the heavens,", "the heavens follow the Tao", "and the Tao follows nature."];
  var DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function tint(k, paper) { var P = W.PAL[paper ? "paper" : "night"]; return P[k] || (paper ? P.grayDeg : P.grayDeg); }   // Chiron and the Node have no colour of their own: the chart's grey
  var SPEEDS = [[1, "Real time"], [60, "1 hour per minute"], [600, "10 hours per minute"], [3600, "1 hour per second"], [21600, "6 hours per second"], [86400, "1 day per second"]];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var GREENWICH = { name: "Greenwich, GB", lat: 51.48, lon: 0, tz: "Europe/London" };

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function wrap180(d) { d = norm(d + 180) - 180; return d; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function pol(r, a) { return [r * Math.sin(a * RAD), r * Math.cos(a * RAD)]; }          // a: degrees counterclockwise from straight DOWN (Greenwich is down, east is to the right)
  function P(r, a) { var p = pol(r, a); return f2(p[0]) + " " + f2(p[1]); }
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function latText(v) { return Math.abs(v).toFixed(1) + "°" + (v >= 0 ? "N" : "S"); }
  function lonText(v) { v = wrap180(v); return Math.abs(v).toFixed(1) + "°" + (v >= 0 ? "E" : "W"); }
  function utcParts(ms) {
    var d = new Date(ms);
    return { h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), D: d.getUTCDate(), M: d.getUTCMonth(), Y: d.getUTCFullYear(), w: d.getUTCDay() };
  }
  function fmtDate(ms) { var p = utcParts(ms); return DAYS[p.w] + " " + p.D + " " + MONTHS[p.M] + " " + p.Y; }
  function fmtTime(ms) { var p = utcParts(ms); return two(p.h) + ":" + two(p.mi) + ":" + two(p.s); }
  function signText(lon) { var s = E.split(lon); return s.deg + "°" + two(s.min) + "′ " + s.sign; }

  /* ================================================================= the sky at one instant */
  function sky(ms) {
    var d = new Date(ms), t = A.MakeTime(d);
    var gast = A.SiderealTime(d) * 15;                                 // degrees
    var rot = A.Rotation_EQJ_EQD(t);
    function sub(vec) {                                                // the point of the Earth directly below a body
      var q = A.EquatorFromVector(A.RotateVector(rot, vec));
      return { lat: q.dec, lon: wrap180(q.ra * 15 - gast) };
    }
    var sun = sub(A.GeoVector(A.Body.Sun, d, true)), moon = sub(A.GeoMoon(d));
    return { ms: ms, gast: gast, sun: sun, moon: moon, sunLon: E.lonOf("sun", ms), moonLon: E.lonOf("moon", ms) };
  }

  /* ================================================================= the map (canvas) */
  /* land rings, decoded once: [{pts: [[lon, lat]...], polar: bool}] with the edges cut into pieces of at most 2 degrees */
  var landRings = null;
  function decodeLand() {
    if (landRings) return landRings;
    landRings = [];
    var q = LAND.q || 100;
    LAND.rings.forEach(function (r) {
      var lon = r[0] / q, lat = r[1] / q, raw = [[lon, lat]], i;
      for (i = 2; i < r.length; i += 2) { lon += r[i] / q; lat += r[i + 1] / q; raw.push([lon, lat]); }
      var out = [], sum = 0, n = raw.length;
      for (i = 0; i < n; i++) {
        var a = raw[i], b = raw[(i + 1) % n], dl = wrap180(b[0] - a[0]), dt = b[1] - a[1];
        sum += dl;
        var steps = Math.max(1, Math.ceil(Math.max(Math.abs(dl), Math.abs(dt)) / 2));
        for (var k = 0; k < steps; k++) out.push([a[0] + dl * k / steps, a[1] + dt * k / steps]);
      }
      landRings.push({ pts: out, polar: Math.abs(Math.round(sum / 360)) >= 1 });
    });
    return landRings;
  }

  function drawMap(cv, opt) {
    var size = cv.width, c = size / 2, R = size / 2 - 1, ctx = cv.getContext("2d"), u = size / 660;   // u: device pixels per map unit
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, R + 0.5, 0, 6.2832); ctx.clip();
    function xy(lat, lon, r) { var rr = r * (90 - lat) / 180; return [c + rr * Math.sin(lon * RAD), c + rr * Math.cos(lon * RAD)]; }
    var g = ctx.createRadialGradient(c, c, 0, c, c, R);
    g.addColorStop(0, "#1a5a86"); g.addColorStop(0.6, "#124775"); g.addColorStop(1, "#0b3158");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

    /* land, and the ice of Antarctica (the ring that goes round the pole, filled between its coast and the rim) */
    var path = new Path2D(), ice = new Path2D(), rings = decodeLand();
    rings.forEach(function (ring) {
      var p = ring.pts, i, q, tgt = ring.polar ? ice : path;
      q = xy(p[0][1], p[0][0], R); tgt.moveTo(q[0], q[1]);
      for (i = 1; i < p.length; i++) { q = xy(p[i][1], p[i][0], R); tgt.lineTo(q[0], q[1]); }
      tgt.closePath();
      if (ring.polar) { tgt.moveTo(c + R, c); tgt.arc(c, c, R, 0, 6.2832); tgt.closePath(); }
    });
    var lg = ctx.createRadialGradient(c, c, 0, c, c, R);
    lg.addColorStop(0, "#dccb96"); lg.addColorStop(1, "#bfa66c");
    ctx.fillStyle = lg; ctx.fill(path, "evenodd");
    var ig = ctx.createRadialGradient(c, c, R * 0.8, c, c, R);
    ig.addColorStop(0, "#f3f8f9"); ig.addColorStop(1, "#cfdde2");
    ctx.fillStyle = ig; ctx.fill(ice, "evenodd");
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(70,52,18,0.75)"; ctx.lineWidth = Math.max(0.8, 1.1 * u);
    ctx.stroke(path);
    ctx.strokeStyle = "rgba(70,95,110,0.8)"; ctx.stroke(ice);

    /* the grid: meridians every 15 degrees, parallels every 15, the tropics and the polar circles dashed */
    if (opt.grid) {
      ctx.lineWidth = Math.max(0.6, 0.9 * u);
      ctx.strokeStyle = "rgba(255,255,255,0.17)";
      var k, lat;
      ctx.beginPath();
      for (k = 0; k < 24; k++) { var a = k * 15 * RAD; ctx.moveTo(c, c); ctx.lineTo(c + R * Math.sin(a), c + R * Math.cos(a)); }
      for (lat = -75; lat <= 75; lat += 15) { if (lat === 0) continue; var rr = R * (90 - lat) / 180; ctx.moveTo(c + rr, c); ctx.arc(c, c, rr, 0, 6.2832); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,226,150,0.6)"; ctx.lineWidth = Math.max(0.9, 1.4 * u);
      ctx.beginPath(); ctx.arc(c, c, R * 0.5, 0, 6.2832); ctx.stroke();                                    // the equator
      ctx.setLineDash([5 * u, 5 * u]); ctx.strokeStyle = "rgba(255,226,150,0.4)"; ctx.lineWidth = Math.max(0.7, 1 * u);
      [23.44, -23.44, 66.56, -66.56].forEach(function (la) { ctx.beginPath(); ctx.arc(c, c, R * (90 - la) / 180, 0, 6.2832); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      ctx.font = "700 " + Math.round(Math.max(9, 11.5 * u)) + "px Georgia, serif";
      for (k = 0; k < 12; k++) {
        var lo = k * 30, lab = lo === 0 ? "0°" : lo === 180 ? "180°" : (lo < 180 ? lo + "°E" : (360 - lo) + "°W"), q2 = xy(-74, lo, R);
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3.2 * u; ctx.strokeText(lab, q2[0], q2[1]);
        ctx.fillStyle = "#10283f"; ctx.fillText(lab, q2[0], q2[1]);
      }
    }
    /* the North Pole */
    ctx.fillStyle = "rgba(255,244,214,0.9)"; ctx.beginPath(); ctx.arc(c, c, 2.2 * u, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(201,165,90,0.9)"; ctx.lineWidth = Math.max(1.2, 2 * u);
    ctx.beginPath(); ctx.arc(c, c, R, 0, 6.2832); ctx.stroke();
  }

  /* ================================================================= the night (a small canvas, smoothed by the browser) */
  var NB = 360;
  var shade = null;
  function shadeInit() {
    if (shade) return shade;
    var n = NB * NB, sphi = new Float32Array(n), cphi = new Float32Array(n), slam = new Float32Array(n), clam = new Float32Array(n), inside = new Uint8Array(n);
    for (var j = 0; j < NB; j++) for (var i = 0; i < NB; i++) {
      var u = (i + 0.5) / NB * 2 - 1, v = (j + 0.5) / NB * 2 - 1, r = Math.sqrt(u * u + v * v), k = j * NB + i;
      if (r > 1) continue;
      var lat = (90 - 180 * r) * RAD, lon = Math.atan2(u, v);
      inside[k] = 1; sphi[k] = Math.sin(lat); cphi[k] = Math.cos(lat); slam[k] = Math.sin(lon); clam[k] = Math.cos(lon);
    }
    var lut = new Uint8Array(1024);                                    // night alpha from sin(altitude) in [-1, 0]
    for (var m = 0; m < 1024; m++) {
      var s = -m / 1023, h = Math.asin(Math.max(-1, s)) * DEG;
      lut[m] = Math.round(255 * 0.7 * (1 - Math.exp(h / 7)));
    }
    shade = { sphi: sphi, cphi: cphi, slam: slam, clam: clam, inside: inside, lut: lut, img: null };
    return shade;
  }
  function drawShade(cv, sunLat, sunLon) {
    var S = shadeInit(), ctx = cv.getContext("2d");
    if (!S.img) S.img = ctx.createImageData(NB, NB);
    var data = S.img.data, sd = Math.sin(sunLat * RAD), cd = Math.cos(sunLat * RAD), cl = Math.cos(sunLon * RAD), sl = Math.sin(sunLon * RAD), n = NB * NB;
    for (var k = 0; k < n; k++) {
      var o = k * 4;
      if (!S.inside[k]) { data[o + 3] = 0; continue; }
      var alt = S.sphi[k] * sd + S.cphi[k] * cd * (S.clam[k] * cl + S.slam[k] * sl);
      var a = alt >= 0 ? 0 : S.lut[(-alt * 1023) | 0];
      data[o] = 2; data[o + 1] = 7; data[o + 2] = 24; data[o + 3] = a;
    }
    ctx.putImageData(S.img, 0, 0);
  }

  /* ================================================================= mount */
  function mount(host, clock) {
    if (!A || !E || !W || !LAND || host.getAttribute("data-mounted")) return;
    host.setAttribute("data-mounted", "1");

    /* ----- state ----- */
    var place = (function () {
      var saved = store("tc_astro_place");
      if (saved) { try { var o = JSON.parse(saved); if (isFinite(o.lat) && isFinite(o.lon) && o.name) return o; } catch (e) { /* ignore */ } }
      var tz = "", t;
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* ignore */ }
      t = TZP[tz];
      return t ? { name: t[0] + ", " + t[1], lat: t[3], lon: t[4], tz: tz } : GREENWICH;
    })();
    var show = { houses: store("tc_astro_houses") !== "0", planets: store("tc_astro_planets") !== "0", grid: store("tc_astro_grid") !== "0" };
    var maxSpeed = reduce ? 3 : SPEEDS.length - 1;

    /* ----- markup ----- */
    var tzList = Object.keys(TZP).map(function (k) { return { k: k, n: TZP[k][0], c: TZP[k][1] }; }).sort(function (a, b) { return a.n < b.n ? -1 : a.n > b.n ? 1 : 0; });
    var placeOpts = '<option value="__pin">Dropped pin</option>' + tzList.map(function (t) { return '<option value="' + esc(t.k) + '">' + esc(t.n + ", " + t.c) + "</option>"; }).join("");
    host.innerHTML =
      '<div class="astro-grid">' +
      '<div class="astro-stage" data-stage role="img" aria-label="Celestial clock">' +
      '<canvas data-map aria-hidden="true"></canvas><canvas data-shade width="' + NB + '" height="' + NB + '" aria-hidden="true"></canvas></div>' +
      '<div class="astro-panel">' +
      '<div class="ap-time"><p class="ap-clock" data-clock>00:00:00</p><p class="ap-date" data-date></p><p class="ap-status" data-status></p></div>' +
      '<div class="ap-row ap-transport"><button type="button" class="ap-btn ap-main" data-play>Pause</button><button type="button" class="ap-btn" data-now>Now</button></div>' +
      '<div class="ap-block"><span class="ap-lab">Speed</span><div class="ap-speed"><button type="button" class="ap-btn ap-sq" data-slow aria-label="Slower">&minus;</button><span class="ap-speed-t" data-speed></span><button type="button" class="ap-btn ap-sq" data-fast aria-label="Faster">+</button></div>' +
      '<button type="button" class="ap-btn ap-wide" data-rev aria-pressed="false">Run backwards</button></div>' +
      '<div class="ap-block"><span class="ap-lab">Step</span><div class="ap-row ap-steps"><button type="button" class="ap-btn" data-step="-86400000">&minus;1 day</button><button type="button" class="ap-btn" data-step="-3600000">&minus;1 h</button><button type="button" class="ap-btn" data-step="3600000">+1 h</button><button type="button" class="ap-btn" data-step="86400000">+1 day</button></div></div>' +
      '<div class="ap-block"><label class="ap-lab" for="ap-when">Jump to a date and time (UTC)</label><div class="ap-row"><input id="ap-when" type="datetime-local" step="1" min="1800-01-01T00:00:00" max="2199-12-31T23:59:59" data-when><button type="button" class="ap-btn" data-go>Go</button></div>' +
      '<label class="ap-lab" for="ap-event">Or jump to</label><select id="ap-event" class="ap-sel" data-event><option value="">Choose a moment&hellip;</option><option value="full">The next Full Moon</option><option value="new">The next New Moon</option><option value="season">The next equinox or solstice</option><option value="rise">The next sunrise at the pin</option><option value="set">The next sunset at the pin</option></select></div>' +
      '<div class="ap-block"><label class="ap-lab" for="ap-place">The pin (houses and angles)</label><select id="ap-place" class="ap-sel" data-place>' + placeOpts + '</select>' +
      '<div class="ap-row"><button type="button" class="ap-btn" data-here>Use my location</button></div><p class="ap-hint">Or tap the map to drop the pin anywhere.</p></div>' +
      '<fieldset class="ap-block ap-show"><legend class="ap-lab">Show</legend><label><input type="checkbox" data-show="houses"> Houses and angles</label><label><input type="checkbox" data-show="planets"> Planets</label><label><input type="checkbox" data-show="grid"> Map grid</label></fieldset>' +
      '</div>' +
      '<div class="astro-read"><div class="rd-set" data-read-a></div>' +
      '<button type="button" class="rd rd-save" data-save><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M12 3v11M7.5 9.5L12 14l4.5-4.5M4.5 16.5v3h15v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="rd-save-t" data-save-lab>Save as PNG</span><span class="rd-s">The date, a saying from the Tao and the clock as it stands</span></button>' +
      '<div class="rd-set" data-read-b></div></div>' +
      '<ul class="astro-chips" data-chips aria-label="Positions in the zodiac"></ul></div>' +
      '<details class="astro-how"><summary>How to read the celestial clock</summary><div class="how-body">' +
      '<p><b>The map</b> is the Earth seen from above the North Pole, turned so that Greenwich points straight down and east lies to the right, as on an ordinary map. The equator is the gold circle halfway out; the South Pole is the whole outer rim, so southern lands such as Johannesburg sit in the lower half. The shaded part is the night, darker the further the Sun is below the horizon.</p>' +
      '<p><b>The Sun and the Moon</b> stand over the points of the Earth where they are directly overhead. The Moon&rsquo;s lit side faces the Sun.</p>' +
      '<p><b>The 24-hour clock</b> shows UTC like any 24-hour dial: 00 at the top, 06 on the right, 12 at the bottom and 18 on the left, the hours running clockwise. The thick hand is the hour hand, the long one the minutes, the red one the seconds. At 12:00 UTC the hour hand points straight down the Greenwich line, because the mean Sun is then overhead there; the real Sun can stand a little to one side of it (the equation of time, up to 4 degrees).</p>' +
      '<p><b>The zodiac</b> turns once a day with the sky. The sign on the dashed line from the pole through the pin is the Midheaven of the pin. The ring is measured along the ecliptic and the map along the equator, so the Sun on the ring and the Sun over the map can differ by a few degrees.</p>' +
      '<p><b>The houses</b> are Placidus (Porphyry inside the polar circles) for the pinned place, with AC the Ascendant, DC the Descendant, MC the Midheaven and IC the Imum Coeli.</p>' +
      '<p><b>The planets</b> sit outside on short leaders to their true degree: the Sun, the Moon, the eight planets, <b>Chiron</b> and the <b>True Node</b>. The True Node is not a body but the point where the Moon&rsquo;s path crosses the ecliptic going north; it runs backwards through the zodiac, so it is not marked with an R. Chiron and the Node are drawn in the chart&rsquo;s grey. An <b>R</b> beside a planet means it is moving backwards (retrograde). Chiron is tabled only for the years 1900 to 2100 and is left out beyond them.</p>' +
      '<p><b>Save as PNG</b>, in the empty tile after the Moon phase, makes a picture of the clock exactly as it stands: the date first, then a saying from the Tao Te Ching, then the clock. It is built in your browser and saved to your downloads folder; nothing is sent anywhere.</p>' +
      '</div></details>';

    var stage = host.querySelector("[data-stage]"), cvMap = host.querySelector("[data-map]"), cvShade = host.querySelector("[data-shade]");
    var q = function (s) { return host.querySelector(s); };

    /* ----- the SVG ----- */
    var svg = el("svg", { viewBox: "-500 -500 1000 1000", "aria-hidden": "true", focusable: "false" }, stage);
    var defs = el("defs", null, svg);
    var gSun = el("radialGradient", { id: "ag-sun" }, defs);
    el("stop", { offset: "0", "stop-color": "#fff1b0", "stop-opacity": "0.8" }, gSun); el("stop", { offset: "0.35", "stop-color": "#ffd25a", "stop-opacity": "0.34" }, gSun); el("stop", { offset: "1", "stop-color": "#ffd25a", "stop-opacity": "0" }, gSun);
    var gMoon = el("radialGradient", { id: "ag-moon" }, defs);
    el("stop", { offset: "0", "stop-color": "#e8efff", "stop-opacity": "0.55" }, gMoon); el("stop", { offset: "1", "stop-color": "#e8efff", "stop-opacity": "0" }, gMoon);

    /* fixed rings */
    var gRing = el("g", { "class": "a-rings" }, svg);
    el("circle", { r: 500, "class": "a-rim" }, gRing);
    el("circle", { r: (RB0 + RB1) / 2, "class": "a-bezel", "stroke-width": RB1 - RB0 }, gRing);
    el("circle", { r: RB1, "class": "a-line" }, gRing); el("circle", { r: RB0, "class": "a-line" }, gRing);
    el("circle", { r: (RZ0 + RZ1) / 2, "class": "a-zband", "stroke-width": RZ1 - RZ0 }, gRing);
    el("circle", { r: (RZ1 + RH1) / 2, "class": "a-hband", "stroke-width": RH1 - RZ1 }, gRing);
    [RZ0, RZ1, RH1].forEach(function (r) { el("circle", { r: r, "class": "a-line" }, gRing); });

    /* the bezel: hours */
    var gBez = el("g", { "class": "a-bez" }, svg), tk = "", tk15 = "", tk5 = "", h, m;
    for (m = 0; m < 288; m++) {                                         // every 5 minutes round the 24 hours (1.25 degrees)
      var ang = 180 - m * 1.25;                                         // 00:00 at the top, 12:00 at the bottom, the hours running clockwise
      var hourTick = m % 12 === 0, quarter = m % 3 === 0;
      var len = hourTick ? 13 : quarter ? 8 : 4;
      var seg = "M" + P(RB1, ang) + "L" + P(RB1 - len, ang);
      if (hourTick) tk += seg; else if (quarter) tk15 += seg; else tk5 += seg;
    }
    el("path", { d: tk5, "class": "a-t5" }, gBez); el("path", { d: tk15, "class": "a-t15" }, gBez); el("path", { d: tk, "class": "a-t60" }, gBez);
    for (h = 0; h < 24; h++) {
      var tp = pol(RB0 + 13, 180 - h * 15);
      var tx = el("text", { x: f2(tp[0]), y: f2(tp[1]), "class": "a-hr" + (h % 3 === 0 ? "" : " a-hr-minor"), "text-anchor": "middle", "dominant-baseline": "central" }, gBez);
      tx.textContent = two(h);
    }

    /* the zodiac ring: tints, boundaries and ticks turn as one group */
    var gZod = el("g", { "class": "a-zod" }, svg);
    var s, wedge = [];
    for (s = 0; s < 12; s++) {
      var a0 = s * 30, a1 = a0 + 30;
      el("path", { d: "M" + P(RZ1, a0) + "A" + RZ1 + " " + RZ1 + " 0 0 0 " + P(RZ1, a1) + "L" + P(RZ0, a1) + "A" + RZ0 + " " + RZ0 + " 0 0 1 " + P(RZ0, a0) + "Z", fill: TINT[s % 4] }, gZod);
    }
    var bnd = "", t1 = "", t5 = "", t10 = "", L;
    for (L = 0; L < 360; L++) {
      if (L % 30 === 0) { bnd += "M" + P(RZ0, L) + "L" + P(RZ1, L); continue; }
      var ln = L % 10 === 0 ? 14 : L % 5 === 0 ? 10 : 6, sg = "M" + P(RZ1, L) + "L" + P(RZ1 - ln, L);
      if (L % 10 === 0) t10 += sg; else if (L % 5 === 0) t5 += sg; else t1 += sg;
    }
    el("path", { d: t1, "class": "a-d1" }, gZod); el("path", { d: t5, "class": "a-d5" }, gZod); el("path", { d: t10, "class": "a-d10" }, gZod); el("path", { d: bnd, "class": "a-bnd" }, gZod);
    var signEls = [];
    for (s = 0; s < 12; s++) {
      signEls.push(el("path", { d: GL[SIGNS[s]] || "", fill: ELCOL[s % 4], stroke: ELCOL[s % 4], "stroke-width": "3", "stroke-linejoin": "round" }, svg));
    }

    /* the houses ring */
    var gHouse = el("g", { "class": "a-houses" }, svg);
    var cuspPath = el("path", { "class": "a-cusp" }, gHouse), anglePath = el("path", { "class": "a-cusp a-cusp-4" }, gHouse);
    var numEls = [], i;
    for (i = 0; i < 12; i++) { var tn = el("text", { "class": "a-hnum", "text-anchor": "middle", "dominant-baseline": "central" }, gHouse); tn.textContent = i + 1; numEls.push(tn); }
    var angEls = {};
    ["AC", "MC", "DC", "IC"].forEach(function (k) {
      var g = el("g", { "class": "a-ang" }, gHouse);
      el("rect", { x: -16, y: -10, width: 32, height: 20, rx: 10 }, g);
      var tt = el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, g); tt.textContent = k;
      angEls[k] = g;
    });

    /* the map's marks: the pin's meridian, the Sun, the Moon, the pin */
    var gMap = el("g", { "class": "a-map" }, svg);
    var mcLine = el("line", { "class": "a-mc", x1: 0, y1: 0 }, gMap), icLine = el("line", { "class": "a-ic", x1: 0, y1: 0 }, gMap);
    var sunG = el("g", { "class": "a-sun" }, gMap);
    el("circle", { r: 78, fill: "url(#ag-sun)" }, sunG);
    var rays = ""; for (i = 0; i < 16; i++) { rays += "M" + P(19, i * 22.5) + "L" + P(i % 2 ? 26 : 32, i * 22.5); }
    el("path", { d: rays, "class": "a-rays" }, sunG);
    el("circle", { r: 15, "class": "a-sunc" }, sunG);
    var moonG = el("g", { "class": "a-moon" }, gMap);
    el("circle", { r: 46, fill: "url(#ag-moon)" }, moonG);
    el("circle", { r: 13.5, "class": "a-moond" }, moonG);
    var moonLit = el("path", { "class": "a-moonl" }, moonG);
    el("circle", { r: 13.5, "class": "a-moonr" }, moonG);
    var pinG = el("g", { "class": "a-pin" }, gMap);
    el("circle", { r: 11, "class": "a-pin-ring" }, pinG); el("circle", { r: 4, "class": "a-pin-dot" }, pinG);
    var pinTxt = el("text", { x: 14, y: -9, "class": "a-pin-t" }, pinG);

    /* planets */
    var gPl = el("g", { "class": "a-planets" }, svg), plEls = {};
    BODIES.forEach(function (k) {
      var g = el("g", { "class": "a-pl" }, gPl), ti = el("title", null, g);
      var lead = el("path", { "class": "a-lead", stroke: tint(k) }, g);
      var bead = el("g", null, g);
      el("circle", { r: RPB, "class": "a-bead" }, bead);
      var gl = el("g", { transform: "scale(0.3) translate(-50 -50)" }, bead); gl.innerHTML = W.GLYPH[k](tint(k));
      var rt = el("text", { x: 14, y: 17, "class": "a-retro", "text-anchor": "middle" }, bead); rt.textContent = "R"; rt.setAttribute("display", "none");
      plEls[k] = { g: g, lead: lead, bead: bead, retro: rt, title: ti };
    });

    /* the hands */
    var gHand = el("g", { "class": "a-hands" }, svg);
    var hHour = el("path", { d: "M-5 8L-2.6 -178L0 -214L2.6 -178L5 8Z", "class": "a-hand a-hand-h" }, gHand);
    var hMin = el("path", { d: "M-3.4 8L-1.4 -300L0 -322L1.4 -300L3.4 8Z", "class": "a-hand a-hand-m" }, gHand);
    var hSec = el("g", { "class": "a-hand-s" }, gHand);
    el("line", { x1: 0, y1: 26, x2: 0, y2: -(RB0 - 6) }, hSec);
    el("circle", { r: 9, "class": "a-cap" }, gHand); el("circle", { r: 3.2, "class": "a-cap-i" }, gHand);

    /* ----- sizing and the static map ----- */
    var cssSize = 0, redrawMap = function () {
      var w = stage.clientWidth; if (!w) return;
      cssSize = w;
      var dpr = Math.min(3, window.devicePixelRatio || 1), px = Math.min(2400, Math.round(w * 0.66 * dpr));
      if (cvMap.width !== px) { cvMap.width = px; cvMap.height = px; }
      drawMap(cvMap, { grid: show.grid });
    };
    if ("ResizeObserver" in window) new ResizeObserver(function () { redrawMap(); }).observe(stage); else window.addEventListener("resize", redrawMap);
    redrawMap();

    /* ----- per-instant drawing ----- */
    var last = { ms: -1, planetsAt: 0, retro: {}, pl: null, houses: null, sunKey: "", frame: 0, text: 0, aria: -1 };

    function lonsAt(ms, sk) {
      var now = performance.now();
      if (!last.pl || now - last.planetsAt > 250 || Math.abs(ms - last.pl.ms) > 3600000 * 6) {
        var o = { ms: ms };
        BODIES.forEach(function (k) {
          o[k] = k === "sun" ? sk.sunLon : k === "moon" ? sk.moonLon : E.lonOf(k, ms);
          if (k !== "sun" && k !== "moon" && k !== "node") last.retro[k] = isFinite(o[k]) && E.speedOf(k, ms) < 0;   // the Node is not marked: it runs backwards almost all the time
        });
        last.pl = o; last.planetsAt = now;
      } else { last.pl.sun = sk.sunLon; last.pl.moon = sk.moonLon; }
      return last.pl;
    }

    function moonPath(k, waxing) {                                      // lit part of the Moon, the lit side to the right
      var r = 13.5, rx = Math.abs(1 - 2 * k) * r;
      if (k < 0.004) return "";
      if (k > 0.996) return "M0 -" + r + "A" + r + " " + r + " 0 1 1 0 " + r + "A" + r + " " + r + " 0 1 1 0 -" + r + "Z";
      return "M0 -" + r + "A" + r + " " + r + " 0 0 1 0 " + r + "A" + f2(rx) + " " + r + " 0 0 " + (k < 0.5 ? 0 : 1) + " 0 -" + r + "Z";
    }
    function mapPt(lat, lon) { var r = RM * (90 - lat) / 180, p = pol(r, lon); return p; }
    function setT(node, x, y, extra) { node.setAttribute("transform", "translate(" + f2(x) + " " + f2(y) + ")" + (extra || "")); }

    var readCache = {};
    function setText(key, node, txt) { if (readCache[key] !== txt) { readCache[key] = txt; node.textContent = txt; } }

    function render(ms, force) {
      var sk = sky(ms), H = E.houses(ms, place.lat, place.lon);
      last.ms = ms;
      var mc = H.mc, rho = place.lon - mc;                              // ring turn: L is drawn at the angle rho + L
      function at(L) { return norm(rho + L); }

      /* night shading, only when the Sun has moved */
      var key = sk.sun.lat.toFixed(2) + "," + sk.sun.lon.toFixed(2);
      if (key !== last.sunKey || force) { last.sunKey = key; drawShade(cvShade, sk.sun.lat, sk.sun.lon); }

      /* zodiac */
      gZod.setAttribute("transform", "rotate(" + f2(-rho) + ")");
      for (var s = 0; s < 12; s++) { var sp = pol((RZ0 + RZ1) / 2 - 2, at(s * 30 + 15)); signEls[s].setAttribute("transform", "translate(" + f2(sp[0]) + " " + f2(sp[1]) + ") scale(0.3) translate(-50 -50)"); }

      /* houses */
      gHouse.setAttribute("display", show.houses ? "" : "none");
      mcLine.setAttribute("display", show.houses ? "" : "none"); icLine.setAttribute("display", show.houses ? "" : "none");
      var cusps = H.cusps, cd = "", ad = "", i, angIdx = { 0: "AC", 3: "IC", 6: "DC", 9: "MC" };
      if (show.houses) {
        for (i = 0; i < 12; i++) {
          var seg = "M" + P(RZ1, at(cusps[i])) + "L" + P(RH1, at(cusps[i]));
          if (angIdx[i]) ad += seg; else cd += seg;
          var nxt = cusps[(i + 1) % 12], mid = cusps[i] + norm(nxt - cusps[i]) / 2, np = pol((RZ1 + RH1) / 2, at(mid));
          numEls[i].setAttribute("x", f2(np[0])); numEls[i].setAttribute("y", f2(np[1]));
          if (angIdx[i]) { var ap = pol((RZ1 + RH1) / 2, at(cusps[i])); setT(angEls[angIdx[i]], ap[0], ap[1]); }
        }
        cuspPath.setAttribute("d", cd); anglePath.setAttribute("d", ad);
      }

      /* map: the pin, its meridian, the Sun and the Moon */
      var pp = mapPt(place.lat, place.lon), sp2 = mapPt(sk.sun.lat, sk.sun.lon), mp = mapPt(sk.moon.lat, sk.moon.lon);
      setT(pinG, pp[0], pp[1]); setT(sunG, sp2[0], sp2[1]); setT(moonG, mp[0], mp[1]);
      var m1 = pol(RB0 - 2, place.lon), m2 = pol(RB0 - 2, place.lon + 180);
      mcLine.setAttribute("x2", f2(m1[0])); mcLine.setAttribute("y2", f2(m1[1])); icLine.setAttribute("x2", f2(m2[0])); icLine.setAttribute("y2", f2(m2[1]));
      var psi = norm(sk.moonLon - sk.sunLon), illum = (1 - Math.cos(psi * RAD)) / 2;
      moonLit.setAttribute("d", moonPath(illum, psi < 180));
      moonLit.setAttribute("transform", "rotate(" + f2(Math.atan2(sp2[1] - mp[1], sp2[0] - mp[0]) * DEG) + ")");
      pinTxt.textContent = place.name;

      /* planets, spread so that the beads do not touch */
      var lons = lonsAt(ms, sk);
      gPl.setAttribute("display", show.planets ? "" : "none");
      if (show.planets) {
        var items = [];
        BODIES.forEach(function (k) {
          var ok = isFinite(lons[k]);
          plEls[k].g.setAttribute("display", ok ? "" : "none");                      // Chiron is only tabled for 1900 to 2100
          if (ok) items.push({ key: k, lon: lons[k], ang: at(lons[k]), w: 33 });
        });
        W.spread(items);
        items.forEach(function (it) {
          var e = plEls[it.key], b = pol(RP, it.ang), tr = at(it.lon);
          e.bead.setAttribute("transform", "translate(" + f2(b[0]) + " " + f2(b[1]) + ")");
          e.lead.setAttribute("d", "M" + P(RP - RPB, it.ang) + "L" + P(RH1 + 8, tr) + "L" + P(RH1, tr));
          var rt = last.retro[it.key] === true; e.retro.setAttribute("display", rt ? "" : "none");
        });
      }

      /* hands: UTC */
      var p = utcParts(ms), frac = ((ms % 1000) + 1000) % 1000 / 1000, sec = p.s + (clock.speed === 1 && clock.playing ? 0 : frac);
      hHour.setAttribute("transform", "rotate(" + f2((p.h + p.mi / 60 + sec / 3600) * 15) + ")");
      hMin.setAttribute("transform", "rotate(" + f2((p.mi + sec / 60) * 6) + ")");
      hSec.setAttribute("transform", "rotate(" + f2(sec * 6) + ")");
      hSec.setAttribute("display", Math.abs(clock.speed) > 600 ? "none" : "");

      /* the words */
      setText("clock", readNodes.clock, fmtTime(ms));
      setText("date", readNodes.date, fmtDate(ms) + " (UTC)");
      var live = clock.isLive(), spd = Math.abs(clock.speed), spLab = "";
      for (i = 0; i < SPEEDS.length; i++) if (SPEEDS[i][0] === spd) spLab = SPEEDS[i][1];
      setText("status", readNodes.status, live ? "Live: the sky right now" : (clock.playing ? "Simulated: " + (spLab || "×" + spd) + (clock.speed < 0 ? ", backwards" : "") : "Simulated: paused"));
      readNodes.status.classList.toggle("is-sim", !live);
      setText("play", readNodes.play, clock.playing ? "Pause" : "Play");
      setText("speed", readNodes.speed, spLab || "×" + spd);
      readNodes.rev.setAttribute("aria-pressed", String(clock.speed < 0));
      if (document.activeElement !== readNodes.when && performance.now() - last.text > 400) readNodes.when.value = new Date(ms).toISOString().slice(0, 19);

      if (performance.now() - last.text > 200 || force) {
        last.text = performance.now();
        var sunAlt = Math.asin(Math.sin(place.lat * RAD) * Math.sin(sk.sun.lat * RAD) + Math.cos(place.lat * RAD) * Math.cos(sk.sun.lat * RAD) * Math.cos((place.lon - sk.sun.lon) * RAD)) * DEG;
        var solar = norm((p.h + p.mi / 60 + p.s / 3600) * 15 + place.lon) / 15;      // mean local time of the pin, in hours
        var sh = Math.floor(solar), smin = Math.floor((solar - sh) * 60);
        var local = "";
        if (place.tz) { try { local = new Intl.DateTimeFormat("en-GB", { timeZone: place.tz, hour: "2-digit", minute: "2-digit", weekday: "short", day: "numeric", month: "short" }).format(new Date(ms)); } catch (e) { local = ""; } }
        var phase = E.PHASES[(psi < 1.5 || psi > 358.5) ? 0 : Math.floor(((psi + 22.5) % 360) / 45)];
        var sunState = sunAlt > 0.83 ? "Day: the Sun is " + Math.round(sunAlt) + "° above the horizon" : sunAlt > -6 ? "Twilight: the Sun is at " + sunAlt.toFixed(1) + "°" : sunAlt > -18 ? "Dusk or dawn dark: the Sun is " + Math.abs(Math.round(sunAlt)) + "° below the horizon" : "Night: the Sun is " + Math.abs(Math.round(sunAlt)) + "° below the horizon";
        var asc = H.asc;
        var htmlA =
          card("Sun over", latText(sk.sun.lat) + " " + lonText(sk.sun.lon), signText(sk.sunLon)) +
          card("Moon over", latText(sk.moon.lat) + " " + lonText(sk.moon.lon), signText(sk.moonLon)) +
          card("Moon phase", phase, Math.round(illum * 100) + "% lit");
        var htmlB =
          card("The pin: " + place.name, latText(place.lat) + " " + lonText(place.lon), sunState + ". " + (local ? "Clock time " + local + ". " : "") + "Mean local time " + two(sh) + ":" + two(smin) + ".", "rd-wide") +
          card("Angles (" + H.system + ")", "AC " + signText(asc), "MC " + signText(mc), "rd-wide");
        if (readCache.ra !== htmlA) { readCache.ra = htmlA; readNodes.readA.innerHTML = htmlA; }
        if (readCache.rb !== htmlB) { readCache.rb = htmlB; readNodes.readB.innerHTML = htmlB; }
        /* positions in the zodiac */
        var chips = "";
        BODIES.forEach(function (k) {
          if (!isFinite(lons[k])) return;
          var sp3 = E.split(lons[k]);
          chips += '<li><span class="chip-g" style="--cn:' + tint(k) + ';--cp:' + tint(k, true) + '">' + W.glyphSvg(k, 22, "currentColor") + '</span><span class="chip-n" title="' + NAMES[k] + '">' + (k === "node" ? "Node" : NAMES[k]) + '</span><span class="chip-v">' + sp3.deg + "°" + two(sp3.min) + "′ " + sp3.sign + (last.retro[k] ? ' <i class="chip-r" title="retrograde">R</i>' : "") + "</span></li>";
        });
        if (readCache.chips !== chips) { readCache.chips = chips; readNodes.chips.innerHTML = chips; }
        plTitles(lons);
      }
      /* the screen-reader summary, once a minute of simulated time */
      var minute = Math.floor(ms / 60000);
      if (minute !== last.aria) {
        last.aria = minute;
        stage.setAttribute("aria-label", "Celestial clock. " + fmtDate(ms) + " " + fmtTime(ms).slice(0, 5) + " UTC. The Sun is over " + latText(sk.sun.lat) + " " + lonText(sk.sun.lon) + ", the Moon over " + latText(sk.moon.lat) + " " + lonText(sk.moon.lon) + ". The pin is at " + place.name + ".");
      }
    }
    function card(h, big, small, cls) { return '<div class="rd' + (cls ? " " + cls : "") + '"><p class="rd-h">' + esc(h) + '</p><p class="rd-v">' + esc(big) + '</p><p class="rd-s">' + esc(small) + "</p></div>"; }
    function plTitles(lons) { BODIES.forEach(function (k) { if (isFinite(lons[k])) plEls[k].title.textContent = NAMES[k] + " " + signText(lons[k]) + (last.retro[k] ? ", retrograde" : ""); }); }

    var readNodes = { clock: q("[data-clock]"), date: q("[data-date]"), status: q("[data-status]"), play: q("[data-play]"), speed: q("[data-speed]"), rev: q("[data-rev]"), when: q("[data-when]"), readA: q("[data-read-a]"), readB: q("[data-read-b]"), chips: q("[data-chips]"), save: q("[data-save]"), saveLab: q("[data-save-lab]") };

    /* ----- controls ----- */
    function speedIndex() { for (var i = 0; i < SPEEDS.length; i++) if (SPEEDS[i][0] === Math.abs(clock.speed)) return i; return 0; }
    function setSpeedIdx(i) { i = Math.max(0, Math.min(maxSpeed, i)); clock.setSpeed((clock.speed < 0 ? -1 : 1) * SPEEDS[i][0]); }
    q("[data-play]").addEventListener("click", function () { clock.toggle(); });
    q("[data-now]").addEventListener("click", function () { clock.live(); });
    q("[data-slow]").addEventListener("click", function () { setSpeedIdx(speedIndex() - 1); });
    q("[data-fast]").addEventListener("click", function () { setSpeedIdx(speedIndex() + 1); if (!clock.playing) clock.play(); });
    q("[data-rev]").addEventListener("click", function () { clock.setSpeed(-clock.speed); if (!clock.playing) clock.play(); });
    host.querySelectorAll("[data-step]").forEach(function (b) { b.addEventListener("click", function () { clock.set(clock.now() + parseInt(b.getAttribute("data-step"), 10)); }); });
    function go() {
      var v = readNodes.when.value; if (!v) return;
      var t = Date.parse(v.length === 16 ? v + ":00Z" : v + "Z");
      if (isFinite(t)) clock.set(t);
    }
    q("[data-go]").addEventListener("click", go);
    readNodes.when.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
    readNodes.when.addEventListener("change", go);
    q("[data-event]").addEventListener("change", function (e) {
      var sel = e.target, v = sel.value, now = clock.now(), t = null, d0 = new Date(now), ob;
      try {
        if (v === "full") { var r1 = A.SearchMoonPhase(180, d0, 40); t = r1 && r1.date.getTime(); }
        else if (v === "new") { var r2 = A.SearchMoonPhase(0, d0, 40); t = r2 && r2.date.getTime(); }
        else if (v === "season") {
          var y = d0.getUTCFullYear(), c = [];
          [y, y + 1].forEach(function (yy) { var ss = A.Seasons(yy); [ss.mar_equinox, ss.jun_solstice, ss.sep_equinox, ss.dec_solstice].forEach(function (x) { c.push(x.date.getTime()); }); });
          c = c.filter(function (x) { return x > now + 1000; }).sort(function (a, b) { return a - b; }); t = c[0];
        } else if (v === "rise" || v === "set") {
          ob = new A.Observer(place.lat, place.lon, 0);
          var r3 = A.SearchRiseSet(A.Body.Sun, ob, v === "rise" ? +1 : -1, d0, 2); t = r3 && r3.date.getTime();
        }
      } catch (err) { t = null; }
      sel.value = "";
      if (t) clock.set(t);
    });


    /* ----- Save as PNG: the date, the saying, then the clock exactly as it stands (built in the browser, nothing is sent) ----- */
    var saveBusy = false;
    function setSave(t) { readNodes.saveLab.textContent = t; }
    function inlineSvg(size) {                                           // the SVG with its styles written into it, so that an <img> can draw it
      var clone = svg.cloneNode(true), src = svg.querySelectorAll("*"), dst = clone.querySelectorAll("*"), i;
      var props = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight", "letter-spacing", "text-anchor", "dominant-baseline", "paint-order", "display"];
      var FS = { "a-hr": 21, "a-hr-minor": 15, "a-pin-t": 17, "a-hnum": 16 };            // the desktop sizes, whatever the screen the button was pressed on
      for (i = 0; i < src.length; i++) {
        var cs = getComputedStyle(src[i]), st = "", cls = dst[i].getAttribute("class") || "", par = dst[i].parentNode && dst[i].parentNode.getAttribute && (dst[i].parentNode.getAttribute("class") || "");
        props.forEach(function (pn) { var v = cs.getPropertyValue(pn); if (v) st += pn + ":" + v + ";"; });
        if (FS[cls]) st += "font-size:" + FS[cls] + "px;";
        if (cls === "a-hr-minor") st += "display:inline;";
        if (par === "a-ang" && dst[i].tagName === "text") st += "font-size:13px;";
        dst[i].setAttribute("style", st);
      }
      clone.setAttribute("xmlns", NS); clone.setAttribute("width", size); clone.setAttribute("height", size);
      clone.setAttribute("style", "overflow:visible;font-family:Arial,Helvetica,'Liberation Sans',sans-serif");
      clone.removeAttribute("aria-hidden"); clone.removeAttribute("focusable");
      return new XMLSerializer().serializeToString(clone);
    }
    function buildPng(ms, done) {
      var S = 1440, PX = 80, Wd = S + 2 * PX, TOP = 120;
      var serif = "Literata, Georgia, 'Times New Roman', serif", sans = "Arial, Helvetica, 'Liberation Sans', sans-serif";
      var u = utcParts(ms), dateTxt = DAYS_LONG[u.w] + " " + u.D + " " + MONTHS_LONG[u.M] + " " + u.Y, timeTxt = fmtTime(ms) + " UTC";
      var quoteY = TOP + 190, stageY = quoteY + QUOTE.length * 60 + 130, footY = stageY + S + 78, Ht = footY + 60;
      var cv = document.createElement("canvas"); cv.width = Wd; cv.height = Ht;
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#061424"; ctx.fillRect(0, 0, Wd, Ht);
      var glow = ctx.createRadialGradient(Wd / 2, 0, 20, Wd / 2, 0, 1000);
      glow.addColorStop(0, "rgba(255,143,16,0.13)"); glow.addColorStop(1, "rgba(255,143,16,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, Wd, Ht);
      ctx.strokeStyle = "rgba(201,165,90,0.55)"; ctx.lineWidth = 2; ctx.strokeRect(24, 24, Wd - 48, Ht - 48);
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#efe4c6"; ctx.font = "600 66px " + serif; ctx.fillText(dateTxt, Wd / 2, TOP);
      ctx.fillStyle = "#ff8f10"; ctx.font = "400 38px " + sans; ctx.fillText(timeTxt, Wd / 2, TOP + 58);
      ctx.strokeStyle = "rgba(255,143,16,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Wd / 2 - 70, TOP + 100); ctx.lineTo(Wd / 2 + 70, TOP + 100); ctx.stroke();
      ctx.fillStyle = "#f3ecd8"; ctx.font = "italic 400 43px " + serif;
      QUOTE.forEach(function (ln, i) { ctx.fillText(ln, Wd / 2, quoteY + i * 60); });
      ctx.fillStyle = "#b9a878"; ctx.font = "400 22px " + sans;
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "4px";
      ctx.fillText("TAO TE CHING, 25", Wd / 2, quoteY + QUOTE.length * 60 + 18);
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";

      /* the clock: plate, map, night, then the instrument */
      var cx = PX + S / 2, cy = stageY + S / 2;
      var plate = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
      plate.addColorStop(0, "#0d2a4a"); plate.addColorStop(0.55, "#08203a"); plate.addColorStop(1, "#061424");
      ctx.fillStyle = plate; ctx.beginPath(); ctx.arc(cx, cy, S / 2, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = "rgba(201,165,90,0.6)"; ctx.lineWidth = 2; ctx.stroke();
      var mapPx = Math.round(S * 0.66), off = document.createElement("canvas"); off.width = mapPx; off.height = mapPx;
      drawMap(off, { grid: show.grid });
      var mx = PX + S * 0.17, my = stageY + S * 0.17;
      ctx.drawImage(off, mx, my, mapPx, mapPx);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, S * 0.33, 0, 6.2832); ctx.clip();
      ctx.imageSmoothingEnabled = true; if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
      ctx.drawImage(cvShade, mx, my, mapPx, mapPx);
      ctx.restore();
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, PX, stageY, S, S);
        ctx.fillStyle = "#9aa9ba"; ctx.font = "400 26px " + sans; ctx.textAlign = "center";
        ctx.fillText("©TwelveCubed · the celestial clock · pin: " + place.name, Wd / 2, footY);
        done(cv, ms);
      };
      img.onerror = function () { done(null, ms); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(inlineSvg(S));
    }
    function savePng() {
      if (saveBusy) return;
      saveBusy = true; setSave("Preparing…");
      var ms = last.ms >= 0 ? last.ms : clock.now(), fl = [];
      try { fl = [document.fonts.load("600 66px Literata"), document.fonts.load("italic 400 43px Literata")]; } catch (e) { fl = []; }
      Promise.all(fl).catch(function () { /* the fallback serif is fine */ }).then(function () {
        buildPng(ms, function (cv) {
          if (!cv) { saveBusy = false; setSave("Could not save"); setTimeout(function () { setSave("Save as PNG"); }, 2500); return; }
          var u = utcParts(ms), name = "twelvecubed-celestial-clock-" + u.Y + "-" + two(u.M + 1) + "-" + two(u.D) + "-" + two(u.h) + two(u.mi) + "utc.png";
          cv.toBlob(function (b) {
            if (b) {
              var a = document.createElement("a"), url = URL.createObjectURL(b);
              a.href = url; a.download = name; a.style.display = "none"; document.body.appendChild(a); a.click();
              setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
              setSave("Saved");
            } else setSave("Could not save");
            saveBusy = false; setTimeout(function () { setSave("Save as PNG"); }, 2200);
          }, "image/png");
        });
      });
    }
    readNodes.save.addEventListener("click", savePng);

    /* the pin */
    var placeSel = q("[data-place]");
    function syncPlaceSelect() { placeSel.value = place.tz && TZP[place.tz] && TZP[place.tz][0] + ", " + TZP[place.tz][1] === place.name ? place.tz : "__pin"; }
    function setPlace(p) {
      place = p; store("tc_astro_place", JSON.stringify(p)); syncPlaceSelect(); clock.kick();
    }
    syncPlaceSelect();
    placeSel.addEventListener("change", function () {
      var v = placeSel.value; if (v === "__pin") return;
      var t = TZP[v]; if (t) setPlace({ name: t[0] + ", " + t[1], lat: t[3], lon: t[4], tz: v });
    });
    q("[data-here]").addEventListener("click", function () {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function (pos) { setPlace({ name: "Your location", lat: pos.coords.latitude, lon: pos.coords.longitude }); }, function () { /* declined */ }, { timeout: 8000 });
    });
    stage.addEventListener("click", function (ev) {
      var r = stage.getBoundingClientRect(), k = 1000 / r.width, x = (ev.clientX - r.left - r.width / 2) * k, y = (ev.clientY - r.top - r.height / 2) * k, d = Math.sqrt(x * x + y * y);
      if (d > RM) return;
      var lat = 90 - 180 * d / RM, lon = wrap180(Math.atan2(x, y) * DEG);
      setPlace({ name: latText(lat) + " " + lonText(lon), lat: Math.max(-89.5, Math.min(89.5, lat)), lon: lon });
    });
    host.querySelectorAll("[data-show]").forEach(function (cb) {
      var k = cb.getAttribute("data-show"); cb.checked = show[k];
      cb.addEventListener("change", function () {
        show[k] = cb.checked; store("tc_astro_" + k, cb.checked ? "1" : "0");
        if (k === "grid") redrawMap();
        clock.kick();
      });
    });

    /* ----- the loop: only while the clock is on screen, and not faster than the picture changes ----- */
    var visible = true, lastDraw = 0;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) clock.kick(); }, { rootMargin: "200px" }).observe(stage);
    clock.on(function (ms, force) {
      if (!visible && !force) return;
      var now = performance.now(), sp = Math.abs(clock.speed);
      var gap = !clock.playing ? 0 : sp === 1 ? 900 : sp <= 60 ? 50 : 30;
      if (!force && now - lastDraw < gap) return;
      lastDraw = now;
      try { render(ms, !!force); } catch (e) { if (window.console) console.error(e); }
    });
    clock.kick();
  }

  window.TCAstrolabe = { mount: mount };
})();
