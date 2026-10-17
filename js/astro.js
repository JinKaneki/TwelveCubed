/* Chart finder maths. Sun and Moon come from the open-source astronomy-engine library (MIT);
   the Rising sign is computed here from sidereal time. Tropical zodiac, geocentric, true
   positions, whole-sign output. Runs entirely in the browser: nothing is sent anywhere.

   Browser:  window.TCAstro   (needs window.Astronomy loaded first)
   Node:     require("./astro.js")(require("../vendor/astronomy.browser.min.js"))   (used by the tests) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.TCAstro = factory(root.Astronomy);
})(typeof self !== "undefined" ? self : this, function (Astronomy) {
  "use strict";

  var SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var RAD = Math.PI / 180;

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function signIndex(lon) { return Math.floor(norm(lon) / 30); }

  /* ---------- ecliptic longitudes (degrees, tropical, of date) ---------- */

  function sunLon(ms) { return norm(Astronomy.SunPosition(new Date(ms)).elon); }
  function moonLon(ms) { return norm(Astronomy.EclipticGeoMoon(new Date(ms)).lon); }

  /* Ascendant: ecliptic longitude of the eastern horizon. RAMC is local sidereal time in degrees. */
  function ascLon(ms, lat, lon) {
    var gast = Astronomy.SiderealTime(new Date(ms)); // hours, apparent
    var ramc = norm(gast * 15 + lon) * RAD;
    var T = (ms / 86400000 + 2440587.5 - 2451545.0) / 36525;
    var eps = (23.439291111 - 0.013004167 * T - 1.63889e-7 * T * T + 5.0361e-7 * T * T * T) * RAD; // mean obliquity
    var phi = Math.max(-89.9, Math.min(89.9, lat)) * RAD;
    return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / RAD);
  }

  /* ---------- civil time and time zones (uses the browser's tz database, including history) ---------- */

  var FMT = {};
  function formatter(tz) {
    return FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric"
    }));
  }
  /* Offset of the zone from UTC at an instant, in seconds (east is positive). */
  function offsetSec(ms, tz) {
    var sec = Math.floor(ms / 1000) * 1000, p = {};
    formatter(tz).formatToParts(new Date(sec)).forEach(function (x) { p[x.type] = x.value; });
    var h = +p.hour === 24 ? 0 : +p.hour;
    return (Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second) - sec) / 1000;
  }

  /* Wall-clock time in a zone to an instant. status is "ok", "gap" (the clock skipped this time)
     or "overlap" (the clock showed this time twice; the first is used). */
  function localToUtc(y, mo, d, h, mi, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, 0), found = {};
    [-86400000, 0, 86400000].forEach(function (shift) {
      var off = offsetSec(guess + shift, tz), utc = guess - off * 1000;
      if (offsetSec(utc, tz) === off) found[utc] = off;
    });
    var keys = Object.keys(found).map(Number).sort(function (a, b) { return a - b; });
    if (keys.length === 0) {
      var before = offsetSec(guess - 86400000, tz);
      return { ms: guess - before * 1000, status: "gap" };
    }
    return { ms: keys[0], status: keys.length > 1 ? "overlap" : "ok" };
  }

  function localParts(ms, tz) {
    var p = {};
    formatter(tz).formatToParts(new Date(Math.floor(ms / 1000) * 1000)).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour === 24 ? 0 : +p.hour, mi: +p.minute };
  }
  function clock(ms, tz) {
    var p = localParts(ms, tz);
    return (p.h < 10 ? "0" : "") + p.h + ":" + (p.mi < 10 ? "0" : "") + p.mi;
  }

  /* ---------- scanning a window for sign changes ---------- */

  function segments(fn, t0, t1, stepMs) {
    var segs = [{ sign: signIndex(fn(t0)), from: t0, to: t1 }];
    for (var t = t0 + stepMs; t <= t1 + 1; t += stepMs) {
      var tt = Math.min(t, t1), s = signIndex(fn(tt)), last = segs[segs.length - 1];
      if (s !== last.sign) {
        var lo = Math.max(tt - stepMs, t0), hi = tt;
        while (hi - lo > 20000) {
          var mid = (lo + hi) / 2;
          if (signIndex(fn(mid)) === last.sign) lo = mid; else hi = mid;
        }
        last.to = hi;
        segs.push({ sign: s, from: hi, to: t1 });
      }
    }
    return segs;
  }

  /* Other signs this light touches within +/- minutes of an instant. */
  function nearby(fn, ms, minutes) {
    var here = signIndex(fn(ms)), out = [];
    [-minutes, minutes].forEach(function (m) {
      var s = signIndex(fn(ms + m * 60000));
      if (s !== here && out.indexOf(s) < 0) out.push(s);
    });
    return out;
  }

  function exact(fn, ms, nearMinutes) {
    var lon = fn(ms), within = lon % 30;
    return {
      kind: "exact", lon: lon, sign: SIGNS[signIndex(lon)], deg: Math.floor(within), min: Math.floor((within % 1) * 60),
      near: nearby(fn, ms, nearMinutes).map(function (i) { return SIGNS[i]; }), nearMinutes: nearMinutes
    };
  }
  function range(fn, t0, t1, stepMs, tz) {
    return {
      kind: "range",
      segments: segments(fn, t0, t1, stepMs).map(function (s) {
        return { sign: SIGNS[s.sign], from: s.from, to: s.to, fromClock: clock(s.from, tz), toClock: clock(s.to, tz) };
      })
    };
  }

  /* ---------- the whole calculation ----------
     input: { y, mo, d, time: {h, mi} | null, tz: "Area/City", place: {lat, lon} | null }
     Each light comes back as one of:
       {kind:"exact", sign, deg, min, near:[signs]}      the instant is known
       {kind:"range", segments:[{sign, fromClock, toClock}]}   only the day is known; signs through the day
       {kind:"needs", what:"time"|"place"|"time and place"}                                          */
  function compute(inp) {
    var tz = inp.tz, out = { tz: tz, notes: [], instant: null, sun: null, moon: null, rising: null };
    var hasPlace = !!(inp.place && isFinite(inp.place.lat) && isFinite(inp.place.lon));
    var dayStart = localToUtc(inp.y, inp.mo, inp.d, 0, 0, tz).ms;
    var next = new Date(Date.UTC(inp.y, inp.mo - 1, inp.d + 1));
    var dayEnd = localToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, tz).ms;

    if (hasPlace && Math.abs(inp.place.lat) > 66.5) {
      out.notes.push("This place is inside the polar circle, where the Rising sign is unreliable and some houses are undefined.");
    }

    if (inp.time) {
      var t = localToUtc(inp.y, inp.mo, inp.d, inp.time.h, inp.time.mi, tz);
      out.instant = { ms: t.ms, status: t.status, iso: new Date(t.ms).toISOString() };
      if (t.status === "gap") out.notes.push("That clock time did not exist in this zone on this date (the clocks skipped it). The nearest valid moment was used.");
      if (t.status === "overlap") out.notes.push("That clock time happened twice (the clocks went back). The first occurrence was used.");
      out.sun = exact(sunLon, t.ms, 60);
      out.moon = exact(moonLon, t.ms, 15);
      out.rising = hasPlace
        ? exact(function (ms) { return ascLon(ms, inp.place.lat, inp.place.lon); }, t.ms, 15)
        : { kind: "needs", what: "place" };
    } else {
      out.sun = range(sunLon, dayStart, dayEnd, 3600000, tz);
      out.moon = range(moonLon, dayStart, dayEnd, 600000, tz);
      out.rising = hasPlace
        ? range(function (ms) { return ascLon(ms, inp.place.lat, inp.place.lon); }, dayStart, dayEnd, 300000, tz)
        : { kind: "needs", what: "time and place" };
    }
    return out;
  }

  return {
    SIGNS: SIGNS, compute: compute, localToUtc: localToUtc, offsetSec: offsetSec, clock: clock,
    sunLon: sunLon, moonLon: moonLon, ascLon: ascLon, signIndex: signIndex
  };
});
