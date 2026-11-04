/* The Daily Tao page.
     1. the yin-yang button: one turn, then the scroll unfolds with the chapter of the day (James Legge, 1891, public domain)
     2. the Cistercian clock: hours, minutes and seconds, and the date, in Cistercian numerals (and the Buddha analog face)
     3. the shared clock (window.TCDaily.clock) that drives the clock and the celestial astrolabe (js/astrolabe.js)
   One chapter per UTC day, counting from 1 January 2026 and repeating every 81 days. No network, nothing stored except the
   time-zone choice for the clock. */
(function () {
  "use strict";

  var ROOT = (document.body && document.body.getAttribute("data-root")) || "";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  /* ORNAMENT:BEGIN (made by tools/art/make_ornament.py; the floral frame of the motto card, on the page and in the saved picture) */
var ORN = (function () {
  var D = {"T":46.0,"TL":88.0,"tile":[["s","M0 23 C14 7 28 7 44 23 S74 39 88 23"],["f","M15 12.2 Q17 1 28.4 1.7 Q26.4 13 15 12.2 ZM15 12.2 L25.4 4M31.5 12.2 Q22.9 14.1 20.2 5.7 Q28.9 3.8 31.5 12.2 ZM31.5 12.2 L22.7 7.1M59 33.8 Q70.4 33 72.4 44.3 Q61 45 59 33.8 ZM59 33.8 L69.4 42M75.5 33.8 Q72.9 42.2 64.2 40.3 Q66.9 31.9 75.5 33.8 ZM75.5 33.8 L66.7 38.9"],["f","M44 23 Q47.8 17.4 51.6 23 Q47.8 28.6 44 23 ZM44 23 Q50.8 23.5 47.8 29.6 Q41 29.1 44 23 ZM44 23 Q47 29.1 40.2 29.6 Q37.2 23.5 44 23 ZM44 23 Q40.2 28.6 36.4 23 Q40.2 17.4 44 23 ZM44 23 Q37.2 22.5 40.2 16.4 Q47 16.9 44 23 ZM44 23 Q41 16.9 47.8 16.4 Q50.8 22.5 44 23 Z"],["f","M44 23 Q48.1 21 48.3 25.5 Q44.3 27.5 44 23 ZM44 23 Q47.8 25.5 44 28 Q40.2 25.5 44 23 ZM44 23 Q43.7 27.5 39.7 25.5 Q39.9 21 44 23 ZM44 23 Q39.9 25 39.7 20.5 Q43.7 18.5 44 23 ZM44 23 Q40.2 20.5 44 18 Q47.8 20.5 44 23 ZM44 23 Q44.3 18.5 48.3 20.5 Q48.1 25 44 23 Z"],["s","M41.9 23 a2.1 2.1 0 1 0 4.1 0 a2.1 2.1 0 1 0 -4.1 0Z"],["d","M43.1 23 a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0Z"],["d","M20.3 9.2 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0ZM64.3 36.8 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0Z"]],"corner":[["s","M48 48 Q64 60 77 63 Q90 66 103 62 Q116 58 117.7 57.9 Q119.4 57.7 121 58.1 Q122.6 58.4 124 59.2 Q125.4 60 126.5 61.1 Q127.6 62.2 128.4 63.5 Q129.1 64.9 129.4 66.3 Q129.7 67.7 129.5 69.2 Q129.4 70.6 128.9 71.9 Q128.4 73.2 127.6 74.2 Q126.7 75.3 125.7 76 Q124.6 76.7 123.4 77.1 Q122.3 77.5 121.1 77.6 Q119.9 77.6 118.7 77.3 Q117.6 77 116.7 76.4 Q115.7 75.8 115 75 Q114.3 74.2 113.9 73.3 Q113.5 72.4 113.3 71.4 Q113.2 70.4 113.3 69.5 Q113.5 68.6 113.9 67.8 Q114.3 67 114.8 66.4 Q115.4 65.8 116.1 65.4 Q116.8 65 117.5 64.8 Q118.2 64.6 119 64.7 Q119.7 64.7 120.3 65 Q120.9 65.2 121.4 65.6 Q121.9 66 122.2 66.5 Q122.5 66.9 122.7 67.5 Q122.8 68 122.8 68.5 Q122.8 69 122.6 69.4 Q122.5 69.8 122.2 70.1 Q122 70.4 121.6 70.6 Q121.3 70.8 121 70.9 Q120.7 71 120.4 70.9 Q120.1 70.9 119.9 70.7 L119.7 70.6"],["s","M48 48 Q60 64 63 77 Q66 90 62 103 Q58 116 57.9 117.7 Q57.7 119.4 58.1 121 Q58.4 122.6 59.2 124 Q60 125.4 61.1 126.5 Q62.2 127.6 63.5 128.4 Q64.9 129.1 66.3 129.4 Q67.7 129.7 69.2 129.5 Q70.6 129.4 71.9 128.9 Q73.2 128.4 74.2 127.6 Q75.3 126.7 76 125.7 Q76.7 124.6 77.1 123.4 Q77.5 122.3 77.6 121.1 Q77.6 119.9 77.3 118.7 Q77 117.6 76.4 116.7 Q75.8 115.7 75 115 Q74.2 114.3 73.3 113.9 Q72.4 113.5 71.4 113.3 Q70.4 113.2 69.5 113.3 Q68.6 113.5 67.8 113.9 Q67 114.3 66.4 114.8 Q65.8 115.4 65.4 116.1 Q65 116.8 64.8 117.5 Q64.6 118.2 64.7 119 Q64.7 119.7 65 120.3 Q65.2 120.9 65.6 121.4 Q66 121.9 66.5 122.2 Q66.9 122.5 67.5 122.7 Q68 122.8 68.5 122.8 Q69 122.8 69.4 122.6 Q69.8 122.5 70.1 122.2 Q70.4 122 70.6 121.6 Q70.8 121.3 70.9 121 Q71 120.7 70.9 120.4 Q70.9 120.1 70.7 119.9 L70.6 119.7"],["s","M34 34 Q52 52 61 61 Q70 70 78 78 L86 86"],["f","M60 60 Q71.7 52.5 81.9 61.9 Q70.2 69.4 60 60 ZM60 60 L77.1 61.5M60 60 Q69.4 70.2 61.9 81.9 Q52.5 71.7 60 60 ZM60 60 L61.5 77.1M78 66 Q88.9 62.5 94.9 72.2 Q84.1 75.7 78 66 ZM78 66 L91.2 70.8M66 78 Q75.7 84.1 72.2 94.9 Q62.5 88.9 66 78 ZM66 78 L70.8 91.2"],["f","M86 86 Q98.8 80.6 107.3 91.7 Q94.4 97.1 86 86 ZM86 86 L102.6 90.4M86 86 Q97.1 94.4 91.7 107.3 Q80.6 98.8 86 86 ZM86 86 L90.4 102.6M86 86 Q105.1 89.5 108.6 108.6 Q89.5 105.1 86 86 ZM86 86 L103.6 103.6"],["f","M86 86 Q90.5 79.3 95 86 Q90.5 92.7 86 86 ZM86 86 Q94 86.6 90.5 93.8 Q82.5 93.2 86 86 ZM86 86 Q89.5 93.2 81.5 93.8 Q78 86.6 86 86 ZM86 86 Q81.5 92.7 77 86 Q81.5 79.3 86 86 ZM86 86 Q78 85.4 81.5 78.2 Q89.5 78.8 86 86 ZM86 86 Q82.5 78.8 90.5 78.2 Q94 85.4 86 86 Z"],["f","M86 86 Q90.8 83.6 91.1 89 Q86.3 91.4 86 86 ZM86 86 Q90.5 89 86 91.9 Q81.5 89 86 86 ZM86 86 Q85.7 91.4 80.9 89 Q81.2 83.6 86 86 ZM86 86 Q81.2 88.4 80.9 83 Q85.7 80.6 86 86 ZM86 86 Q81.5 83 86 80.1 Q90.5 83 86 86 ZM86 86 Q86.3 80.6 91.1 83 Q90.8 88.4 86 86 Z"],["s","M83.6 86 a2.4 2.4 0 1 0 4.9 0 a2.4 2.4 0 1 0 -4.9 0Z"],["d","M84.9 86 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0Z"],["f","M23 23 Q33 8.2 43 23 Q33 37.8 23 23 ZM23 23 Q39.8 16.9 39.2 34.8 Q22.4 40.9 23 23 ZM23 23 Q40.2 27.9 29.2 42 Q12 37.1 23 23 ZM23 23 Q34 37.1 16.8 42 Q5.8 27.9 23 23 ZM23 23 Q23.6 40.9 6.8 34.8 Q6.2 16.9 23 23 ZM23 23 Q13 37.8 3 23 Q13 8.2 23 23 ZM23 23 Q6.2 29.1 6.8 11.2 Q23.6 5.1 23 23 ZM23 23 Q5.8 18.1 16.8 4 Q34 8.9 23 23 ZM23 23 Q12 8.9 29.2 4 Q40.2 18.1 23 23 ZM23 23 Q22.4 5.1 39.2 11.2 Q39.8 29.1 23 23 Z"],["f","M23 23 Q32.4 15.5 35.6 27.1 Q26.2 34.6 23 23 ZM23 23 Q35 22.5 30.8 33.7 Q18.8 34.2 23 23 ZM23 23 Q33 29.6 23 36.2 Q13 29.6 23 23 ZM23 23 Q27.2 34.2 15.2 33.7 Q11 22.5 23 23 ZM23 23 Q19.8 34.6 10.4 27.1 Q13.6 15.5 23 23 ZM23 23 Q13.6 30.5 10.4 18.9 Q19.8 11.4 23 23 ZM23 23 Q11 23.5 15.2 12.3 Q27.2 11.8 23 23 ZM23 23 Q13 16.4 23 9.8 Q33 16.4 23 23 ZM23 23 Q18.8 11.8 30.8 12.3 Q35 23.5 23 23 ZM23 23 Q26.2 11.4 35.6 18.9 Q32.4 30.5 23 23 Z"],["s","M17.6 23 a5.4 5.4 0 1 0 10.8 0 a5.4 5.4 0 1 0 -10.8 0Z"],["d","M20.6 23 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0Z"],["d","M122 74 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0ZM72 124 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0ZM106.3 80 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0ZM78.3 108 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0Z"]],"fleuron":[["s","M-24 23 Q-42 14 -54 14 Q-66 14 -77 19 Q-88 24 -89.4 24.3 Q-90.9 24.6 -92.3 24.4 Q-93.7 24.3 -94.9 23.7 Q-96.2 23.2 -97.2 22.3 Q-98.2 21.5 -98.9 20.4 Q-99.6 19.3 -100 18.1 Q-100.3 16.9 -100.3 15.7 Q-100.2 14.5 -99.9 13.4 Q-99.5 12.3 -98.9 11.4 Q-98.2 10.5 -97.3 9.8 Q-96.5 9.1 -95.5 8.8 Q-94.5 8.4 -93.5 8.4 Q-92.5 8.3 -91.6 8.6 Q-90.7 8.8 -89.9 9.3 Q-89.1 9.8 -88.5 10.4 Q-87.9 11.1 -87.6 11.8 Q-87.2 12.6 -87.2 13.4 Q-87.1 14.2 -87.2 14.9 Q-87.3 15.7 -87.7 16.3 Q-88 17 -88.5 17.4 Q-89 17.9 -89.6 18.2 Q-90.1 18.5 -90.7 18.5 Q-91.3 18.6 -91.9 18.6 Q-92.4 18.5 -92.9 18.2 Q-93.3 18 -93.7 17.7 Q-94 17.3 -94.2 16.9 Q-94.4 16.5 -94.4 16.1 Q-94.5 15.7 -94.4 15.4 Q-94.3 15 -94.2 14.8 Q-94 14.5 -93.8 14.3 Q-93.6 14.1 -93.3 14.1 Q-93.1 14 -92.9 14 L-92.6 14"],["s","M24 23 Q42 14 54 14 Q66 14 77 19 Q88 24 89.4 24.3 Q90.9 24.6 92.3 24.4 Q93.7 24.3 94.9 23.7 Q96.2 23.2 97.2 22.3 Q98.2 21.5 98.9 20.4 Q99.6 19.3 100 18.1 Q100.3 16.9 100.3 15.7 Q100.2 14.5 99.9 13.4 Q99.5 12.3 98.9 11.4 Q98.2 10.5 97.3 9.8 Q96.5 9.1 95.5 8.8 Q94.5 8.4 93.5 8.4 Q92.5 8.3 91.6 8.6 Q90.7 8.8 89.9 9.3 Q89.1 9.8 88.5 10.4 Q87.9 11.1 87.6 11.8 Q87.2 12.6 87.2 13.4 Q87.1 14.2 87.2 14.9 Q87.3 15.7 87.7 16.3 Q88 17 88.5 17.4 Q89 17.9 89.6 18.2 Q90.1 18.5 90.7 18.5 Q91.3 18.6 91.9 18.6 Q92.4 18.5 92.9 18.2 Q93.3 18 93.7 17.7 Q94 17.3 94.2 16.9 Q94.4 16.5 94.4 16.1 Q94.5 15.7 94.4 15.4 Q94.3 15 94.2 14.8 Q94 14.5 93.8 14.3 Q93.6 14.1 93.3 14.1 Q93.1 14 92.9 14 L92.6 14"],["f","M-46 14 Q-57.2 18.4 -62.9 7.8 Q-51.7 3.4 -46 14 ZM-46 14 L-59.2 9.2M-66 14 Q-61.2 2.9 -49.7 6.4 Q-54.5 17.4 -66 14 ZM-66 14 L-53.3 8.1M-80 21 Q-70.9 23.8 -73 33.1 Q-82.1 30.3 -80 21 ZM-80 21 L-74.5 30.5M46 14 Q51.7 3.4 62.9 7.8 Q57.2 18.4 46 14 ZM46 14 L59.2 9.2M66 14 Q54.5 17.4 49.7 6.4 Q61.2 2.9 66 14 ZM66 14 L53.3 8.1M80 21 Q82.1 30.3 73 33.1 Q70.9 23.8 80 21 ZM80 21 L74.5 30.5"],["f","M0 36 Q9 48 0 60 Q-9 48 0 36 ZM0 36 L0 54.7"],["f","M0 23 Q11.5 6 23 23 Q11.5 40 0 23 ZM0 23 Q18.5 14 19.9 34.5 Q1.4 43.5 0 23 ZM0 23 Q20.5 24.4 11.5 42.9 Q-9 41.5 0 23 ZM0 23 Q17 34.5 0 46 Q-17 34.5 0 23 ZM0 23 Q9 41.5 -11.5 42.9 Q-20.5 24.4 0 23 ZM0 23 Q-1.4 43.5 -19.9 34.5 Q-18.5 14 0 23 ZM0 23 Q-11.5 40 -23 23 Q-11.5 6 0 23 ZM0 23 Q-18.5 32 -19.9 11.5 Q-1.4 2.5 0 23 ZM0 23 Q-20.5 21.6 -11.5 3.1 Q9 4.5 0 23 ZM0 23 Q-17 11.5 -0 0 Q17 11.5 0 23 ZM0 23 Q-9 4.5 11.5 3.1 Q20.5 21.6 0 23 ZM0 23 Q1.4 2.5 19.9 11.5 Q18.5 32 0 23 Z"],["f","M0 23 Q10.3 13.9 14.7 26.9 Q4.4 36.1 0 23 ZM0 23 Q13.5 20.2 10.7 33.7 Q-2.8 36.5 0 23 ZM0 23 Q13.1 27.4 3.9 37.7 Q-9.1 33.3 0 23 ZM0 23 Q9.1 33.3 -3.9 37.7 Q-13.1 27.4 0 23 ZM0 23 Q2.8 36.5 -10.7 33.7 Q-13.5 20.2 0 23 ZM0 23 Q-4.4 36.1 -14.7 26.9 Q-10.3 13.9 0 23 ZM0 23 Q-10.3 32.1 -14.7 19.1 Q-4.4 9.9 0 23 ZM0 23 Q-13.5 25.8 -10.7 12.3 Q2.8 9.5 0 23 ZM0 23 Q-13.1 18.6 -3.9 8.3 Q9.1 12.7 0 23 ZM0 23 Q-9.1 12.7 3.9 8.3 Q13.1 18.6 0 23 ZM0 23 Q-2.8 9.5 10.7 12.3 Q13.5 25.8 0 23 ZM0 23 Q4.4 9.9 14.7 19.1 Q10.3 32.1 0 23 Z"],["s","M-6.2 23 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0Z"],["d","M-2.8 23 a2.8 2.8 0 1 0 5.5 0 a2.8 2.8 0 1 0 -5.5 0Z"],["d","M-59.8 30 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0ZM56.2 30 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0Z"]]};
  var SW = { s: 1.7, f: 1.35 };
  function mul(a, b) {          // matrix a applied after b: [a b c d e f]
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  function band(k) { return D.T * k; }
  /* where everything goes for a frame w x h with unit scale k: tiles along the four sides, a corner at each corner, a fleuron in the middle of each side */
  function plan(w, h, k) {
    var T = D.T * k, tl = D.TL, fh = 108 * k, items = [], segs = [], o = 4 * k, n = T + 1.5 * k;
    function run(len, mid, cb) {                // tiles on both sides of the fleuron, stretched a little so that they fill exactly
      [[T, mid - fh], [mid + fh, len - T]].forEach(function (r) {
        var L = r[1] - r[0], cnt = Math.max(1, Math.round(L / (tl * k))), sx = L / cnt / tl;
        for (var i = 0; i < cnt; i++) cb(r[0] + i * sx * tl, sx);
      });
    }
    run(w, w / 2, function (x, sx) { items.push(["tile", [sx, 0, 0, k, x, 0]]); items.push(["tile", [sx, 0, 0, -k, x, h]]); });
    run(h, h / 2, function (y, sx) { items.push(["tile", [0, sx, k, 0, 0, y]]); items.push(["tile", [0, sx, -k, 0, w, y]]); });
    items.push(["corner", [k, 0, 0, k, 0, 0]], ["corner", [-k, 0, 0, k, w, 0]], ["corner", [k, 0, 0, -k, 0, h]], ["corner", [-k, 0, 0, -k, w, h]]);
    items.push(["fleuron", [k, 0, 0, k, w / 2, 0]], ["fleuron", [k, 0, 0, -k, w / 2, h]], ["fleuron", [0, k, k, 0, 0, h / 2]], ["fleuron", [0, k, -k, 0, w, h / 2]]);
    var g = 36 * k, c0 = T + 2 * k;             // the rules (two on each side), broken where a fleuron sits
    [o, n].forEach(function (q, j) {
      var s0 = j ? n : c0, sw = (j ? 1.1 : 2.2) * k;
      segs.push([s0, q, w / 2 - g, q, sw], [w / 2 + g, q, w - s0, q, sw], [s0, h - q, w / 2 - g, h - q, sw], [w / 2 + g, h - q, w - s0, h - q, sw]);
      segs.push([q, s0, q, h / 2 - g, sw], [q, h / 2 + g, q, h - s0, sw], [w - q, s0, w - q, h / 2 - g, sw], [w - q, h / 2 + g, w - q, h - s0, sw]);
    });
    return { items: items, segs: segs };
  }
  function pieceSvg(name) {
    return D[name].map(function (p) {
      var a = p[0] === "d" ? 'fill="currentColor"' : p[0] === "f" ? 'fill="currentColor" fill-opacity=".24" stroke="currentColor" stroke-width="' + SW.f + '" stroke-linejoin="round"'
        : 'fill="none" stroke="currentColor" stroke-width="' + SW.s + '" stroke-linecap="round"';
      return '<path ' + a + ' d="' + p[1] + '"/>';
    }).join("");
  }
  function svg(w, h, k) {
    var pl = plan(w, h, k), s = '<svg class="mf-flora" xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true" focusable="false"><defs>';
    ["tile", "corner", "fleuron"].forEach(function (n) { s += '<g id="orn-' + n + '">' + pieceSvg(n) + "</g>"; });
    s += "</defs>";
    pl.segs.forEach(function (g) { s += '<path d="M' + g[0].toFixed(1) + " " + g[1].toFixed(1) + "L" + g[2].toFixed(1) + " " + g[3].toFixed(1) + '" stroke="currentColor" stroke-width="' + g[4].toFixed(2) + '" stroke-linecap="square" fill="none"/>'; });
    pl.items.forEach(function (it) { s += '<use href="#orn-' + it[0] + '" transform="matrix(' + it[1].map(function (v) { return +v.toFixed(3); }).join(" ") + ')"/>'; });
    return s + "</svg>";
  }
  var cache = null;
  function paint(c, w, h, k, rgb) {        // rgb: "255,163,26"
    if (!cache) { cache = {}; ["tile", "corner", "fleuron"].forEach(function (n) { cache[n] = D[n].map(function (p) { return [p[0], new Path2D(p[1])]; }); }); }
    var pl = plan(w, h, k);
    c.save(); c.lineCap = "square"; c.strokeStyle = "rgba(" + rgb + ",0.95)";
    pl.segs.forEach(function (g) { c.lineWidth = g[4]; c.beginPath(); c.moveTo(g[0], g[1]); c.lineTo(g[2], g[3]); c.stroke(); });
    c.restore();
    pl.items.forEach(function (it) {
      c.save(); c.transform.apply(c, it[1]); c.lineJoin = "round"; c.lineCap = "round";
      cache[it[0]].forEach(function (p) {
        if (p[0] === "d") { c.fillStyle = "rgba(" + rgb + ",0.95)"; c.fill(p[1]); return; }
        if (p[0] === "f") { c.fillStyle = "rgba(" + rgb + ",0.24)"; c.fill(p[1]); }
        c.lineWidth = SW[p[0]]; c.strokeStyle = "rgba(" + rgb + ",0.95)"; c.stroke(p[1]);
      });
      c.restore();
    });
  }
  return { svg: svg, paint: paint, band: band };
})();
  /* ORNAMENT:END */
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = ROOT + src; s.onload = function () { res(); }; s.onerror = function () { rej(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  /* ================================================================ the shared clock ================ */
  var clock = (function () {
    var c = { base: Date.now(), perf: performance.now(), speed: 1, playing: true, subs: [], raf: 0, dirty: true };
    c.now = function () { return c.playing ? c.base + (performance.now() - c.perf) * c.speed : c.base; };
    function rebase() { c.base = c.now(); c.perf = performance.now(); }
    c.on = function (fn) { c.subs.push(fn); c.kick(); };
    c.kick = function () { c.dirty = true; if (!c.raf) c.raf = requestAnimationFrame(loop); };
    c.set = function (ms) { c.base = ms; c.perf = performance.now(); c.kick(); };
    c.setSpeed = function (s) { rebase(); c.speed = s; c.kick(); };
    c.play = function () { if (!c.playing) { c.base = c.base; c.perf = performance.now(); c.playing = true; } c.kick(); };
    c.pause = function () { rebase(); c.playing = false; c.kick(); };
    c.toggle = function () { if (c.playing) c.pause(); else c.play(); };
    c.live = function () { c.base = Date.now(); c.perf = performance.now(); c.speed = 1; c.playing = true; c.kick(); };
    c.isLive = function () { return c.playing && c.speed === 1 && Math.abs(c.now() - Date.now()) < 1500; };
    function loop() {
      c.raf = 0;
      var ms = c.now(), force = c.dirty; c.dirty = false;
      for (var i = 0; i < c.subs.length; i++) { try { c.subs[i](ms, force); } catch (e) { if (window.console) console.error(e); } }
      if (c.playing && !document.hidden) c.raf = requestAnimationFrame(loop);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) c.kick(); });
    return c;
  })();

  /* ================================================================ 1. the yin-yang and the scroll ====== */
  var ROMAN = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  function roman(n) { var s = ""; ROMAN.forEach(function (r) { while (n >= r[0]) { s += r[1]; n -= r[0]; } }); return s; }
  function mod(a, n) { return ((a % n) + n) % n; }
  var EPOCH = Date.UTC(2026, 0, 1);
  function chapterOfDay(ms) {
    var d = new Date(ms), day = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - EPOCH) / 86400000);
    return mod(day, 81) + 1;
  }

  function mountScroll() {
    var btn = $("[data-yy]"), scroll = $("[data-scroll]");
    if (!btn || !scroll) return;
    var spin = btn.querySelector("svg"), hint = $("[data-yy-hint]"), sheet = $("[data-sheet]");
    var body = $("[data-chapter]"), prev = $("[data-prev]"), next = $("[data-next]"), today = $("[data-today]"), pick = $("[data-pick]");
    var DATA = window.TC_TAO || {}, todayCh = chapterOfDay(Date.now()), shown = todayCh, angle = 0, busy = false;
    var CREDIT = { mitchell: "Tao Te Ching, English version by Stephen Mitchell.", legge: "Tao Te Ching, translated by James Legge (1891; public domain)." };
    var ver = store("tc_tao_ver") === "legge" && DATA.legge ? "legge" : (DATA.mitchell ? "mitchell" : "legge");
    var vbtns = $$("[data-ver]");

    function dateLine() {
      var d = new Date(Date.now());
      return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear() + " (UTC)";
    }
    function blocks(ch) {
      return ch.b.map(function (b) {
        if (b[0] === "s") return '<p class="stanza">' + b[1].map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + "</p>";
        if (b[0] === "v") return '<p class="verse">' + b[1].map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("<br>") + "</p>";
        return "<p>" + esc(b[1]) + "</p>";
      }).join("");
    }
    function show(n) {
      var ch = (DATA[ver] || [])[n - 1];
      if (!ch) { body.innerHTML = "<p>The text could not be loaded.</p>"; return; }
      shown = n;
      body.innerHTML =
        '<p class="ch-kicker">' + (n === todayCh ? "Today&rsquo;s chapter" : "Chapter") + " &middot; " + n + " of 81</p>" +
        '<h2 class="ch-roman" aria-label="Chapter ' + n + '">' + roman(n) + "</h2>" +
        (n === todayCh ? '<p class="ch-date">' + dateLine() + "</p>" : "") +
        '<div class="ch-body">' + blocks(ch) + "</div>" +
        '<p class="ch-credit">' + CREDIT[ver] + "</p>";
      var p = n === 1 ? 81 : n - 1, q = n === 81 ? 1 : n + 1;
      prev.textContent = "‹ " + p; prev.setAttribute("aria-label", "Chapter " + p);
      next.textContent = q + " ›"; next.setAttribute("aria-label", "Chapter " + q);
      today.hidden = n === todayCh;
      if (pick) pick.value = String(n);
    }
    vbtns.forEach(function (b) {
      var v = b.getAttribute("data-ver");
      if (!DATA[v]) { b.hidden = true; return; }
      b.setAttribute("aria-pressed", String(v === ver));
      b.addEventListener("click", function () {
        ver = v; store("tc_tao_ver", v);
        vbtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-ver") === ver)); });
        show(shown);
      });
    });
    if (pick) {
      var o = ""; for (var i = 1; i <= 81; i++) o += '<option value="' + i + '">' + i + "</option>";
      pick.innerHTML = o;
      pick.addEventListener("change", function () { show(+pick.value); });
    }
    prev.addEventListener("click", function () { show(shown === 1 ? 81 : shown - 1); });
    next.addEventListener("click", function () { show(shown === 81 ? 1 : shown + 1); });
    today.addEventListener("click", function () { todayCh = chapterOfDay(Date.now()); show(todayCh); });

    /* ---- save the chapter that is shown: as a picture (PNG, drawn on a canvas, no network) or as plain text ---- */
    function saveFile(blob, name) {
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }
    function chName(ext) { return "tao-te-ching-" + two(shown) + "-" + ver + "." + ext; }
    function chapterNow() { return (DATA[ver] || [])[shown - 1]; }
    function saveText() {
      var ch = chapterNow(); if (!ch) return;
      var out = "Tao Te Ching, chapter " + shown + " of 81 (" + roman(shown) + ")\n" + (shown === todayCh ? dateLine() + "\n" : "") + "\n";
      ch.b.forEach(function (b) { out += (b[0] === "p" ? b[1] : b[1].join("\n")) + "\n\n"; });
      out += CREDIT[ver] + "\nTwelveCubed, the RoTao page.\n";
      saveFile(new Blob([out], { type: "text/plain;charset=utf-8" }), chName("txt"));
    }
    function savePicture(btn) {
      var ch = chapterNow(); if (!ch) return;
      var DISP = "'IM Fell English', 'Iowan Old Style', Palatino, Georgia, serif", TEXT = "'Literata', Georgia, 'Times New Roman', serif";
      var INK = "#2a2017", SEAL = "#9c2f1f", DIM = "rgba(42,32,23,0.68)";
      var W = 1200, M = 124, TW = W - 2 * M, S = 1.5, LH = 62, GAP = 30;
      var wait = document.fonts && document.fonts.load ? Promise.all(["400 36px Literata", "italic 400 36px Literata", "400 120px 'IM Fell English'", "italic 400 38px 'IM Fell English'"].map(function (f) { return document.fonts.load(f); })).catch(function () { return 0; }) : Promise.resolve(0);
      btn.disabled = true;
      return wait.then(function () {
        var mc = document.createElement("canvas").getContext("2d");
        function wrap(text, font, maxW, firstIndent, restIndent) {
          mc.font = font;
          var words = String(text).split(/\s+/), out = [], cur = "", first = true;
          words.forEach(function (w) {
            var t = cur ? cur + " " + w : w, lim = maxW - (first ? firstIndent : restIndent);
            if (cur && mc.measureText(t).width > lim) { out.push({ s: cur, ind: first ? firstIndent : restIndent }); first = false; cur = w; } else cur = t;
          });
          if (cur) out.push({ s: cur, ind: first ? firstIndent : restIndent });
          return out;
        }
        var F_BODY = "400 36px " + TEXT, F_VERSE = "italic 400 39px " + DISP;
        var rows = [];                                    // {s, x, font, gapAfter, bar}
        ch.b.forEach(function (b) {
          var lines = b[0] === "p" ? [b[1]] : b[1], verse = b[0] === "v", startRow = rows.length;
          lines.forEach(function (ln) {
            wrap(ln, verse ? F_VERSE : F_BODY, TW - (verse ? 44 : 0), 0, b[0] === "s" ? 50 : 0).forEach(function (w) {
              rows.push({ s: w.s, x: M + (verse ? 44 : 0) + w.ind, font: verse ? F_VERSE : F_BODY, lh: verse ? 58 : LH, bar: verse });
            });
          });
          if (rows.length > startRow) rows[rows.length - 1].gap = GAP;
        });
        var top = 560, bodyH = rows.reduce(function (n, r) { return n + r.lh + (r.gap || 0); }, 0), H = Math.max(1500, top + bodyH + 250);
        var cv = document.createElement("canvas"); cv.width = W * S; cv.height = H * S;
        var c = cv.getContext("2d"); c.scale(S, S);
        var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f2e9cf"); g.addColorStop(0.55, "#e9dcb8"); g.addColorStop(1, "#dccb9f");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        var rg = c.createRadialGradient(W / 2, 0, 20, W / 2, 0, H * 0.7); rg.addColorStop(0, "rgba(255,250,232,0.85)"); rg.addColorStop(1, "rgba(255,250,232,0)");
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
        c.strokeStyle = "rgba(120,85,30,0.55)"; c.lineWidth = 3; c.strokeRect(40, 40, W - 80, H - 80);
        c.strokeStyle = "rgba(120,85,30,0.3)"; c.lineWidth = 1.5; c.strokeRect(52, 52, W - 104, H - 104);
        // the yin-yang
        var cx = W / 2, cy = 150, r = 48;
        c.fillStyle = "#f6edd2"; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false); c.arc(cx, cy + r / 2, r / 2, Math.PI / 2, Math.PI * 1.5, false); c.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.fill();
        c.beginPath(); c.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#f6edd2"; c.beginPath(); c.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2); c.fill();
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
        c.textAlign = "center";
        c.fillStyle = DIM; c.font = "400 25px " + TEXT; if ("letterSpacing" in c) c.letterSpacing = "7px";
        c.fillText(("Tao Te Ching · Chapter " + shown + " of 81").toUpperCase(), W / 2 + 3, 266);
        if ("letterSpacing" in c) c.letterSpacing = "0px";
        c.fillStyle = SEAL; c.font = "400 150px " + DISP; c.fillText(roman(shown), W / 2, 420);
        if (shown === todayCh) { c.fillStyle = DIM; c.font = "italic 400 31px " + DISP; c.fillText(dateLine(), W / 2, 478); }
        c.strokeStyle = "rgba(42,32,23,0.22)"; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 90, 520); c.lineTo(W / 2 + 90, 520); c.stroke();
        c.textAlign = "left"; var y = top + 40, barFrom = null;
        rows.forEach(function (rw, i) {
          c.font = rw.font; c.fillStyle = INK; c.fillText(rw.s, rw.x, y);
          if (rw.bar && barFrom === null) barFrom = y - rw.lh * 0.7;
          var last = !rows[i + 1] || !rows[i + 1].bar || rw.gap;
          if (rw.bar && last) { c.fillStyle = "rgba(156,47,31,0.4)"; c.fillRect(M + 8, barFrom, 3, y + 14 - barFrom); barFrom = null; }
          y += rw.lh + (rw.gap || 0);
        });
        c.textAlign = "center"; c.strokeStyle = "rgba(42,32,23,0.2)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(M + 80, H - 190); c.lineTo(W - M - 80, H - 190); c.stroke();
        c.fillStyle = DIM; c.font = "400 25px " + TEXT; c.fillText(CREDIT[ver], W / 2, H - 140);
        c.font = "italic 400 28px " + DISP; c.fillText("TwelveCubed · RoTao", W / 2, H - 98);
        return new Promise(function (res) { cv.toBlob(res, "image/png"); });
      }).then(function (blob) { btn.disabled = false; if (blob) saveFile(blob, chName("png")); }, function () { btn.disabled = false; });
    }
    $$("[data-dl]").forEach(function (b) {
      b.addEventListener("click", function (ev) { if (ev.shiftKey) saveText(); else savePicture(b); });
    });

    function setOpen(open) {
      scroll.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Roll the scroll up" : "Open today’s chapter");
      sheet.inert = !open; sheet.setAttribute("aria-hidden", open ? "false" : "true");
      if (hint) hint.textContent = open ? "Touch the symbol again to roll the scroll up." : "Touch the yin-yang to unfold today’s chapter.";
    }
    setOpen(false);
    show(todayCh);

    btn.addEventListener("click", function () {
      if (busy) return;
      var open = !scroll.classList.contains("is-open");
      if (reduce) { setOpen(open); return; }
      busy = true;
      angle += open ? 360 : -360;
      spin.style.transform = "rotate(" + angle + "deg)";
      btn.classList.add("is-turning");
      setTimeout(function () { setOpen(open); }, open ? 780 : 120);
      setTimeout(function () { busy = false; btn.classList.remove("is-turning"); }, 1500);
    });

    if (/#(today|open)\b/.test(location.hash)) setTimeout(function () { btn.click(); }, 500);
  }

  /* ================================================================ 2. the Cistercian clock ============= */
  function mountCistercian() {
    var root = $("[data-cist]"), C = window.TCCist;
    if (!root || !C) return;
    var slots = {};
    $$("[data-g]", root).forEach(function (el) { slots[el.getAttribute("data-g")] = { el: el, last: null }; });
    /* three choices: UTC and My clock show the Cistercian signs; Analog shows the Buddha face on the visitor's own clock */
    var saved = store("tc_daily_zone"), mode = saved === "local" || saved === "analog" ? saved : "utc";
    var zone = mode === "utc" ? "utc" : "local";
    var face = $("[data-analog]", root), box = root.querySelector(".cist-clock");
    var hands = {}; $$("[data-an]", root).forEach(function (g) { hands[g.getAttribute("data-an")] = g; });
    function setMode(m) { mode = m; zone = m === "utc" ? "utc" : "local"; if (box) box.classList.toggle("is-analog", m === "analog" && !!face); }
    setMode(mode);
    var tzBtns = $$("[data-zone]", root), tag = $("[data-sim]", root), dline = $("[data-dateline]", root), zline = $("[data-zoneline]", root);
    var live = $("[data-live]", root), readout = $("[data-cist-read]", root);

    function put(name, n, compact, text) {
      var s = slots[name]; if (!s) return;
      var sig = n + ":" + compact;
      if (s.last === sig) return;
      s.last = sig;
      s.el.querySelector(".cc-sign").innerHTML = C.svg(n, { compact: compact, label: text + " in Cistercian numerals" });
      s.el.querySelector(".cc-num").textContent = (compact ? two(n) : String(n));
    }
    function parts(ms) {
      var d = new Date(ms);
      if (zone === "utc") return { h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), D: d.getUTCDate(), M: d.getUTCMonth() + 1, Y: d.getUTCFullYear(), w: d.getUTCDay() };
      return { h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds(), D: d.getDate(), M: d.getMonth() + 1, Y: d.getFullYear(), w: d.getDay() };
    }
    function zoneName() {
      if (zone === "utc") return "UTC, Coordinated Universal Time";
      try { return "Your clock: " + Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return "Your clock"; }
    }
    var lastLine = "";
    function render(ms) {
      var p = parts(ms);
      put("h", p.h, true, "hours " + p.h); put("m", p.mi, true, "minutes " + p.mi); put("s", p.s, true, "seconds " + p.s);
      put("D", p.D, true, "day " + p.D); put("M", p.M, true, "month " + p.M); put("Y", p.Y, false, "year " + p.Y);
      var line = DAYS[p.w] + " " + p.D + " " + MONTHS[p.M - 1] + " " + p.Y;
      if (line !== lastLine) { lastLine = line; dline.textContent = line; }
      var z = zoneName(); if (zline.textContent !== z) zline.textContent = z;
      var spoken = two(p.h) + ":" + two(p.mi) + ":" + two(p.s) + " " + line + (zone === "utc" ? " UTC" : "");
      if (readout && Math.floor(ms / 60000) !== render.m) { render.m = Math.floor(ms / 60000); readout.textContent = spoken; }
      if (mode === "analog" && face) {
        var fr = (((ms % 1000) + 1000) % 1000) / 1000, sf = p.s + fr;
        hands.h.setAttribute("transform", "rotate(" + (((p.h % 12) + (p.mi + sf / 60) / 60) * 30).toFixed(2) + ")");
        hands.m.setAttribute("transform", "rotate(" + ((p.mi + sf / 60) * 6).toFixed(2) + ")");
        hands.s.setAttribute("transform", "rotate(" + (sf * 6).toFixed(2) + ")");
      }
      var isLive = clock.isLive();
      if (tag) tag.hidden = isLive;
      if (live && !isLive) live.textContent = clock.playing ? "Simulated time, " + speedText(clock.speed) : "Simulated time, paused";
    }
    function speedText(s) {
      var a = Math.abs(s), sign = s < 0 ? "backwards " : "";
      if (a === 1) return sign + "real speed";
      if (a < 3600) return sign + "×" + a;
      return sign + "×" + a.toLocaleString("en-US");
    }
    tzBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-zone") === mode));
      b.addEventListener("click", function () {
        setMode(b.getAttribute("data-zone")); store("tc_daily_zone", mode);
        tzBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        Object.keys(slots).forEach(function (k) { slots[k].last = null; });
        render(clock.now());
      });
    });
    var nowBtn = $("[data-cist-now]", root);
    if (nowBtn) nowBtn.addEventListener("click", function () { clock.live(); });
    clock.on(function (ms) { render(ms); });

    /* the converter: any number from 0 to 9999 */
    var form = $("[data-conv]"), inp = form && form.querySelector("input"), out = form && form.querySelector("[data-conv-out]");
    if (form) {
      var run = function () {
        var v = parseInt(inp.value, 10);
        if (!(v >= 0 && v <= 9999)) { out.innerHTML = '<span class="conv-note">Type a whole number from 0 to 9999.</span>'; return; }
        out.innerHTML = C.svg(v, { label: v + " in Cistercian numerals" });
      };
      inp.addEventListener("input", run); form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
      inp.value = String(new Date().getUTCFullYear()); run();
    }
    var key = $("[data-key]"); if (key) key.innerHTML = C.key();
  }

  /* ================================================================ 3. the celestial clock (lazy) ====== */
  /* the sky libraries (astronomy-engine, our chart maths, glyphs) are shared by the celestial clock and the Moon calendar; loaded once, in order */
  var libsPromise = null;
  function loadLibs() {
    if (libsPromise) return libsPromise;
    var seq = [];
    if (!window.Astronomy) seq.push("vendor/astronomy.browser.min.js");
    if (!window.TCAstro) seq.push("js/astro.js");
    if (!window.TC_CHIRON) seq.push("js/chiron.js");
    if (!window.TCEphem) seq.push("js/ephem.js");
    if (!window.TC_GLYPHS) seq.push("js/glyphs.js");
    if (!window.TCWheel) seq.push("js/chartwheel.js");
    if (!window.TC_TZPLACE) seq.push("data/tzplace.js");
    libsPromise = seq.reduce(function (p, s) { return p.then(function () { return loadScript(s); }); }, Promise.resolve());
    libsPromise.catch(function () { libsPromise = null; });
    return libsPromise;
  }

  function mountCosmos() {
    var sec = $("[data-cosmos]");
    if (!sec || sec.hasAttribute("data-soon")) return;
    var started = false;
    function go() {
      if (started) return; started = true;
      loadLibs()
        .then(function () { return window.TC_LAND ? null : loadScript("data/land.js"); })
        .then(function () { return window.TCAstrolabe ? null : loadScript("js/astrolabe.js"); })
        .then(function () { window.TCAstrolabe.mount($("[data-astro]", sec), clock); })
        .catch(function (e) {
          started = false;
          var m = $("[data-astro]", sec); if (m) m.innerHTML = '<p class="notice">The celestial clock could not load. Reload the page to try again.</p>';
          if (window.console) console.error(e);
        });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); go(); } }); }, { rootMargin: "700px 0px" });
      io.observe(sec);
    } else go();
  }

  /* ================================================================ 4. the Moon calendar (lazy) ======= */
  function mountMoonCal() {
    var sec = $("[data-mooncal]");
    if (!sec) return;
    var started = false;
    function go() {
      if (started) return; started = true;
      loadLibs()
        .then(function () { return window.TCMoonCal ? null : loadScript("js/mooncal.js"); })
        .then(function () { window.TCMoonCal.mount($("[data-mc]", sec)); })
        .catch(function (e) {
          started = false;
          var m = $("[data-mc]", sec); if (m) m.innerHTML = '<p class="notice">The Moon calendar could not load. Reload the page to try again.</p>';
          if (window.console) console.error(e);
        });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); go(); } }); }, { rootMargin: "700px 0px" });
      io.observe(sec);
    } else go();
  }

  /* ================================================================ 5. the motto card as a picture ======= */
  /* The card under "the manifesto" (the motto, the name and the six tongues) drawn on a canvas and saved as a large PNG, always in the
     dark blue and orange of the site whatever theme is on. The words are read from the card itself, so manifesto.json stays the one source.
     The globe and the sun halo come from data/art.js (data addresses, so the canvas can be exported from file:// pages too). Nothing is sent anywhere. */
  function mountManifesto() {
    var sec = $(".manifesto"), btn = $("[data-mf-save]");
    if (!sec || !btn) return;
    var label = $("span", btn), idle = label ? label.textContent : "", busy = false;
    var DISP = "'IM Fell English', 'Iowan Old Style', Palatino, Georgia, serif", TEXT = "'Literata', Georgia, 'Times New Roman', serif";
    var ORANGE = "#ffa31a", GROUND = "#08104a", PAPER = "#eaf1ee", DIM = "#c4d3da";
    var FONT = {
      la: TEXT, he: "'Noto Serif Hebrew', 'SBL Hebrew', serif", syr: "'TC Syriac', 'Noto Sans Syriac', 'Estrangelo Edessa', serif",
      ar: "'TC Arabic', 'Noto Naskh Arabic', 'Amiri', serif", el: "'TC Greek', 'Literata', Georgia, serif",
      ja: "'TC Japanese', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
    };
    var SIZE = { la: 47, he: 56, syr: 48, ar: 58, el: 46, ja: 45 }, LHM = { la: 1.45, he: 1.42, syr: 1.55, ar: 1.5, el: 1.45, ja: 1.5 };

    function readCard() {
      return {
        lines: $$(".mf-main > span", sec).map(function (sp) {
          return Array.prototype.map.call(sp.childNodes, function (n) { return { t: n.textContent, em: n.nodeType === 1 }; });
        }),
        subtitle: ($(".mf-hebrew", sec) ? $(".mf-hebrew", sec).textContent.trim() : ""), name: $(".mf-name", sec).textContent, title: $(".mf-title", sec).textContent,
        tongues: $$(".mf-t", sec).map(function (t) {
          var s = $(".mf-script", t), tr = $(".mf-tr", t);
          return { name: $(".mf-lang", t).textContent, text: s.textContent, lang: s.getAttribute("lang") || "la", rtl: s.getAttribute("dir") === "rtl", tr: tr ? tr.textContent : "" };
        })
      };
    }
    function loadImage(src) {
      return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
    }
    function prepare(card) {
      var fonts = ["italic 400 100px 'IM Fell English'", "400 100px 'IM Fell English'", "400 40px Literata", "italic 400 28px Literata", "600 20px Literata"]
        .map(function (f) { return document.fonts.load(f, "That we are, for all things serve. " + card.name + " " + card.title); });
      if (card.subtitle) fonts.push(document.fonts.load("700 48px " + FONT.he, card.subtitle));      // the Hebrew line under the motto
      card.tongues.forEach(function (t) {
        fonts.push(document.fonts.load("400 48px " + FONT[t.lang], t.text));
        if (t.tr) fonts.push(document.fonts.load("italic 400 28px Literata", t.tr));
      });
      var fontsReady = document.fonts && document.fonts.load ? Promise.all(fonts).catch(function () { return 0; }) : Promise.resolve(0);
      return Promise.all([fontsReady, loadArt()]).then(function () {
        return Promise.all([loadImage(window.TC_ART.globe), loadImage(window.TC_ART.sun)]);
      }).then(function (im) {
        if (!im[0] || !im[1]) throw new Error("The pictures for the card could not be decoded.");      // never save a card without its globe and sun
        return im;
      });
    }
    /* data/art.js holds the globe and the sun halo. An older copy of that file (from an earlier version of the site, kept by the browser or by the
       offline copy) lacks them: then it is fetched again once, a moment later, because the offline worker refreshes it in the background. */
    function loadArt() {
      var ok = function () { return window.TC_ART && window.TC_ART.globe && window.TC_ART.sun; };
      function pull(first) {
        if (ok()) return Promise.resolve();
        return loadScript(first ? "data/art.js" : "data/art.js?r=" + Date.now()).then(function () {
          if (ok()) return;
          if (!first) throw new Error("The pictures file is out of date. Reload the page and try again.");
          return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return pull(false); });
        });
      }
      return pull(true);
    }

    function draw(card, globe, sun, cap) {
      var W = 1400, PAD = 96, COLW = 600, mc = document.createElement("canvas").getContext("2d");
      function wrap(text, font, maxW, joiner) {
        mc.font = font;
        var toks = String(text).replace(/([、，])/g, "$1 ").split(/\s+/).filter(Boolean), out = [], cur = "";
        toks.forEach(function (w) {
          var t = cur ? cur + joiner + w : w;
          if (cur && mc.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
        });
        if (cur) out.push(cur);
        var fin = [];
        out.forEach(function (ln) {        // a line still too wide (a long unbroken run) is cut by letters
          if (mc.measureText(ln).width <= maxW) { fin.push(ln); return; }
          var part = "";
          Array.prototype.forEach.call(ln, function (ch) { if (part && mc.measureText(part + ch).width > maxW) { fin.push(part); part = ch; } else part += ch; });
          if (part) fin.push(part);
        });
        return fin;
      }
      // ---- layout
      var GW = 380, GH = 475, GY = 150, GX = (W - GW) / 2;
      var mainSize = 116, mainLines = card.lines;
      function mainWidth(ln, size) {
        return ln.reduce(function (n, s) { mc.font = (s.em ? "400 " : "italic 400 ") + size + "px " + DISP; return n + mc.measureText(s.t).width; }, 0);
      }
      while (mainSize > 60 && Math.max.apply(null, mainLines.map(function (l) { return mainWidth(l, mainSize); })) > W - 2 * PAD - 40) mainSize -= 4;
      var yMain = GY + GH + 40 + mainSize * 0.95, mainLH = mainSize * 1.14;
      var HEB = 40, yHeb = yMain + mainLH * (mainLines.length - 1) + 92;              // the Hebrew line (.mf-hebrew) sits right under the motto
      var yName = (card.subtitle ? yHeb + 92 : yMain + mainLH * (mainLines.length - 1) + 118), yTitle = yName + 50, yOrn = yTitle + 62, yTong = yOrn + 70;
      var blocks = card.tongues.map(function (t) {
        var f = "400 " + SIZE[t.lang] + "px " + FONT[t.lang], lh = SIZE[t.lang] * LHM[t.lang];
        var sl = wrap(t.text, f, COLW - 20, t.lang === "ja" ? "" : " "), tl = t.tr ? wrap(t.tr, "italic 400 29px " + TEXT, COLW - 20, " ") : [];
        return { t: t, f: f, lh: lh, sl: sl, tl: tl, h: 34 + 12 + sl.length * lh + (tl.length ? 10 + tl.length * 40 : 0) };
      });
      var colX = [PAD + COLW / 2, W - PAD - COLW / 2], lastBottom = [yTong, yTong], prevY = yTong, prevH = 0, bottom = yTong;
      blocks.forEach(function (b, i) {
        var col = i % 2, y = i === 0 ? yTong : Math.max(prevY + prevH * 0.56 + 18, lastBottom[col] + 30);
        b.x = colX[col]; b.y = y; lastBottom[col] = y + b.h; prevY = y; prevH = b.h; bottom = Math.max(bottom, y + b.h);
      });
      var yFoot = bottom + 110, H = Math.round(yFoot + 120);
      var S = Math.min(2.5, Math.sqrt(cap / (W * H)));

      // ---- paint
      /* An opaque canvas kept in ordinary memory (willReadFrequently): a phone's graphics memory is what gives up first on a picture this big,
         and when it does the canvas comes back with parts of the card missing and the rest see-through. */
      var cv = document.createElement("canvas"); cv.width = Math.round(W * S); cv.height = Math.round(H * S);
      var c = cv.getContext("2d", { alpha: false, willReadFrequently: true }) || cv.getContext("2d");
      c.fillStyle = GROUND; c.fillRect(0, 0, cv.width, cv.height);      // every pixel, the last row and column included (W * S is rarely a whole number)
      c.scale(S, S);
      function ls(px) { if ("letterSpacing" in c) c.letterSpacing = px + "px"; }
      function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function arch(x, y, w, h, r2) {
        var r = w / 2; c.beginPath(); c.moveTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0);
        c.lineTo(x + w, y + h - r2); c.quadraticCurveTo(x + w, y + h, x + w - r2, y + h); c.lineTo(x + r2, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r2); c.closePath();
      }
      function archOut(e) { arch(GX - e, GY - e, GW + 2 * e, GH + 2 * e, 24 + e); }
      function diamond(x, y, s) {
        c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = ORANGE; c.shadowColor = "rgba(255,170,40,0.8)"; c.shadowBlur = 16; c.fillRect(-s / 2, -s / 2, s, s); c.restore();
      }
      c.fillStyle = GROUND; c.fillRect(0, 0, W, H);
      var FX = 34, FY = 34, FW = W - 68, FH = H - 68;
      rr(FX, FY, FW, FH, 8); c.save(); c.clip();
      var rg = c.createRadialGradient(W / 2, FY, 0, W / 2, FY, W * 0.66); rg.addColorStop(0, "rgba(255,166,38,0.22)"); rg.addColorStop(1, "rgba(255,166,38,0)");
      c.fillStyle = rg; c.fillRect(FX, FY, FW, FH);
      c.fillStyle = "rgba(234,241,238,0.045)"; c.fillRect(FX, FY, FW, FH);
      if (sun) { c.globalAlpha = 0.13; c.drawImage(sun, W / 2 - 480, FY + 14, 960, 960); c.globalAlpha = 1; }      // the whole orange flower, its top petals just inside the frame
      c.restore();
      // the frame: a floral border (vine, corner flourishes and a fleuron in the middle of each side), the same drawing as on the page
      c.save(); c.translate(FX, FY); c.shadowColor = "rgba(255,170,40,0.55)"; c.shadowBlur = 9; ORN.paint(c, FW, FH, 1.25, "255,163,26"); c.restore();

      // the globe in its arch
      c.save(); c.shadowColor = "rgba(255,166,38,0.28)"; c.shadowBlur = 56; c.shadowOffsetY = 14; archOut(8); c.fillStyle = GROUND; c.fill(); c.restore();
      archOut(7); c.fillStyle = GROUND; c.fill(); archOut(7.5); c.strokeStyle = "rgba(255,166,38,0.38)"; c.lineWidth = 1.5; c.stroke();
      if (globe) {
        c.save(); arch(GX, GY, GW, GH, 24); c.clip();
        var k = Math.max(GW / globe.width, GH / globe.height), dw = globe.width * k, dh = globe.height * k;
        c.drawImage(globe, GX + (GW - dw) / 2, GY + (GH - dh) / 2, dw, dh); c.restore();
      }
      archOut(1); c.strokeStyle = "rgba(255,166,38,0.95)"; c.lineWidth = 3.5; c.stroke();

      // the motto
      c.textBaseline = "alphabetic"; c.textAlign = "left";
      mainLines.forEach(function (ln, i) {
        var x = (W - mainWidth(ln, mainSize)) / 2, y = yMain + i * mainLH;
        ln.forEach(function (s) {
          c.font = (s.em ? "400 " : "italic 400 ") + mainSize + "px " + DISP; c.fillStyle = s.em ? ORANGE : PAPER;
          c.shadowColor = "rgba(255,166,38,0.5)"; c.shadowBlur = 30; c.fillText(s.t, x, y); c.shadowBlur = 0; c.shadowColor = "transparent";
          x += c.measureText(s.t).width;
        });
      });
      c.textAlign = "center";
      if (card.subtitle) {                  // the Hebrew line: bold, cyan and letter-spaced, as .mf-hebrew is on the page
        c.direction = "rtl"; c.font = "700 " + HEB + "px " + FONT.he; c.fillStyle = "cyan"; ls(HEB * 0.22);
        c.fillText(card.subtitle, W / 2 + HEB * 0.135, yHeb); ls(0); c.direction = "ltr";
      }
      c.font = "400 58px " + DISP; c.fillStyle = PAPER; ls(3.5); c.fillText(card.name, W / 2 + 2, yName); ls(0);
      c.font = "400 23px " + TEXT; c.fillStyle = ORANGE; ls(5.1); c.fillText(card.title, W / 2 + 2.5, yTitle); ls(0);      // as .mf-title: upright, small, letter-spaced 0.22em
      // the ornament: two fading lines and a diamond
      var lg = c.createLinearGradient(W / 2 - 250, 0, W / 2 - 22, 0); lg.addColorStop(0, "rgba(255,166,38,0)"); lg.addColorStop(1, "rgba(255,166,38,0.85)");
      c.fillStyle = lg; c.fillRect(W / 2 - 250, yOrn, 228, 1.8);
      var rg2 = c.createLinearGradient(W / 2 + 22, 0, W / 2 + 250, 0); rg2.addColorStop(0, "rgba(255,166,38,0.85)"); rg2.addColorStop(1, "rgba(255,166,38,0)");
      c.fillStyle = rg2; c.fillRect(W / 2 + 22, yOrn, 228, 1.8);
      diamond(W / 2, yOrn + 1, 13);

      // the six tongues, in a zig-zag
      blocks.forEach(function (b) {
        var y = b.y + 22;
        c.direction = "ltr"; c.textAlign = "center"; c.font = "600 21px " + TEXT; c.fillStyle = ORANGE; ls(5.6);
        c.fillText(b.t.name.toUpperCase(), b.x + 3, y); ls(0);
        y += 12; c.fillStyle = PAPER; c.font = b.f; c.direction = b.t.rtl ? "rtl" : "ltr";
        b.sl.forEach(function (ln) { y += b.lh; c.fillText(ln, b.x, y - b.lh * 0.22); });
        c.direction = "ltr";
        if (b.tl.length) {
          y += 10 - 4; c.font = "italic 400 29px " + TEXT; c.fillStyle = DIM;
          b.tl.forEach(function (ln) { y += 40; c.fillText(ln, b.x, y - 10); });
        }
      });
      c.textAlign = "center"; c.direction = "ltr";
      c.strokeStyle = "rgba(255,166,38,0.28)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W / 2 - 160, yFoot - 44); c.lineTo(W / 2 + 160, yFoot - 44); c.stroke();
      c.fillStyle = "rgba(196,211,218,0.85)"; c.font = "italic 400 29px " + DISP; c.fillText("TwelveCubed · RoTao", W / 2, yFoot);
      // A phone that cannot hold a canvas this big sometimes gives back a card with parts missing, and says nothing. Four places that must hold
      // something other than the dark ground are looked at: the globe, the motto, the Hebrew line and the footer. If one is empty, a smaller size is tried.
      function lit(x0, y0, x1, y1, test) {
        var x = Math.max(0, Math.round(x0 * S)), y = Math.max(0, Math.round(y0 * S)), w = Math.max(1, Math.round((x1 - x0) * S)), h = Math.max(1, Math.round((y1 - y0) * S));
        var d = c.getImageData(x, y, w, h).data;
        for (var q = 0; q < d.length; q += 4) if (test(d[q], d[q + 1], d[q + 2])) return true;
        return false;
      }
      var off = function (r, g, bl) { return Math.abs(r - 8) > 24 || Math.abs(g - 16) > 24 || Math.abs(bl - 74) > 24; };
      var drawn = true;
      try {
        drawn = lit(W / 2 - 40, GY + GH * 0.5, W / 2 + 40, GY + GH * 0.6, off)
          && lit(W / 2 - 300, yMain - mainSize * 0.7, W / 2 + 300, yMain + 4, function (r, g, bl) { return r > 150; })
          && (!card.subtitle || lit(W / 2 - 80, yHeb - HEB * 0.8, W / 2 + 80, yHeb, function (r, g, bl) { return g > 170 && bl > 170 && r < 90; }))
          && lit(W / 2 - 120, yFoot - 24, W / 2 + 120, yFoot + 2, function (r, g, bl) { return r > 110 && g > 120; });
      } catch (e) { drawn = true; }             // the browser will not let the pixels be read: trust the drawing
      if (!drawn) { cv.width = cv.height = 0; return Promise.resolve(null); }
      return new Promise(function (res) {
        cv.toBlob(function (b) { cv.width = cv.height = 0; res(b && b.size > 150000 ? b : null); }, "image/png");
      });
    }
    /* the largest size the device can make: 15 million pixels on a computer, fewer on a phone, and smaller again if the first try fails */
    function make(card, im) {
      var phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
      var caps = phone ? [9e6, 5e6, 2.5e6] : [15e6, 9e6, 4e6], i = 0;
      function next() {
        var go; try { go = draw(card, im[0], im[1], caps[i]); } catch (e) { if (window.console) console.error(e); go = Promise.resolve(null); }
        return go.then(function (blob) { if (blob) return blob; return ++i < caps.length ? next() : null; });
      }
      return next();
    }

    function saveBlob(blob) {
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "that-we-are-for-all-things-serve-motto-card.png"; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }
    btn.addEventListener("click", function () {
      if (busy) return; busy = true; btn.disabled = true; if (label) label.textContent = "Drawing the card…";
      var card = readCard(), wait = 900;
      prepare(card).then(function (im) { return make(card, im); })
        .then(function (blob) { if (blob) saveBlob(blob); else { wait = 5000; if (label) label.textContent = "Your browser could not save it"; } })
        .catch(function (e) { wait = 6000; if (label) label.textContent = /pictures/.test(e && e.message || "") ? "Reload the page, then try again" : "Could not draw the card"; if (window.console) console.error(e); })
        .then(function () { setTimeout(function () { busy = false; btn.disabled = false; if (label) label.textContent = idle; }, wait); });
    });
  }

  /* the floral frame of the motto card on the page: an SVG laid over the card, redrawn when the card changes size (the plain border stays if this cannot run) */
  function mountOrnament() {
    var fr = $(".mf-frame");
    if (!fr || typeof ORN === "undefined") return;
    var host = document.createElement("div"), lw = 0, lh = 0;
    host.className = "mf-orn-host"; host.setAttribute("aria-hidden", "true");
    fr.insertBefore(host, fr.firstChild);
    function paint() {
      var w = fr.clientWidth, h = fr.clientHeight;
      if (!w || !h || (Math.abs(w - lw) < 1 && Math.abs(h - lh) < 1)) return;
      lw = w; lh = h;
      var k = Math.max(0.5, Math.min(1, w / 760));
      host.innerHTML = ORN.svg(w, h, k);
      fr.style.setProperty("--mf-band", Math.round(ORN.band(k)) + "px");
      fr.classList.add("mf-orn-on");
    }
    paint();
    if (window.ResizeObserver) new ResizeObserver(paint).observe(fr); else window.addEventListener("resize", paint);
  }

  window.TCDaily = { clock: clock, chapterOfDay: chapterOfDay, roman: roman };
  mountOrnament();
  mountManifesto();
  mountScroll();
  mountCistercian();
  mountCosmos();
  mountMoonCal();
})();
