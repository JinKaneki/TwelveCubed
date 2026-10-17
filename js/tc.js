/* Shared helpers for every page. Loaded after data/index.js (window.TC_DATA) and glyphs.js.
   Exposes window.TC. No dependencies, no network. */
(function () {
  "use strict";

  var D = window.TC_DATA || { signs: [], rows: [], pairs: {}, counts: {} };
  var SIGNS = D.signs;
  var ELEMENTS = ["fire", "earth", "air", "water"];
  var LIGHT_NAMES = { sun: "Sun", moon: "Moon", rising: "Rising" };
  var LIGHTS = ["sun", "moon", "rising"];
  var ROOT = (document.body && document.body.getAttribute("data-root")) || "";

  function idx(sign) { return SIGNS.indexOf(sign); }
  function slug(sign) { return String(sign).toLowerCase(); }
  function element(sign) { return ELEMENTS[idx(sign) % 4]; }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function glyph(sign, extra) {
    return '<svg class="gl ' + element(sign) + (extra ? " " + extra : "") + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#g-' + slug(sign) + '"/></svg>';
  }
  function icon(light) {
    return '<svg class="ic" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#l-' + light + '"/></svg>';
  }

  /* ---- data lookups ---- */
  function row(s, m, r) { return D.rows[idx(s) * 144 + idx(m) * 12 + idx(r)] || ["", ""]; }
  function titleOf(s, m, r) { return row(s, m, r)[0]; }
  function essenceOf(s, m, r) { return row(s, m, r)[1]; }
  var PAIR_KEY = { "sun-moon": "sunMoon", "sun-rising": "sunRising", "moon-rising": "moonRising" };
  function pairOf(kind, a, b) {
    var list = (D.pairs || {})[PAIR_KEY[kind]] || [];
    return list[idx(a) * 12 + idx(b)] || ["", ""];
  }
  /* The kind of pair for two lights, and which comes first. */
  function pairKind(l1, l2) {
    var set = [l1, l2].sort().join("-");
    return { "moon-sun": "sun-moon", "rising-sun": "sun-rising", "moon-rising": "moon-rising" }[set];
  }

  /* ---- urls (relative to the current page's data-root) ---- */
  function readHref(s, m, r) { return ROOT + "read/" + slug(s) + "-" + slug(m) + "-" + slug(r) + ".html"; }
  function pairHref(kind, a, b) { return ROOT + "pair/" + kind + "/" + slug(a) + "-" + slug(b) + ".html"; }
  function signHref(s) { return ROOT + "signs/" + slug(s) + ".html"; }
  function catalogueHref(sel) {
    var p = [];
    LIGHTS.forEach(function (k) { if (sel[k]) p.push(k + "=" + encodeURIComponent(sel[k])); });
    return ROOT + "catalogue.html" + (p.length ? "#" + p.join("&") : "");
  }

  /* Whole-sign distance, 0 to 6. */
  function distance(a, b) {
    var d = Math.abs(idx(a) - idx(b)) % 12;
    return d > 6 ? 12 - d : d;
  }

  /* ---- the result panel used by the Dial (home and find pages) ---- */
  function chosen(sel) { return LIGHTS.filter(function (k) { return sel[k]; }); }

  function whoLine(sel) {
    return chosen(sel).map(function (k) { return LIGHT_NAMES[k] + " in " + sel[k]; }).join(" · ");
  }

  function optionsList(items) {
    return '<ul class="options">' + items.map(function (it) {
      return '<li><a href="' + it.href + '">' + glyph(it.sign) + '<span><span class="o-name">' + esc(it.name) +
        '</span><span class="o-title">' + esc(it.title || "being written") + "</span></span></a></li>";
    }).join("") + "</ul>";
  }

  function renderResult(el, sel) {
    if (!el) return;
    var ks = chosen(sel);
    var html = "";
    if (ks.length === 0) {
      html = '<p class="r-note">Choose a sign on any ring, or use the menus. One sign is enough to start.</p>';
    } else if (ks.length === 3) {
      var s = sel.sun, m = sel.moon, r = sel.rising;
      var t = titleOf(s, m, r), e = essenceOf(s, m, r), href = readHref(s, m, r);
      html = '<p class="r-who">' + esc(whoLine(sel)) + "</p>" +
        (t ? '<p class="r-title"><a href="' + href + '">' + esc(t) + "</a></p><p class=\"r-note\">" + esc(e) + "</p>" +
          '<a class="r-go" href="' + href + '">Read this portrait</a>'
          : '<p class="r-title"><a href="' + href + '">' + esc(s + " Sun · " + m + " Moon · " + r + " Rising") + "</a></p>" +
          '<p class="r-note">The full portrait for this combination is still being written. Each pair of lights is already read on its page.</p>' +
          '<a class="r-go" href="' + href + '">Open this page</a>');
      if (m !== r) {
        html += '<p class="r-note" style="margin-top:.8rem">Mirror, with Moon and Rising swapped: <a href="' + readHref(s, r, m) +
          '">' + esc(s + " Sun · " + r + " Moon · " + m + " Rising") + "</a>" + (titleOf(s, r, m) ? ": <em>" + esc(titleOf(s, r, m)) + "</em>" : "") + "</p>";
      }
    } else if (ks.length === 2) {
      var kind = pairKind(ks[0], ks[1]);
      var first = kind.split("-")[0], second = kind.split("-")[1];
      var a = sel[first], b = sel[second];
      var pe = pairOf(kind, a, b);
      var third = LIGHTS.filter(function (k) { return !sel[k]; })[0];
      var items = SIGNS.map(function (x) {
        var tri = { sun: sel.sun, moon: sel.moon, rising: sel.rising };
        tri[third] = x;
        return { sign: x, href: readHref(tri.sun, tri.moon, tri.rising),
          name: x + " " + LIGHT_NAMES[third], title: titleOf(tri.sun, tri.moon, tri.rising) };
      });
      html = '<p class="r-who">' + esc(whoLine(sel)) + "</p>" +
        '<p class="r-title"><a href="' + pairHref(kind, a, b) + '">' + esc(pe[0] || (a + " " + LIGHT_NAMES[first] + " with " + b + " " + LIGHT_NAMES[second])) + "</a></p>" +
        (pe[1] ? '<p class="r-note">' + esc(pe[1]) + "</p>" : '<p class="r-note">The reading for this pair is still being written.</p>') +
        '<a class="r-go" href="' + pairHref(kind, a, b) + '">Read this pair</a>' +
        '<p class="r-note" style="margin-top:1rem">Add a ' + LIGHT_NAMES[third] + " to open one of twelve portraits:</p>" + optionsList(items);
    } else {
      var k = ks[0], sign = sel[k];
      html = '<p class="r-who">' + esc(whoLine(sel)) + "</p>" +
        '<p class="r-title"><a href="' + signHref(sign) + '">' + esc(sign + " as the " + LIGHT_NAMES[k]) + "</a></p>" +
        '<p class="r-note">Add a second sign to read the pair, or a third to open a single portrait out of ' + fmt(Math.pow(12, 3 - 1)) + ".</p>" +
        '<a class="r-go" href="' + signHref(sign) + '">Read ' + esc(sign) + "</a>" +
        '<p class="r-note" style="margin-top:.8rem">Or see <a href="' + catalogueHref(sel) + '">all 144 portraits with ' + esc(sign + " " + LIGHT_NAMES[k]) + "</a>.</p>";
    }
    el.innerHTML = html;
  }

  /* ---- the sky engine (astronomy-engine, our chart maths, the wheel and its panel), loaded on demand ---- */
  var skyPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = ROOT + src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadSky() {
    if (skyPromise) return skyPromise;
    var seq = [];
    if (!window.Astronomy) seq.push("vendor/astronomy.browser.min.js");
    if (!window.TCAstro) seq.push("js/astro.js");
    if (!window.TC_CHIRON) seq.push("js/chiron.js");
    if (!window.TCEphem) seq.push("js/ephem.js");
    if (!window.TCWheel) seq.push("js/chartwheel.js");
    if (!window.TC_TZPLACE) seq.push("data/tzplace.js");
    if (!window.TCSky) seq.push("js/sky.js");
    skyPromise = seq.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve())
      .then(function () { return window.TCSky; });
    skyPromise.catch(function () { skyPromise = null; });
    return skyPromise;
  }

  window.TC = {
    SIGNS: SIGNS, ELEMENTS: ELEMENTS, LIGHTS: LIGHTS, LIGHT_NAMES: LIGHT_NAMES, DATA: D, ROOT: ROOT,
    idx: idx, slug: slug, element: element, fmt: fmt, esc: esc, glyph: glyph, icon: icon,
    row: row, titleOf: titleOf, essenceOf: essenceOf, pairOf: pairOf, pairKind: pairKind,
    readHref: readHref, pairHref: pairHref, signHref: signHref, catalogueHref: catalogueHref,
    distance: distance, renderResult: renderResult, whoLine: whoLine, loadSky: loadSky
  };
})();
