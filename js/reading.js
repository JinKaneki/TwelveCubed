/* The printable reading: one sheet for a person's chosen lights (their portrait and the readings of each pair of lights),
   then the chart wheel with its tables on a second page. It is put on the page, hidden, and the browser's own print
   dialog does the rest: print it, or choose "Save as PDF". Nothing is uploaded; the text comes from data files of this site.

   window.TCReading.print({ name, inp, chosen, birth, sheet() })  -> Promise
   window.TCReading.build(opts)                                  -> the HTML of the sheet (a string)
   Needs window.TC (tc.js). Loads data/pairtext.js and data/portraits/<sun>.js when first needed.            */
(function () {
  "use strict";
  var TC = window.TC;
  var LIGHTS = ["sun", "moon", "rising"], NAME = { sun: "Sun", moon: "Moon", rising: "Rising" };
  var loaded = {};

  function esc(t) { return TC.esc(t); }
  function paras(t) {
    return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = TC.ROOT + src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { delete loaded[src]; resolve(false); };      // a missing pack is not an error: the sheet says "still being written"
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function ensure(chosen) {
    var jobs = [];
    if (!window.TC_PAIRTEXT) jobs.push(loadScript("data/pairtext.js"));
    if (chosen.sun && chosen.moon && chosen.rising) jobs.push(loadScript("data/portraits/" + TC.slug(chosen.sun) + ".js"));
    return Promise.all(jobs);
  }

  function pairText(kind, a, b) {
    var key = { "sun-moon": "sunMoon", "sun-rising": "sunRising", "moon-rising": "moonRising" }[kind];
    var list = window.TC_PAIRTEXT && window.TC_PAIRTEXT[key];
    var e = list && list[TC.idx(a) * 12 + TC.idx(b)];
    return e && e[0] ? e : null;
  }

  function lightsRow(ch) {
    return '<ul class="rs-lights">' + LIGHTS.filter(function (k) { return ch[k]; }).map(function (k) {
      return "<li>" + TC.glyph(ch[k]) + "<span><b>" + NAME[k] + "</b> in " + esc(ch[k]) + "</span></li>";
    }).join("") + "</ul>";
  }

  function build(o) {
    var ch = o.chosen, name = String(o.name || "").trim(), h = "";
    var all3 = ch.sun && ch.moon && ch.rising;
    h += '<article id="reading-sheet" class="rs" aria-hidden="true">';
    h += '<header class="rs-head"><p class="rs-kicker">TwelveCubed &middot; a reading of the three lights</p>' +
      "<h1>" + esc(name || "Your reading") + "</h1>" +
      (o.birth ? '<p class="rs-birth">' + esc(o.birth) + "</p>" : "") + lightsRow(ch) + "</header>";

    if (all3) {
      var key = TC.slug(ch.sun) + "-" + TC.slug(ch.moon) + "-" + TC.slug(ch.rising);
      var title = TC.titleOf(ch.sun, ch.moon, ch.rising), essence = TC.essenceOf(ch.sun, ch.moon, ch.rising);
      var f = window.TC_PORTRAITS && window.TC_PORTRAITS[key];
      h += '<section class="rs-portrait"><h2>' + esc(title || (ch.sun + " Sun, " + ch.moon + " Moon, " + ch.rising + " Rising")) + "</h2>";
      if (title && f) {
        h += '<p class="rs-essence">' + esc(essence) + "</p>";
        [["Portrait", 0], ["Inner workings", 1], ["Gifts", 2], ["Shadow", 3]].forEach(function (x) { h += "<h3>" + x[0] + "</h3>" + paras(f[x[1]]); });
      } else {
        h += '<p class="rs-essence">The full portrait for this combination is still being written. Each pair of lights is read below.</p>';
      }
      h += "</section>";
    }

    var pairs = [];
    if (ch.sun && ch.moon) pairs.push(["sun-moon", "sun", "moon"]);
    if (ch.sun && ch.rising) pairs.push(["sun-rising", "sun", "rising"]);
    if (ch.moon && ch.rising) pairs.push(["moon-rising", "moon", "rising"]);
    if (pairs.length) {
      h += '<section class="rs-pairs"><h2>' + (all3 ? "Each pair of lights, read alone" : "The pair of lights") + "</h2>";
      pairs.forEach(function (p) {
        var a = ch[p[1]], b = ch[p[2]], t = pairText(p[0], a, b);
        h += '<div class="rs-pair"><h3>' + esc(a + " " + NAME[p[1]] + " with " + b + " " + NAME[p[2]]) + (t ? " &middot; <i>" + esc(t[0]) + "</i>" : "") + "</h3>" +
          (t ? "<p>" + esc(t[1]) + "</p>" : "<p><i>The reading for this pair is still being written.</i></p>") + "</div>";
      });
      h += "</section>";
    }
    if (!all3) h += '<p class="rs-note">The third light, the Rising sign, needs the birth time and place. Add them on the finder and print again for the full portrait.</p>';

    var sheet = typeof o.sheet === "function" ? o.sheet() : "";
    if (sheet) {
      sheet = sheet.replace(/^<svg ([^>]*?)\swidth="[\d.]+"\s+height="[\d.]+"/, '<svg $1');
      h += '<section class="rs-chart"><h2>The chart</h2><div class="rs-wheel">' + sheet + "</div></section>";
    }
    h += '<footer class="rs-foot">Made with TwelveCubed. Tropical zodiac, geocentric apparent positions. For reflection, not prediction.</footer>';
    return h + "</article>";
  }

  function print(o) {
    return ensure(o.chosen).then(function () {
      var old = document.getElementById("reading-sheet");
      if (old) old.remove();
      var wrap = document.createElement("div");
      wrap.innerHTML = build(o);
      document.body.appendChild(wrap.firstChild);
      var body = document.body;
      body.classList.add("is-printing-reading");
      document.documentElement.classList.add("is-printing-reading");
      var finished = false;
      function done() {
        if (finished) return; finished = true;
        body.classList.remove("is-printing-reading");
        document.documentElement.classList.remove("is-printing-reading");
        window.removeEventListener("afterprint", done);
        window.removeEventListener("focus", done);
        document.removeEventListener("pointerdown", done);
      }
      window.addEventListener("afterprint", done);
      /* browsers that do not announce the end of printing: the sheet is dropped when the reader comes back to the page */
      setTimeout(function () { if (!finished) { window.addEventListener("focus", done); document.addEventListener("pointerdown", done); } }, 2500);
      return new Promise(function (resolve) {
        setTimeout(function () { window.print(); resolve(); }, 300);          // a moment for the fonts and the drawing to settle
      });
    });
  }

  window.TCReading = { print: print, build: build };
})();
