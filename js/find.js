/* Chart finder page. Every field is optional. A date gives the Sun (and the Moon on most days),
   a time and place add the Rising. All maths runs here; nothing is uploaded. The cities file
   (about 1 MB) loads only when the place box is first used. */
(function () {
  "use strict";
  var TC = window.TC, Astro = window.TCAstro;
  var form = document.getElementById("birth");
  if (!form || !TC || !Astro) return;

  var el = {
    date: document.getElementById("b-date"), time: document.getElementById("b-time"),
    place: document.getElementById("b-place"), list: document.getElementById("b-places"),
    lat: document.getElementById("b-lat"), lon: document.getElementById("b-lon"), tz: document.getElementById("b-tz"),
    found: document.getElementById("found")
  };
  var dial = window.TCDial.mount({
    dial: document.getElementById("dial"), byName: document.getElementById("by-name"), result: document.getElementById("result")
  });
  el.found.setAttribute("tabindex", "-1");

  /* ---------- cities, loaded on demand ---------- */
  var cities = null, cityPromise = null, norm = null, regionNames = null;
  function fold(t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function loadCities() {
    if (cities) return Promise.resolve(cities);
    if (cityPromise) return cityPromise;
    cityPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = TC.ROOT + "data/cities.js";
      s.onload = function () {
        var d = window.CODEX_CITIES;
        if (!d) { reject(new Error("no data")); return; }
        cities = d;
        norm = d.c.map(function (c) { return fold(c[0]); });
        resolve(d);
      };
      s.onerror = function () { cityPromise = null; reject(new Error("load failed")); };
      document.head.appendChild(s);
    });
    return cityPromise;
  }
  function countryName(cc) {
    try {
      regionNames = regionNames || new Intl.DisplayNames(["en"], { type: "region" });
      return regionNames.of(cc) || cc;
    } catch (e) { return cc; }
  }
  function cityLabel(c) { return c[0] + (c[2] ? ", " + c[2] : "") + ", " + countryName(c[1]); }
  function cityToPlace(c) { return { name: cityLabel(c), lat: c[3], lon: c[4], tz: cities.tz[c[5]] }; }

  function searchCities(q) {
    var f = fold(q.trim());
    if (f.length < 2 || !cities) return [];
    var starts = [], words = [], inside = [];
    for (var i = 0; i < norm.length; i++) {
      var n = norm[i], at = n.indexOf(f);
      if (at === 0) starts.push(i);
      else if (at > 0 && /[\s'\-]/.test(n.charAt(at - 1))) words.push(i);
      else if (at > 0) inside.push(i);
    }
    function byPop(a, b) { return cities.c[b][6] - cities.c[a][6]; }
    return starts.sort(byPop).concat(words.sort(byPop), inside.sort(byPop)).slice(0, 8);
  }

  var picked = null;          // a place chosen from the list
  var activeOpt = -1;
  function closeList() { el.list.hidden = true; el.place.setAttribute("aria-expanded", "false"); activeOpt = -1; }
  function openList(ids) {
    if (!ids.length) { closeList(); return; }
    el.list.innerHTML = ids.map(function (i, k) {
      var c = cities.c[i];
      return '<li role="option" id="b-opt-' + k + '" data-i="' + i + '"><span>' + TC.esc(c[0]) + '</span> <span class="sub">' +
        TC.esc((c[2] ? c[2] + ", " : "") + countryName(c[1])) + "</span></li>";
    }).join("");
    el.list.hidden = false;
    el.place.setAttribute("aria-expanded", "true");
    activeOpt = -1;
  }
  function choose(i) {
    picked = cityToPlace(cities.c[i]);
    el.place.value = picked.name;
    closeList();
  }
  function markActive(n) {
    var opts = el.list.querySelectorAll("li");
    opts.forEach(function (o, k) { o.setAttribute("aria-selected", k === n ? "true" : "false"); });
    if (opts[n]) { el.place.setAttribute("aria-activedescendant", opts[n].id); opts[n].scrollIntoView({ block: "nearest" }); }
  }

  el.place.addEventListener("focus", function () { loadCities().catch(function () {}); });
  el.place.addEventListener("input", function () {
    picked = null;
    loadCities().then(function () { openList(searchCities(el.place.value)); }).catch(function () { closeList(); });
  });
  el.place.addEventListener("keydown", function (ev) {
    var n = el.list.querySelectorAll("li").length;
    if (el.list.hidden || !n) return;
    if (ev.key === "ArrowDown") { ev.preventDefault(); activeOpt = (activeOpt + 1) % n; markActive(activeOpt); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); activeOpt = (activeOpt + n - 1) % n; markActive(activeOpt); }
    else if (ev.key === "Enter" && activeOpt >= 0) { ev.preventDefault(); choose(+el.list.querySelectorAll("li")[activeOpt].getAttribute("data-i")); }
    else if (ev.key === "Escape") { closeList(); }
  });
  el.list.addEventListener("mousedown", function (ev) {
    var li = ev.target.closest("li");
    if (li) { ev.preventDefault(); choose(+li.getAttribute("data-i")); }
  });
  el.place.addEventListener("blur", function () { setTimeout(closeList, 120); });

  /* ---------- time zone menu ---------- */
  (function fillZones() {
    var zones = [];
    try { zones = Intl.supportedValuesOf("timeZone"); } catch (e) { /* older browsers: filled from the cities file below */ }
    function put(list) {
      el.tz.innerHTML = '<option value="">Automatic (from the place)</option>' +
        list.map(function (z) { return '<option value="' + z + '">' + z.replace(/_/g, " ") + "</option>"; }).join("");
    }
    put(zones);
    if (!zones.length) loadCities().then(function (d) { put(d.tz.slice().sort()); }).catch(function () {});
  })();

  /* ---------- reading the form ---------- */
  function num(t) {
    if (t === null || String(t).trim() === "") return NaN;
    return parseFloat(String(t).replace(",", "."));
  }
  function nearestZone(lat, lon) {
    var best = -1, bd = 1e9, la = lat * Math.PI / 180;
    for (var i = 0; i < cities.c.length; i++) {
      var c = cities.c[i], dla = (c[3] - lat) * Math.PI / 180, dlo = (c[4] - lon) * Math.PI / 180 * Math.cos(la);
      var d = dla * dla + dlo * dlo;
      if (d < bd) { bd = d; best = i; }
    }
    return best < 0 ? null : { zone: cities.tz[cities.c[best][5]], city: cities.c[best][0] };
  }
  function deviceZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; }
  }

  function gather() {
    var notes = [];
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el.date.value.trim());
    if (!m) return { error: "Enter a birth date first, as year-month-day. Or choose your signs by hand below." };
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1800 || y > 2100) return { error: "The chart finder covers the years 1800 to 2100." };
    var test = new Date(Date.UTC(y, mo - 1, d));
    if (test.getUTCMonth() !== mo - 1) return { error: "That date does not exist." };

    var time = null, tm = /^(\d{1,2}):(\d{2})/.exec(el.time.value.trim());
    if (tm) time = { h: +tm[1], mi: +tm[2] };

    var place = null, label = null, zone = el.tz.value, source = zone ? "your choice" : null;
    var lat = num(el.lat.value), lon = num(el.lon.value);
    var typed = el.place.value.trim();

    var ready = Promise.resolve();
    if (isFinite(lat) || isFinite(lon)) {
      if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return { error: "Latitude must be between -90 and 90, and longitude between -180 and 180." };
      place = { lat: lat, lon: lon }; label = lat.toFixed(2) + ", " + lon.toFixed(2);
      if (!zone) {
        ready = loadCities().then(function () {
          var n = nearestZone(lat, lon);
          if (n) { zone = n.zone; source = "nearest listed city (" + n.city + ")"; }
        }).catch(function () {});
      }
    } else if (picked) {
      place = picked; label = picked.name; if (!zone) { zone = picked.tz; source = "the place"; }
    } else if (typed) {
      ready = loadCities().then(function () {
        var hit = searchCities(typed)[0];
        if (hit !== undefined) { picked = cityToPlace(cities.c[hit]); place = picked; label = picked.name; el.place.value = picked.name; if (!zone) { zone = picked.tz; source = "the place"; } }
        else notes.push("I could not find “" + typed + "” in the city list, so the Rising is skipped. Open “My place isn’t listed” to type coordinates.");
      }).catch(function () { notes.push("The city list could not be loaded, so the place was skipped. You can still type coordinates."); });
    }
    return { y: y, mo: mo, d: d, time: time, ready: ready, finish: function () {
      if (!zone) { zone = deviceZone(); source = "this device"; if (time || true) notes.push("No place or time zone was given, so the zone of this device (" + zone.replace(/_/g, " ") + ") was assumed."); }
      try {
        var offS = Astro.offsetSec(Astro.localToUtc(y, mo, d, time ? time.h : 12, time ? time.mi : 0, zone).ms, zone);
        if (offS % 900 !== 0) notes.push("Before standard time zones, clocks followed each town's own solar time. This browser holds one such value for the whole zone (UTC" +
          (offS < 0 ? "-" : "+") + String(Math.floor(Math.abs(offS) / 3600)).padStart(2, "0") + ":" + String(Math.floor(Math.abs(offS) % 3600 / 60)).padStart(2, "0") +
          "), which can differ by a few minutes from your birthplace's. The Rising moves about one degree for every four minutes, so treat it as approximate.");
      } catch (e) { /* zone unknown: reported when computing */ }
      return { y: y, mo: mo, d: d, time: time, place: place && isFinite(place.lat) ? { lat: place.lat, lon: place.lon } : null,
        label: label, tz: zone, source: source, notes: notes };
    } };
  }

  /* ---------- drawing the answer ---------- */
  var LABEL = { sun: "Sun", moon: "Moon", rising: "Rising" };
  var chosen = { sun: "", moon: "", rising: "" };
  var calc = null;

  function degText(r) { return r.deg + "°" + (r.min < 10 ? "0" : "") + r.min + "′"; }
  function chip(light, sign, extra) {
    return '<button type="button" data-light="' + light + '" data-sign="' + sign + '" aria-pressed="' + (chosen[light] === sign ? "true" : "false") + '">' +
      TC.glyph(sign) + "<span>" + sign + (extra ? " " + TC.esc(extra) : "") + "</span></button>";
  }
  function segText(seg, i, n) {
    if (n === 1) return "all day";
    if (i === 0) return "until " + seg.toClock;
    if (i === n - 1) return "from " + seg.fromClock;
    return seg.fromClock + "–" + seg.toClock;
  }

  function lightBlock(k, v) {
    var h = '<div class="f-line"><h3>' + LABEL[k] + "</h3>";
    if (v.kind === "exact") {
      h += '<p class="f-big">' + TC.glyph(v.sign) + "<span>" + v.sign + '</span> <span class="hint">' + degText(v) + "</span></p>";
      if (v.near.length) {
        var alts = v.near.join(" or ");
        h += '<p class="f-warn">Within ' + v.nearMinutes + " minutes of a sign change, so the other side is possible: " + TC.esc(alts) +
          ". Birth times are often rounded, so read both if you are unsure.</p>" +
          '<div class="chips" role="group" aria-label="Choose your ' + LABEL[k] + ' sign">' + chip(k, v.sign) + v.near.map(function (s) { return chip(k, s); }).join("") + "</div>";
      }
    } else if (v.kind === "range") {
      var n = v.segments.length;
      if (n === 1) {
        h += '<p class="f-big">' + TC.glyph(v.segments[0].sign) + "<span>" + v.segments[0].sign + '</span></p><p class="hint">The same sign all day.</p>';
      } else if (k === "rising") {
        h += '<p class="hint">Your Rising changes sign about every two hours, so it depends on the birth time. Choose the one that fits what you know:</p>' +
          '<div class="chips" role="group" aria-label="Choose your Rising sign">' +
          v.segments.map(function (s, i) { return chip(k, s.sign, "(" + segText(s, i, n) + ")"); }).join("") + "</div>";
      } else {
        h += '<p class="hint">Your ' + LABEL[k] + " changes sign this day, so the time decides: " +
          v.segments.map(function (s, i) { return s.sign + " " + segText(s, i, n); }).join(", then ") + ".</p>" +
          '<div class="chips" role="group" aria-label="Choose your ' + LABEL[k] + ' sign">' +
          v.segments.map(function (s) { return chip(k, s.sign); }).join("") + "</div>";
      }
    } else {
      h += '<p class="hint">Needs the birth ' + v.what + ". Add " + (v.what === "place" ? "it" : "them") + " above and press the button again, or choose a Rising sign by hand below" +
        (k === "rising" ? " (with your Sun and Moon chosen, you will see all twelve)." : ".") + "</p>";
    }
    return h + "</div>";
  }

  function defaultChoice(k, v) {
    if (v.kind === "exact") return v.sign;
    if (v.kind === "range" && v.segments.length === 1) return v.segments[0].sign;
    return "";
  }

  function assumptionLine(c) {
    var when = c.y + "-" + String(c.mo).padStart(2, "0") + "-" + String(c.d).padStart(2, "0") +
      (c.time ? " at " + String(c.time.h).padStart(2, "0") + ":" + String(c.time.mi).padStart(2, "0") : ", time unknown");
    var off = "";
    try {
      var s = Astro.offsetSec(Astro.localToUtc(c.y, c.mo, c.d, c.time ? c.time.h : 12, c.time ? c.time.mi : 0, c.tz).ms, c.tz) / 60;
      off = " (UTC" + (s < 0 ? "-" : "+") + String(Math.floor(Math.abs(s) / 60)).padStart(2, "0") + ":" + String(Math.round(Math.abs(s) % 60)).padStart(2, "0") + ")";
    } catch (e) { /* zone not known to this browser */ }
    return "Born " + when + (c.label ? " · " + c.label : " · place not given") + " · time zone " + c.tz.replace(/_/g, " ") + off +
      (c.source ? " from " + c.source : "") + ".";
  }

  function paintFound() {
    var c = calc.inp, r = calc.out;
    var h = '<p class="hint">' + TC.esc(assumptionLine(c)) + "</p>";
    c.notes.concat(r.notes).forEach(function (n) { h += '<p class="f-warn">' + TC.esc(n) + "</p>"; });
    ["sun", "moon", "rising"].forEach(function (k) { h += lightBlock(k, r[k]); });
    h += '<div class="f-line"><h3>Your reading</h3><div class="result found-result" aria-live="polite"></div></div>';
    el.found.innerHTML = h;
    paintResult();
  }
  function paintResult() {
    TC.renderResult(el.found.querySelector(".found-result"), chosen);
    dial.set(chosen);
    el.found.querySelectorAll(".chips button").forEach(function (b) {
      b.setAttribute("aria-pressed", chosen[b.getAttribute("data-light")] === b.getAttribute("data-sign") ? "true" : "false");
    });
  }

  el.found.addEventListener("click", function (ev) {
    var b = ev.target.closest(".chips button");
    if (!b) return;
    var k = b.getAttribute("data-light"), s = b.getAttribute("data-sign");
    chosen[k] = chosen[k] === s ? "" : s;
    paintResult();
  });

  function run() {
    var g = gather();
    if (g.error) { el.found.innerHTML = '<p class="f-warn">' + TC.esc(g.error) + "</p>"; return; }
    g.ready.then(function () {
      var inp = g.finish();
      var out;
      try {
        out = Astro.compute({ y: inp.y, mo: inp.mo, d: inp.d, time: inp.time, tz: inp.tz, place: inp.place });
      } catch (e) {
        el.found.innerHTML = '<p class="f-warn">That time zone is not known to this browser. Pick another from the Time zone menu.</p>';
        return;
      }
      calc = { inp: inp, out: out };
      ["sun", "moon", "rising"].forEach(function (k) { chosen[k] = defaultChoice(k, out[k]); });
      paintFound();
      showSky(inp);
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.found.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el.found.focus({ preventScroll: true });
    });
  }

  /* ---------- the natal chart wheel, under the TwelveCubed wheel ---------- */
  var skyApi = null;
  function showSky(inp) {
    var sec = document.getElementById("sky-find");
    if (!sec || !TC.loadSky) return;
    var ms = Astro.localToUtc(inp.y, inp.mo, inp.d, inp.time ? inp.time.h : 12, inp.time ? inp.time.mi : 0, inp.tz).ms;
    var full = !!(inp.time && inp.place);
    var note = !inp.time ? "birth time not given: sky at 12:00 local, no houses" : !inp.place ? "place not given: no houses" : "";
    var input = { ms: ms, lat: full ? inp.place.lat : null, lon: full ? inp.place.lon : null, tz: inp.tz, place: inp.label || "", note: note };
    TC.loadSky().then(function (S) {
      sec.hidden = false;
      var app = sec.querySelector("[data-sky-app]");
      if (skyApi) skyApi.update(input);
      else skyApi = S.mount(app, { mode: "chart", input: input });
    }).catch(function () { /* the chart wheel is an extra; the three signs above already work */ });
  }

  form.addEventListener("submit", function (ev) { ev.preventDefault(); run(); });
})();
