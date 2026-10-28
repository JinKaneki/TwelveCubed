/* Home page: the Moon wheel of the month that is running now, with "All four together" in the middle, drawn as a picture.
   No month picker, no save button here: the Moon calendar on the RoTao page (daily/index.html#moon-calendar) does that.

   It loads when the card nears the screen: the calculation libraries, the Moon calendar's maths (js/mooncal.js), the wheel drawing
   (js/moonwheel.js) and the pictures for the middle (data/art.js, base64, so the wheel is one self-contained SVG). The month is the
   one on the device clock, in the zone and for the sky (north or south) that was last chosen on the RoTao page, otherwise those of the device.
   It is redrawn when the light or dark plate is switched, and once more when the month turns over. Nothing is sent anywhere. */
(function () {
  "use strict";
  var sec = document.querySelector("[data-moonhome]");
  if (!sec) return;
  var fig = sec.querySelector("[data-moonhome-fig]"), cap = sec.querySelector("[data-moonhome-cap]");
  var ROOT = (document.body && document.body.getAttribute("data-root")) || "";
  var loaded = {};
  var started = false, drawing = false, again = false, shownKey = "", blobUrl = "";

  function loadScript(rel, test) {
    if (test && test()) return Promise.resolve(true);
    if (loaded[rel]) return loaded[rel];
    return (loaded[rel] = new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = ROOT + rel; el.onload = function () { resolve(true); };
      el.onerror = function () { delete loaded[rel]; reject(new Error("Could not load " + rel)); };
      document.head.appendChild(el);
    }));
  }
  function libs() {
    var seq = [
      ["vendor/astronomy.browser.min.js", function () { return window.Astronomy; }],
      ["js/astro.js", function () { return window.TCAstro; }],
      ["js/chiron.js", function () { return window.TC_CHIRON; }],
      ["js/ephem.js", function () { return window.TCEphem; }],
      ["js/glyphs.js", function () { return window.TC_GLYPHS; }],
      ["js/chartwheel.js", function () { return window.TCWheel; }],
      ["data/tzplace.js", function () { return window.TC_TZPLACE; }],
      ["js/mooncal.js", function () { return window.TCMoonCal; }],
      ["js/moonwheel.js", function () { return window.TCMoonWheel; }],
      ["data/art.js", function () { return window.TC_ART; }]
    ];
    return seq.reduce(function (p, s) { return p.then(function () { return loadScript(s[0], s[1]); }); }, Promise.resolve());
  }

  function deviceZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } }
  function choice() {                                   // what the visitor chose on the RoTao page, if anything
    var o = {};
    try { o = JSON.parse(localStorage.getItem("tc_mooncal") || "{}") || {}; } catch (e) { o = {}; }
    var dev = deviceZone();
    var southDefault = !!(window.TC_TZPLACE && window.TC_TZPLACE[dev] && window.TC_TZPLACE[dev][3] < 0);
    return { zone: o.zone === "utc" ? "UTC" : dev, utc: o.zone === "utc", south: typeof o.south === "boolean" ? o.south : southDefault };
  }
  function nowIn(tz) {                                  // the year and month on the clock in that zone (month 0..11)
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month - 1 };
  }
  function light() { return document.documentElement.getAttribute("data-theme") === "light"; }

  function draw() {
    if (drawing) { again = true; return; }
    drawing = true; again = false;
    var c = choice(), n = nowIn(c.zone), L = light();
    var key = [n.y, n.m, c.zone, c.south, L].join("|");
    if (key === shownKey) { drawing = false; return; }
    Promise.resolve().then(function () {
      var model = window.TCMoonCal.compute(n.y, n.m, c.zone);
      return window.TCMoonWheel.build(model, { south: c.south, light: L, centre: "all", zone: c.utc ? "utc" : "my" }).then(function (p) { return { p: p, model: model }; });
    }).then(function (r) {
      var url = URL.createObjectURL(new Blob([r.p.svg], { type: "image/svg+xml;charset=utf-8" }));
      var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var title = months[n.m] + " " + n.y;
      var img = new Image();
      img.alt = "The Moon wheel for " + title + ": the Moon of each day spiralling round the twelve signs of the zodiac, with the planets, the four phases ringed in gold and any eclipse, and four pictures in the middle: Sol and Luna, the Rota, the TwelveCubed mark and the month written out";
      img.width = r.p.w; img.height = r.p.h; img.decoding = "async";
      img.onload = function () {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = url; shownKey = key;
        fig.innerHTML = ""; fig.appendChild(img); fig.removeAttribute("aria-busy");
        if (cap) cap.textContent = title + ", for the " + (c.south ? "southern" : "northern") + " sky, times in " + (c.utc ? "UTC" : "your own time") + ".";
      };
      img.onerror = function () { URL.revokeObjectURL(url); };
      img.src = url;
    }).catch(function (e) {
      fig.innerHTML = '<p class="moonhome-wait">The Moon wheel could not be drawn here. The Moon calendar on the RoTao page has it.</p>';
      if (window.console) console.error(e);
    }).then(function () { drawing = false; if (again) draw(); });
  }

  function start() {
    if (started) return; started = true;
    libs().then(draw).catch(function (e) {
      started = false;
      fig.innerHTML = '<p class="moonhome-wait">The Moon wheel could not load. Reload the page to try again.</p>';
      if (window.console) console.error(e);
    });
  }

  /* the plate (light or dark) is switched: draw it again in the other colours */
  if (window.MutationObserver) new MutationObserver(function () { if (shownKey) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  /* the month turns over while the page is open, or the clock comes back from sleep */
  document.addEventListener("visibilitychange", function () { if (!document.hidden && shownKey) draw(); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: "600px 0px" });
    io.observe(sec);
  } else start();
})();
