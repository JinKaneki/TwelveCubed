/* The sky at one moment: ten bodies, the lunar node and apogee, Chiron, the angles, twelve houses,
   the aspects between them and the Moon's phase. Built on astronomy-engine (MIT) and a little spherical
   trigonometry; no other data, nothing sent anywhere. Tropical zodiac, geocentric, apparent positions.

   Browser:  window.TCEphem  (needs window.Astronomy and window.TCAstro loaded first; js/chiron.js is optional)
   Node:     require("./ephem.js")(require("../vendor/astronomy.browser.min.js"), require("./astro.js")(Astronomy))   (tests)

   chart({ ms, lat, lon }) -> { ms, bodies[], points{}, angles, houses[], system, aspects[], moon }
   lat and lon may be null: then there are no angles, no houses and no Rising.                         */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.TCEphem = factory(root.Astronomy, root.TCAstro, root.TC_CHIRON);
})(typeof self !== "undefined" ? self : this, function (Astronomy, TCAstro, CHIRON) {
  "use strict";

  var SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var AU_KM = 149597870.7, MU_EARTH_MOON = 403503.2362; // km^3 / s^2

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function diff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }   // a - b in (-180, 180]
  function at(ms) { return new Date(ms); }

  /* ---------- the bodies ---------- */
  var BODIES = [
    { key: "sun", name: "Sun" }, { key: "moon", name: "Moon" },
    { key: "mercury", name: "Mercury", eng: "Mercury" }, { key: "venus", name: "Venus", eng: "Venus" },
    { key: "mars", name: "Mars", eng: "Mars" }, { key: "jupiter", name: "Jupiter", eng: "Jupiter" },
    { key: "saturn", name: "Saturn", eng: "Saturn" }, { key: "uranus", name: "Uranus", eng: "Uranus" },
    { key: "neptune", name: "Neptune", eng: "Neptune" }, { key: "pluto", name: "Pluto", eng: "Pluto" }
  ];
  var EXTRAS = [
    { key: "chiron", name: "Chiron" }, { key: "node", name: "True Node" }, { key: "lilith", name: "True Lilith" }
  ];

  function planetLon(eng, ms) {
    var v = Astronomy.GeoVector(Astronomy.Body[eng], at(ms), true);
    return norm(Astronomy.Ecliptic(v).elon);
  }

  /* Moon geocentric state in the ecliptic frame (km, km/s), by central difference. */
  function moonState(ms) {
    function xyz(t) {
      var m = Astronomy.EclipticGeoMoon(at(t)), d = m.dist * AU_KM, la = m.lat * RAD, lo = m.lon * RAD;
      return [d * Math.cos(la) * Math.cos(lo), d * Math.cos(la) * Math.sin(lo), d * Math.sin(la)];
    }
    var dt = 600000, a = xyz(ms - dt), b = xyz(ms + dt), r = xyz(ms), s = 2 * dt / 1000;
    return { r: r, v: [(b[0] - a[0]) / s, (b[1] - a[1]) / s, (b[2] - a[2]) / s] };
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  /* Osculating ascending node and apogee of the Moon's orbit (what charts call True Node and True Lilith). */
  function lunarPoints(ms) {
    var st = moonState(ms), r = st.r, v = st.v, h = cross(r, v);
    var rn = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]);
    var vh = cross(v, h);
    var e = [vh[0] / MU_EARTH_MOON - r[0] / rn, vh[1] / MU_EARTH_MOON - r[1] / rn, vh[2] / MU_EARTH_MOON - r[2] / rn];
    return { node: norm(Math.atan2(h[0], -h[1]) * DEG), lilith: norm(Math.atan2(-e[1], -e[0]) * DEG) };
  }

  function lonOf(key, ms) {
    var i, b;
    if (key === "sun") return norm(Astronomy.SunPosition(at(ms)).elon);
    if (key === "moon") return norm(Astronomy.EclipticGeoMoon(at(ms)).lon);
    if (key === "node") return lunarPoints(ms).node;
    if (key === "lilith") return lunarPoints(ms).lilith;
    if (key === "chiron") return CHIRON && CHIRON.lon ? CHIRON.lon(ms, Astronomy) : NaN;
    for (i = 0; i < BODIES.length; i++) { b = BODIES[i]; if (b.key === key) return planetLon(b.eng, ms); }
    return NaN;
  }
  /* degrees per day, signed (negative = retrograde) */
  function speedOf(key, ms) {
    var h = key === "moon" ? 1800000 : 43200000;
    return diff(lonOf(key, ms + h), lonOf(key, ms - h)) / (2 * h / 86400000);
  }

  /* ---------- angles and houses ---------- */
  function meanObliquity(ms) {
    var T = (ms / 86400000 + 2440587.5 - 2451545.0) / 36525;
    return (23.439291111 - 0.013004167 * T - 1.63889e-7 * T * T + 5.0361e-7 * T * T * T) * RAD;
  }
  function ramcOf(ms, lon) { return norm(Astronomy.SiderealTime(at(ms)) * 15 + lon); }   // degrees
  function ascFrom(ramcDeg, eps, latDeg) {
    var ramc = ramcDeg * RAD, phi = Math.max(-89.9, Math.min(89.9, latDeg)) * RAD;
    return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * DEG);
  }
  function mcFrom(ramcDeg, eps) {
    var ramc = ramcDeg * RAD;
    return norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * DEG);
  }
  function lonFromRA(raDeg, eps) { var ra = raDeg * RAD; return norm(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) * DEG); }

  /* Placidus cusps by iteration; returns null where the method breaks down (near the polar circles). */
  function placidus(ramc, eps, lat) {
    var phi = lat * RAD, tphi = Math.tan(phi), out = {};
    var plan = [[11, 30, 1 / 3], [12, 60, 2 / 3], [2, 120, 2 / 3], [3, 150, 1 / 3]];
    for (var i = 0; i < plan.length; i++) {
      var n = plan[i][0], base = plan[i][1], k = plan[i][2], A = 0, ra = ramc + base, lam = 0;
      for (var it = 0; it < 40; it++) {
        lam = lonFromRA(ra, eps) * RAD;
        var dec = Math.asin(Math.sin(eps) * Math.sin(lam)), x = tphi * Math.tan(dec);
        if (Math.abs(x) >= 1) return null;
        var nA = Math.asin(x) * DEG;
        var nra = ramc + base + k * nA;
        if (Math.abs(nra - ra) < 1e-9) { ra = nra; A = nA; break; }
        ra = nra; A = nA;
      }
      out[n] = lonFromRA(ra, eps);
    }
    return out;
  }

  function houses(ms, lat, lon) {
    var eps = meanObliquity(ms), ramc = ramcOf(ms, lon);
    var asc = ascFrom(ramc, eps, lat), mc = mcFrom(ramc, eps);
    var cusps = new Array(13), system = "Placidus", pl = Math.abs(lat) < 66.4 ? placidus(ramc, eps, lat) : null;
    cusps[1] = asc; cusps[10] = mc; cusps[7] = norm(asc + 180); cusps[4] = norm(mc + 180);
    if (pl) {
      cusps[11] = pl[11]; cusps[12] = pl[12]; cusps[2] = pl[2]; cusps[3] = pl[3];
    } else {
      /* Porphyry: split each quadrant into three equal parts (used inside the polar circles) */
      system = "Porphyry";
      var q1 = norm(asc - mc), q2 = norm(cusps[4] - asc);
      cusps[11] = norm(mc + q1 / 3); cusps[12] = norm(mc + 2 * q1 / 3);
      cusps[2] = norm(asc + q2 / 3); cusps[3] = norm(asc + 2 * q2 / 3);
    }
    cusps[5] = norm(cusps[11] + 180); cusps[6] = norm(cusps[12] + 180);
    cusps[8] = norm(cusps[2] + 180); cusps[9] = norm(cusps[3] + 180);
    var vlat = 90 - Math.abs(lat);
    var vertex = ascFrom(norm(ramc + 180), eps, lat >= 0 ? vlat : -vlat);
    if (norm(vertex - cusps[4]) >= 180) vertex = norm(vertex + 180);   // the Vertex always lies in the western half
    return {
      system: system, cusps: cusps.slice(1), asc: asc, mc: mc, ramc: ramc, eps: eps,
      ep: ascFrom(ramc, eps, 0), vertex: vertex
    };
  }

  /* ---------- aspects ---------- */
  var ASPECTS = [
    { key: "conjunction", name: "Conjunction", angle: 0, orb: 8, color: "#6b7280", draw: false },
    { key: "opposition", name: "Opposition", angle: 180, orb: 8, color: "#e8001c" },
    { key: "trine", name: "Trine", angle: 120, orb: 8, color: "#1f2fff" },
    { key: "square", name: "Square", angle: 90, orb: 7, color: "#e8001c" },
    { key: "sextile", name: "Sextile", angle: 60, orb: 5, color: "#4cc3e6" },
    { key: "quincunx", name: "Quincunx", angle: 150, orb: 3, color: "#14a014" },
    { key: "semisextile", name: "Semi-sextile", angle: 30, orb: 2, color: "#a23aa8", dash: true }
  ];
  function aspectsOf(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var d = Math.abs(diff(list[i].lon, list[j].lon));
      for (var k = 0; k < ASPECTS.length; k++) {
        var A = ASPECTS[k], orb = Math.abs(d - A.angle);
        var lum = (list[i].key === "sun" || list[i].key === "moon" || list[j].key === "sun" || list[j].key === "moon") ? 2 : 0;
        if (orb <= A.orb + (A.angle === 0 || A.angle === 180 || A.angle === 120 || A.angle === 90 ? lum : 0)) {
          out.push({ a: list[i].key, b: list[j].key, type: A.key, orb: orb });
          break;
        }
      }
    }
    return out;
  }

  /* ---------- the Moon's phase ---------- */
  var PHASES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  var QUARTERS = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"];
  function moonInfo(ms) {
    var angle = Astronomy.MoonPhase(at(ms));                    // 0 new, 90 first quarter, 180 full, 270 last quarter
    var illum = (1 - Math.cos(angle * RAD)) / 2;
    var idx = Math.floor(((angle + 22.5) % 360) / 45);
    if (angle < 1.5 || angle > 358.5) idx = 0;
    var q = Astronomy.SearchMoonQuarter(at(ms)), nextQ = null;
    if (q) nextQ = { name: QUARTERS[q.quarter], ms: q.time.date.getTime() };
    var nextFull = null;
    try { var f = Astronomy.SearchMoonPhase(180, at(ms), 40); if (f) nextFull = f.date.getTime(); } catch (e) { /* ignore */ }
    var nextNew = null;
    try { var nn = Astronomy.SearchMoonPhase(0, at(ms), 40); if (nn) nextNew = nn.date.getTime(); } catch (e) { /* ignore */ }
    return { angle: angle, illum: illum, waxing: angle < 180, name: PHASES[idx], next: nextQ, nextFull: nextFull, nextNew: nextNew };
  }

  /* ---------- formatting ---------- */
  function split(lon) {          /* the sign comes from the true longitude; the minutes are rounded, as charts print them */
    var L = norm(lon), idx = Math.floor(L / 30), tot = Math.round((L - idx * 30) * 60);
    if (tot > 1799) tot = 1799;
    return { sign: SIGNS[idx], idx: idx, deg: Math.floor(tot / 60), min: tot % 60 };
  }
  function dm(lon) { var s = split(lon); return s.deg + "°" + (s.min < 10 ? "0" : "") + s.min + "′"; }

  /* ---------- the whole sky ---------- */
  function chart(inp) {
    var ms = inp.ms, havePlace = inp.lat != null && inp.lon != null && isFinite(inp.lat) && isFinite(inp.lon);
    var bodies = [], i, list = BODIES.concat(EXTRAS);
    for (i = 0; i < list.length; i++) {
      var b = list[i], lon = lonOf(b.key, ms);
      if (!isFinite(lon)) continue;                              // Chiron may be out of range or not loaded
      var sp = speedOf(b.key, ms), s = split(lon);
      bodies.push({ key: b.key, name: b.name, lon: lon, speed: sp, retro: sp < 0 && b.key !== "sun" && b.key !== "moon",
        sign: s.sign, idx: s.idx, deg: s.deg, min: s.min, extra: i >= BODIES.length });
    }
    var out = { ms: ms, lat: havePlace ? inp.lat : null, lon: havePlace ? inp.lon : null, bodies: bodies,
      angles: null, houses: null, system: null, points: {}, aspects: [], moon: moonInfo(ms) };
    var sun = bodies[0], moon = bodies[1];
    if (havePlace) {
      var H = houses(ms, inp.lat, inp.lon);
      out.angles = { asc: H.asc, mc: H.mc, ep: H.ep, vertex: H.vertex, ramc: H.ramc };
      out.houses = H.cusps; out.system = H.system;
      var sunH = norm(sun.lon - H.cusps[6]), day = sunH >= 0 && sunH < 180;      // the Sun above the horizon (houses 7-12)
      out.points.fortune = norm(day ? H.asc + moon.lon - sun.lon : H.asc + sun.lon - moon.lon);
      out.day = day;
    }
    var core = bodies.filter(function (x) { return !x.extra; }).map(function (x) { return { key: x.key, lon: x.lon }; });
    if (out.angles) { core.push({ key: "asc", lon: out.angles.asc }); core.push({ key: "mc", lon: out.angles.mc }); }
    out.aspects = aspectsOf(core);
    return out;
  }

  /* house number (1-12) of a longitude, given the cusps */
  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i], b = cusps[(i + 1) % 12];
      if (norm(lon - a) < norm(b - a)) return i + 1;
    }
    return 12;
  }

  return {
    SIGNS: SIGNS, BODIES: BODIES, EXTRAS: EXTRAS, ASPECTS: ASPECTS, PHASES: PHASES,
    chart: chart, houses: houses, lonOf: lonOf, speedOf: speedOf, split: split, dm: dm, norm: norm, diff: diff,
    houseOf: houseOf, lunarPoints: lunarPoints, moonInfo: moonInfo, meanObliquity: meanObliquity, ramcOf: ramcOf
  };
});
