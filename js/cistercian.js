/* Cistercian numerals: the medieval monastic way of writing any number from 0 to 9999 as ONE sign.
   A vertical stem carries four quadrants. Each quadrant holds one digit, drawn from the same nine shapes:

        tens | units          upper left  = tens       upper right = units
        -----+------          lower left  = thousands  lower right = hundreds
   thousands | hundreds       (the lower quadrants are the upper ones turned upside down)

   The shapes for 1 to 9 in the upper right quadrant, with a = stem top, b = right top, c = stem one step down, d = right one step down:
        1 a-b   2 c-d   3 a-d   4 c-b   5 c-b + a-b   6 b-d   7 a-b + b-d   8 c-d + b-d   9 a-b + c-d + b-d

   window.TCCist.svg(n, opts)    one sign as an SVG string. opts.compact draws only the upper half (for 0 to 99).
   window.TCCist.key()           a legend of the nine shapes as an SVG string
   Drawn with currentColor, so the page colours it. Own implementation of the public numeral system; no data, no network.   */
(function () {
  "use strict";

  var SEG = { a: [0, 0], b: [1, 0], c: [0, 1], d: [1, 1] };
  var DIG = [[], ["ab"], ["cd"], ["ad"], ["cb"], ["ab", "cb"], ["bd"], ["ab", "bd"], ["cd", "bd"], ["ab", "cd", "bd"]];

  var QW = 24, QH = 28, TOP = 7, HALF = 30;          // quadrant reach, quadrant height, top margin, stem x
  function f(n) { return String(Math.round(n * 100) / 100); }

  /* path data for one digit in one quadrant. sx: +1 right, -1 left; sy: +1 hangs from the top, -1 rises from the bottom */
  function quad(d, sx, sy, yEdge) {
    var s = DIG[d] || [], out = "";
    for (var i = 0; i < s.length; i++) {
      var p = SEG[s[i].charAt(0)], q = SEG[s[i].charAt(1)];
      out += "M" + f(HALF + sx * QW * p[0]) + " " + f(yEdge + sy * QH * p[1]) + "L" + f(HALF + sx * QW * q[0]) + " " + f(yEdge + sy * QH * q[1]);
    }
    return out;
  }

  function digits(n) {
    n = Math.max(0, Math.min(9999, Math.floor(n) || 0));
    return { u: n % 10, t: Math.floor(n / 10) % 10, h: Math.floor(n / 100) % 10, k: Math.floor(n / 1000) % 10, n: n };
  }

  function svg(n, o) {
    o = o || {};
    var d = digits(n), compact = !!o.compact, yb = TOP + 3 * QH;                     // stem bottom of the full sign
    var stemEnd = compact ? TOP + QH + 9 : yb;
    var H = stemEnd + TOP, W = 60;
    var path = "M" + HALF + " " + TOP + "V" + stemEnd + " ";
    var shapes = quad(d.u, 1, 1, TOP) + quad(d.t, -1, 1, TOP);
    if (!compact) shapes += quad(d.h, 1, -1, yb) + quad(d.k, -1, -1, yb);
    var label = o.label || ("Cistercian numeral " + d.n);
    return '<svg class="cist' + (o.cls ? " " + o.cls : "") + '" viewBox="0 0 ' + W + " " + f(H) + '" role="img" aria-label="' + label + '" focusable="false">' +
      '<path class="cist-stem" d="' + path + '" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<path class="cist-sign" d="' + shapes + '" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* the nine shapes (units) with their numbers, for the "how to read it" legend */
  function key() {
    var out = "";
    for (var i = 1; i <= 9; i++) out += '<li><span class="ck-g">' + svg(i, { compact: true, label: "Cistercian " + i }) + '</span><span class="ck-n">' + i + "</span></li>";
    return '<ul class="cist-key">' + out + "</ul>";
  }

  window.TCCist = { svg: svg, key: key, digits: digits };
})();
