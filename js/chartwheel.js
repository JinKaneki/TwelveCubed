/* The chart wheel, drawn as one self-contained SVG string in the manner of Astrotheme's natal wheel:
   white paper, a degree ring with 1 / 5 / 10 degree ticks, the signs in their element colours, house cusps and
   numbers, planets and points outside the ring on leader lines (degrees large, minutes small), the aspects
   inside. Every length below was measured from a reference picture (centre 0,0; outer circle radius 312).
   Planet glyphs are our own monoline drawings; the sign glyphs come from window.TC_GLYPHS (Noto Sans Symbols, OFL).
   No fonts are embedded: text uses Arial / Helvetica, so a saved SVG or PNG looks the same everywhere.

   Browser: window.TCWheel     Node: require("./chartwheel.js")(glyphPathsObject)

   render(chart, opts) -> SVG string
     chart  result of TCEphem.chart()
     opts   { theme: "paper" | "night", houses: "placidus" | "equal" | "whole", title: [line1, line2],
              aspects: true, points: true, label: "aria label" }                                          */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.TCWheel = factory(root.TC_GLYPHS || {});
})(typeof self !== "undefined" ? self : this, function (SIGNGLYPHS) {
  "use strict";

  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var R0 = 312, R1 = 285.5, R2 = 170.5;          // outer circle, ring of ticks, aspect circle
  var RG = 402, RS = 220, RK = 332;              // planet glyphs, sign glyphs, bend of the leader lines
  var GS = 0.72;                                 // glyph scale (100-unit box -> 72 px)
  var VB = { x: -560, y: -600, w: 1120, h: 1115 };
  var SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var FONT = "Arial, Helvetica, 'Liberation Sans', sans-serif";
  var SERIF = "'Times New Roman', Times, 'Liberation Serif', serif";

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function f(n) { return (Math.round(n * 100) / 100).toString(); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- colours (paper = the reference; night = black plate, planets keep their colours) ---------- */
  var PAL = {
    paper: {
      bg: "#ffffff", ink: "#000000", title: "#4b5c7b",
      fire: "#fc0523", earth: "#806614", air: "#1d6f73", water: "#0506d6",
      gray: "#b8bac2", grayDeg: "#6b7287", grayMin: "#8e94a4",
      sun: "#fe7d00", moon: "#fccf4b", mercury: "#7c28f7", venus: "#f971c8", mars: "#fc0523", jupiter: "#1bc3c5",
      saturn: "#fc0523", uranus: "#840100", neptune: "#0e6866", pluto: "#fc0523",
      red: "#e00000", blue: "#1010d0", sky: "#60c0e0", green: "#008500", purple: "#a23aa8"
    },
    night: {
      bg: "#000000", ink: "#f2f4f8", title: "#a9b7d3",
      fire: "#ff4d62", earth: "#d9b14a", air: "#4ccbd0", water: "#6475ff",
      gray: "#8e93a3", grayDeg: "#b5bac8", grayMin: "#8e93a3",
      sun: "#fe7d00", moon: "#fccf4b", mercury: "#8f4dff", venus: "#f971c8", mars: "#fc0523", jupiter: "#1bc3c5",
      saturn: "#fc0523", uranus: "#d9453d", neptune: "#1fb5b0", pluto: "#fc0523",
      red: "#ff3b4d", blue: "#4c63ff", sky: "#56c8ee", green: "#19c219", purple: "#c05ac6"
    }
  };
  var ELEMENT = ["fire", "earth", "air", "water"];

  /* ---------- planet and point glyphs: monoline, in a 100 x 100 box ---------- */
  function line(c, inner, sw) {
    return '<g fill="none" stroke="' + c + '" stroke-width="' + (sw || 10) + '" stroke-linejoin="round">' + inner + "</g>";
  }
  function dot(c, x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/>'; }
  var GLYPH = {
    sun: function (c) { return line(c, '<circle cx="50" cy="50" r="40"/>') + dot(c, 50, 50, 8.5); },
    moon: function (c) { return line(c, '<path d="M17 13.6A44 44 0 1 1 17 86.4A37 37 0 0 0 17 13.6Z"/>', 8.5); },
    mercury: function (c) {
      return line(c, '<path d="M28 5A22 22 0 0 0 72 5"/><circle cx="50" cy="45" r="20"/><path d="M50 65V96M35 81H65"/>');
    },
    venus: function (c) { return line(c, '<circle cx="50" cy="34" r="28"/><path d="M50 62V96M33 80H67"/>'); },
    mars: function (c) {
      return line(c, '<circle cx="40" cy="62" r="29"/><path d="M60.5 41.5L84 18"/>') +
        '<path d="M95 5L61 14L86 39Z" fill="' + c + '"/>';
    },
    jupiter: function (c) {
      return line(c, '<path d="M9 30C9 3 52 -2 52 27C52 45 30 58 9 69"/><path d="M6 70H93M66 36V97"/>');
    },
    saturn: function (c) {
      return line(c, '<path d="M19 18H51M35 5V60"/><path d="M35 40C46 28 74 31 74 56C74 72 62 82 46 95"/>');
    },
    uranus: function (c) {
      return line(c, '<path d="M30 5C14 18 14 46 30 58M70 5C86 18 86 46 70 58M22 31H78M50 31V63"/><circle cx="50" cy="79" r="14"/>');
    },
    neptune: function (c) {
      return line(c, '<path d="M17 18C17 56 83 56 83 18M50 14V96M32 80H68"/>') +
        '<path d="M17 2L5 26H29ZM50 0L38 24H62ZM83 2L71 26H95Z" fill="' + c + '"/>';
    },
    pluto: function (c) {
      return line(c, '<circle cx="50" cy="26" r="14"/><path d="M21 20C21 64 79 64 79 20M50 53V96M32 80H68"/>');
    },
    chiron: function (c) {
      return line(c, '<path d="M40 6V72M40 38L70 8M40 38L74 70"/><rect x="21" y="72" width="38" height="22" rx="11"/>');
    },
    node: function (c) {
      return line(c, '<path d="M26 58A31 31 0 1 1 74 58"/><circle cx="21" cy="72" r="8.5"/><circle cx="79" cy="72" r="8.5"/>') + dot(c, 50, 40, 7);
    },
    lilith: function (c) {
      return '<g transform="translate(78 4) scale(-0.7 0.7)"><path d="M17 13.6A44 44 0 1 1 17 86.4A37 37 0 0 0 17 13.6Z" fill="' + c + '"/></g>' +
        line(c, '<path d="M42 62V96M27 79H57"/>', 9) + dot(c, 74, 80, 7);
    },
    fortune: function (c) { return line(c, '<circle cx="50" cy="50" r="40"/><path d="M22 22L78 78M78 22L22 78"/>', 9); },
    ep: function (c) { return text(c, "EP"); },
    vertex: function (c) { return text(c, "Vx"); }
  };
  function text(c, t) {
    return '<text x="50" y="68" text-anchor="middle" font-family="' + SERIF + '" font-size="60" fill="' + c + '" transform="translate(50 0) scale(.78 1) translate(-50 0)">' + t + "</text>";
  }
  var POINT_KEYS = { chiron: 1, node: 1, lilith: 1, fortune: 1, ep: 1, vertex: 1 };
  var NAMES = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
    uranus: "Uranus", neptune: "Neptune", pluto: "Pluto", chiron: "Chiron", node: "True Node", lilith: "True Lilith",
    fortune: "Part of Fortune", ep: "East Point", vertex: "Vertex", asc: "Ascendant", mc: "Midheaven" };

  /* a glyph on its own, for the data panel and legends */
  function glyphSvg(key, size, color) {
    var fn = GLYPH[key];
    if (!fn) return "";
    return '<svg class="pg" viewBox="0 0 100 100" width="' + (size || 22) + '" height="' + (size || 22) + '" aria-hidden="true" focusable="false">' + fn(color || "currentColor") + "</svg>";
  }

  /* ---------- geometry ---------- */
  function cuspsFor(chart, system) {
    var asc = chart.angles.asc, out = [], i;
    if (system === "equal") for (i = 0; i < 12; i++) out.push(norm(asc + 30 * i));
    else if (system === "whole") { var s = Math.floor(asc / 30) * 30; for (i = 0; i < 12; i++) out.push(norm(s + 30 * i)); }
    else out = chart.houses.slice();
    return out;
  }
  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i], b = cusps[(i + 1) % 12];
      if (norm(lon - a) < norm(b - a)) return i + 1;
    }
    return 12;
  }

  /* Keep the glyphs from touching while moving them as little as possible and never changing their order.
     items = [{ang, w, pinned}] (degrees on the wheel, any order). The circle is cut where the slack is largest,
     and the minimum-movement placement is found with the pool-adjacent-violators method. */
  function need(a, b) { return (a.w + b.w) / 2 / RG * DEG; }
  function spread(items) {
    var n = items.length, i, k;
    if (n < 2) return;
    items.sort(function (x, y) { return norm(x.ang) - norm(y.ang); });
    items.forEach(function (it) { it.ang = norm(it.ang); });
    var cut = 0, best = -1e9;
    for (i = 0; i < n; i++) {                       // slack between item i and the next one round the circle
      var sl = norm(items[(i + 1) % n].ang - items[i].ang) - need(items[i], items[(i + 1) % n]);
      if (n === 2 && sl < 0) sl = 0;
      if (sl > best) { best = sl; cut = i; }
    }
    var seq = [];
    for (k = 0; k < n; k++) seq.push(items[(cut + 1 + k) % n]);
    var base = seq[0].ang, a = [], cum = [0];
    for (k = 0; k < n; k++) {
      a.push(k === 0 ? base : base + norm(seq[k].ang - base));
      if (k > 0) cum.push(cum[k - 1] + need(seq[k - 1], seq[k]));
    }
    var blocks = [];
    for (k = 0; k < n; k++) {
      var wt = seq[k].pinned ? 1e6 : 1;
      blocks.push({ sum: wt * (a[k] - cum[k]), w: wt, from: k, to: k });
      while (blocks.length > 1) {
        var cur = blocks[blocks.length - 1], prev = blocks[blocks.length - 2];
        if (prev.sum / prev.w <= cur.sum / cur.w) break;
        prev.sum += cur.sum; prev.w += cur.w; prev.to = cur.to; blocks.pop();
      }
    }
    blocks.forEach(function (bl) {
      for (var m = bl.from; m <= bl.to; m++) seq[m].ang = bl.sum / bl.w + cum[m];
    });
  }

  /* ---------- the wheel ---------- */
  function render(chart, o) {
    o = o || {};
    var pal = PAL[o.theme === "night" ? "night" : "paper"];
    var hasH = !!(chart.houses && chart.angles);
    var system = o.houses || "placidus";
    var cusps = hasH ? cuspsFor(chart, system) : null;
    var ref = hasH ? chart.angles.asc : 0;                       // the longitude at 9 o'clock
    var out = [];

    function th(L) { return norm(180 + (L - ref)); }                // screen angle, degrees, counterclockwise from east
    function P(r, ang) { return [r * Math.cos(ang * RAD), -r * Math.sin(ang * RAD)]; }
    function at(r, L) { return P(r, th(L)); }
    function pt(p) { return f(p[0]) + " " + f(p[1]); }
    function seg(a, b, stroke, w, extra) {
      return '<path d="M' + pt(a) + "L" + pt(b) + '" stroke="' + stroke + '" stroke-width="' + w + '" fill="none"' + (extra || "") + "/>";
    }

    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VB.x + " " + VB.y + " " + VB.w + " " + VB.h + '" role="img" aria-label="' +
      esc(o.label || "Natal chart wheel") + '" style="font-family:' + FONT + '">');
    if (o.label) out.push("<title>" + esc(o.label) + "</title>");
    out.push('<rect x="' + VB.x + '" y="' + VB.y + '" width="' + VB.w + '" height="' + VB.h + '" fill="' + pal.bg + '"/>');

    /* title block */
    if (o.title && o.title.length) {
      o.title.forEach(function (t, i) {
        out.push('<text x="0" y="' + (-566 + i * 31) + '" text-anchor="middle" font-size="24" font-weight="700" fill="' + pal.title + '">' + esc(t) + "</text>");
      });
    }

    /* circles */
    out.push('<circle r="' + R0 + '" fill="none" stroke="' + pal.ink + '" stroke-width="2"/>');
    out.push('<circle r="' + R1 + '" fill="' + pal.bg + '" stroke="' + pal.ink + '" stroke-width="2"/>');
    out.push('<circle r="' + R2 + '" fill="' + pal.bg + '" stroke="' + pal.ink + '" stroke-width="2"/>');
    /* aspects live inside the aspect circle, so they are drawn after its fill */
    redrawAspects();

    function redrawAspects() {
      if (o.aspects === false || !chart.aspects || !chart.aspects.length) return;
      var pos = {};
      chart.bodies.forEach(function (b) { pos[b.key] = b.lon; });
      if (hasH) { pos.asc = chart.angles.asc; pos.mc = chart.angles.mc; }
      var AC = { opposition: [pal.red, 1.8], square: [pal.red, 1.8], trine: [pal.blue, 1.8], sextile: [pal.sky, 1.8],
        quincunx: [pal.green, 1.8], semisextile: [pal.purple, 1.5, "6 5"] };
      var order = { semisextile: 0, quincunx: 1, sextile: 2, trine: 3, square: 4, opposition: 5 };
      chart.aspects.slice().sort(function (x, y) { return (order[x.type] || 0) - (order[y.type] || 0); }).forEach(function (a) {
        var st = AC[a.type];
        if (!st || pos[a.a] == null || pos[a.b] == null) return;
        out.push(seg(at(R2, pos[a.a]), at(R2, pos[a.b]), st[0], st[1], st[2] ? ' stroke-dasharray="' + st[2] + '"' : ""));
      });
    }

    /* degree ticks inside the ring */
    var L, p1, p2, len, w;
    for (L = 0; L < 360; L++) {
      if (L % 30 === 0) continue;
      len = L % 10 === 0 ? 32.5 : L % 5 === 0 ? 18.5 : 11.5;
      w = L % 10 === 0 ? 1.9 : L % 5 === 0 ? 1.6 : 1.2;
      out.push(seg(at(R1, L), at(R1 - len, L), pal.ink, w));
    }
    /* sign boundaries, sign glyphs */
    for (var s = 0; s < 12; s++) {
      out.push(seg(at(R1, s * 30), at(R2, s * 30), pal.ink, 1.8));
      var gp = at(RS, s * 30 + 15), path = SIGNGLYPHS[SIGNS[s]], col = pal[ELEMENT[s % 4]];
      if (path) {
        out.push('<path d="' + path + '" fill="' + col + '" stroke="' + col + '" stroke-width="3.2" stroke-linejoin="round" transform="translate(' +
          f(gp[0]) + " " + f(gp[1]) + ") scale(" + GS + ') translate(-50 -50)"/>');
      }
    }

    /* house cusps, numbers, angle markers */
    var items = [];
    if (hasH) {
      var asc = chart.angles.asc, mc = chart.angles.mc;
      var ang4 = [asc, norm(asc + 180), mc, norm(mc + 180)];
      function isAng(c) { return ang4.some(function (a) { return Math.abs(((c - a + 540) % 360) - 180) < 0.02; }); }
      cusps.forEach(function (c, i) {
        out.push(seg(at(R1, c), at(R1 - 33, c), pal.ink, 1.8));
        var nxt = cusps[(i + 1) % 12], mid = norm(c + norm(nxt - c) / 2), np = at((R0 + R1) / 2, mid);
        out.push('<text x="' + f(np[0]) + '" y="' + f(np[1]) + '" dy=".35em" text-anchor="middle" font-size="16" font-weight="700" fill="' + pal.ink + '">' + (i + 1) + "</text>");
        if (!isAng(c)) {                                    // a thin arrow for the cusps between the angles
          var a0 = at(R0, c), a1 = at(R1, c), u = th(c), back = P(9, u), side = P(4, u + 90);
          out.push(seg(a0, a1, pal.ink, 1.4));
          out.push('<path d="M' + pt(a1) + "L" + f(a1[0] + back[0] + side[0]) + " " + f(a1[1] + back[1] + side[1]) + "L" + f(a1[0] + back[0] - side[0]) + " " + f(a1[1] + back[1] - side[1]) + 'Z" fill="' + pal.ink + '"/>');
        }
      });
      ang4.forEach(function (a) {                           // the four angles: a black wedge from the outer circle to the ring
        var u = th(a), b1 = P(R0, u), side = P(13.5, u + 90), apex = P(R1, u);
        out.push('<path d="M' + f(b1[0] + side[0]) + " " + f(b1[1] + side[1]) + "L" + pt(apex) + "L" + f(b1[0] - side[0]) + " " + f(b1[1] - side[1]) + 'Z" fill="' + pal.ink + '"/>');
      });
    }

    /* what sits outside the ring */
    var list = [];
    chart.bodies.forEach(function (b) {
      if (b.extra && o.points === false) return;
      list.push({ key: b.key, lon: b.lon, retro: b.retro, gray: !!POINT_KEYS[b.key], w: 70 });
    });
    if (hasH && o.points !== false) {
      if (chart.points && chart.points.fortune != null) list.push({ key: "fortune", lon: chart.points.fortune, gray: true, w: 70 });
      list.push({ key: "ep", lon: chart.angles.ep, gray: true, w: 66 });
      list.push({ key: "vertex", lon: chart.angles.vertex, gray: true, w: 66 });
    }
    list.forEach(function (it) { it.t = th(it.lon); it.ang = it.t; });
    var all = list.slice();
    if (hasH) {
      all.push({ key: "mc", lon: chart.angles.mc, t: th(chart.angles.mc), ang: th(chart.angles.mc), w: 92, angle: true });
      all.push({ key: "asc", lon: chart.angles.asc, t: 180, ang: 180, w: 62, angle: true, pinned: true });
    }
    all.sort(function (a, b) { return a.ang - b.ang; });
    spread(all);

    function minutes(L) { var t = Math.round(norm(L) % 30 * 60); if (t > 1799) t = 1799; return { d: Math.floor(t / 60), m: t % 60 }; }
    function numW(n, size, bold) { return String(n).length * size * (bold ? 0.56 : 0.556); }

    function labels(it, color, degColor, minColor, bold) {
      var dm = minutes(it.lon), ang = it.ang, u = P(1, ang), g = P(RG, ang), sn = Math.sin(ang * RAD);
      var dtxt = dm.d + "°", mtxt = (dm.m < 10 ? "0" : "") + dm.m + "'", res = "", dp, mp;
      if (Math.abs(sn) >= 0.62) {                              // above or below: degrees, then minutes, further out
        dp = [g[0] + u[0] * 58, g[1] + u[1] * 58];
        mp = [g[0] + u[0] * (sn > 0 ? 84 : 90), g[1] + u[1] * (sn > 0 ? 84 : 90)];
      } else {                                                 // at the sides: along the same line
        var dw = numW(dm.d, 22, true) + 9, mw = 20 + 4, d1 = 46 + dw / 2, d2 = d1 + dw / 2 + 5 + mw / 2;
        dp = [g[0] + u[0] * d1 + (u[0] > 0 ? 0 : 0), g[1] + u[1] * d1];
        mp = [g[0] + u[0] * d2, g[1] + u[1] * d2];
      }
      res += '<text x="' + f(dp[0]) + '" y="' + f(dp[1]) + '" dy=".35em" text-anchor="middle" font-size="22" font-weight="700" fill="' + degColor + '">' + dtxt + "</text>";
      res += '<text x="' + f(mp[0]) + '" y="' + f(mp[1]) + '" dy=".35em" text-anchor="middle" font-size="17" fill="' + minColor + '">' + mtxt + "</text>";
      return res;
    }

    all.forEach(function (it) {
      var ang = it.ang, g = P(RG, ang), tr = th(it.lon), color;
      if (it.key === "mc") {
        var cp = g, ln0 = P(RG - 42, ang), ln1 = at(R0, it.lon);
        out.push(seg(ln0, ln1, pal.ink, 1.8));
        out.push('<circle cx="' + f(cp[0]) + '" cy="' + f(cp[1]) + '" r="41" fill="' + pal.bg + '" stroke="' + pal.ink + '" stroke-width="2"/>');
        out.push('<text x="' + f(cp[0]) + '" y="' + f(cp[1] + 22) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="66" fill="' + pal.ink +
          '" transform="translate(' + f(cp[0]) + " " + f(cp[1]) + ") scale(.62 1) translate(" + f(-cp[0]) + " " + f(-cp[1]) + ')">MC</text>');
        out.push(labels(it, pal.ink, pal.ink, pal.ink, true));
        return;
      }
      if (it.key === "asc") {
        var a0 = at(R0, it.lon), a1 = P(362, 180), hx = a1[0], hy = a1[1];
        out.push(seg(a0, a1, pal.ink, 1.8));
        out.push('<path d="M' + f(hx + 14) + " " + f(hy - 13) + "L" + f(hx) + " " + f(hy) + "L" + f(hx + 14) + " " + f(hy + 13) + '" fill="none" stroke="' + pal.ink + '" stroke-width="1.8"/>');
        out.push('<text x="' + f(g[0]) + '" y="' + f(g[1] + 22) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="66" fill="' + pal.ink +
          '" transform="translate(' + f(g[0]) + " " + f(g[1]) + ") scale(.62 1) translate(" + f(-g[0]) + " " + f(-g[1]) + ')">AC</text>');
        out.push(labels(it, pal.ink, pal.ink, pal.ink, true));
        return;
      }
      color = it.gray ? pal.gray : pal[it.key];
      /* leader: from the glyph, bending at the radius RK, down to the ring at the true longitude */
      var s0 = P(RG - 38, ang), k = P(RK, tr), e = P(R1, tr);
      out.push('<path d="M' + pt(s0) + "L" + pt(k) + "L" + pt(e) + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round"/>');
      out.push('<g transform="translate(' + f(g[0]) + " " + f(g[1]) + ") scale(" + GS + ') translate(-50 -50)">' + GLYPH[it.key](color) + "</g>");
      if (it.retro) {
        out.push('<text x="' + f(g[0] + 30) + '" y="' + f(g[1] + 38) + '" text-anchor="middle" dy=".35em" font-size="19" font-weight="700" fill="' + color + '">R</text>');
      }
      out.push(labels(it, color, it.gray ? pal.grayDeg : color, it.gray ? pal.grayMin : color, true));
    });

    out.push("</svg>");
    return out.join("");
  }

  /* the two header lines of a saved chart, in the way Astrotheme prints them */
  function headerLines(meta) {
    return meta && meta.title ? meta.title : [];
  }

  return {
    render: render, spread: spread, glyphSvg: glyphSvg, headerLines: headerLines, houseOf: houseOf, cuspsFor: cuspsFor, norm: norm,
    NAMES: NAMES, PAL: PAL, VIEWBOX: VB, GLYPH: GLYPH, POINT_KEYS: POINT_KEYS
  };
});
