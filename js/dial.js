/* The Dial: three concentric rings of the twelve signs (Rising outside, Moon in the middle,
   Sun inside). Choose any signs and a triangle joins them; the centre counts the portraits that
   fit. Keyboard: Tab to a ring, arrows move, Space or Enter chooses or clears.
   window.TCDial.mount({dial, byName, result, initial, onChange}) -> {get, set} */
(function () {
  "use strict";
  var TC = window.TC;
  var CX = 300, CY = 300;
  var RINGS = [
    { key: "rising", r1: 290, r0: 229, gs: 34 },
    { key: "moon", r1: 223, r0: 162, gs: 32 },
    { key: "sun", r1: 156, r0: 95, gs: 30 }
  ];

  function pt(a, r) { var t = a * Math.PI / 180; return [CX + r * Math.cos(t), CY - r * Math.sin(t)]; }
  function f(p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }
  function sector(a0, a1, r1, r0) {
    return "M" + f(pt(a0, r1)) + "A" + r1 + " " + r1 + " 0 0 0 " + f(pt(a1, r1)) +
      "L" + f(pt(a1, r0)) + "A" + r0 + " " + r0 + " 0 0 1 " + f(pt(a0, r0)) + "Z";
  }
  /* Aries starts at the left and the signs run counterclockwise, as on a natal chart. */
  function angle(i) { return 180 + i * 30 + 15; }

  function svgHTML() {
    var out = ['<svg viewBox="0 0 600 600" role="group" aria-label="The three rings of signs. Outer ring Rising, middle ring Moon, inner ring Sun.">'];
    RINGS.forEach(function (ring) {
      out.push('<circle class="guide" cx="' + CX + '" cy="' + CY + '" r="' + ((ring.r1 + ring.r0) / 2) + '"/>');
    });
    RINGS.forEach(function (ring) {
      var label = TC.LIGHT_NAMES[ring.key];
      out.push('<g class="ring ring-' + ring.key + '" role="radiogroup" aria-label="' + label + ' sign">');
      TC.SIGNS.forEach(function (sign, i) {
        var a0 = 180 + i * 30 + 0.7, a1 = a0 + 28.6;
        var c = pt(angle(i), (ring.r1 + ring.r0) / 2);
        out.push('<g class="seg ' + TC.element(sign) + '" role="radio" aria-checked="false" tabindex="' + (i === 0 ? "0" : "-1") +
          '" data-ring="' + ring.key + '" data-sign="' + sign + '" aria-label="' + label + ' in ' + sign + '">' +
          '<path d="' + sector(a0, a1, ring.r1, ring.r0) + '"/>' +
          '<g class="gl ' + TC.element(sign) + '" aria-hidden="true" transform="translate(' + (c[0] - ring.gs / 2).toFixed(1) + " " + (c[1] - ring.gs / 2).toFixed(1) +
          ") scale(" + (ring.gs / 100) + ')"><use href="#g-' + TC.slug(sign) + '" width="100" height="100"/></g>' +
          "</g>");
      });
      out.push("</g>");
    });
    out.push('<g class="tri-layer"></g><g class="today-layer"></g>');
    out.push('<text class="hub-n" x="' + CX + '" y="' + (CY + 6) + '"></text><text class="hub-l" x="' + CX + '" y="' + (CY + 36) + '"></text>');
    out.push("</svg>");
    out.push('<ul class="legend"><li>' + TC.icon("rising") + ' Outer ring: Rising</li><li>' + TC.icon("moon") +
      ' Middle: Moon</li><li>' + TC.icon("sun") + " Inner: Sun</li></ul>");
    out.push('<div class="dial-tools"><button type="button" class="dial-btn" data-act="spin" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20.5 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="lbl">Turn the wheel</span></button>' +
      '<button type="button" class="dial-btn" data-act="today">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v5M12 17v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<span class="lbl">Today’s alignment</span></button>' +
      '<button type="button" class="dial-btn" data-act="align" hidden>Realign</button></div>' +
      '<p class="dial-today" role="status" aria-live="polite" hidden></p>');
    return out.join("");
  }

  function byNameHTML() {
    return TC.LIGHTS.map(function (k) {
      var opts = '<option value="">Any</option>' + TC.SIGNS.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("");
      return '<label>' + TC.LIGHT_NAMES[k] + '<select data-light="' + k + '">' + opts + "</select></label>";
    }).join("");
  }

  var counter = 0;

  function mount(cfg) {
    var dialEl = cfg.dial, byNameEl = cfg.byName, resultEl = cfg.result;
    var sel = { sun: "", moon: "", rising: "" };
    counter++;

    dialEl.innerHTML = svgHTML();
    if (byNameEl) byNameEl.innerHTML = byNameHTML();
    var svg = dialEl.querySelector("svg");
    var layer = svg.querySelector(".tri-layer");
    var hubN = svg.querySelector(".hub-n"), hubL = svg.querySelector(".hub-l");
    var selects = byNameEl ? byNameEl.querySelectorAll("select") : [];

    /* ---- turning the wheel: the Sun ring turns one way, the Moon ring the other, the Rising ring the
       same way as the Sun. Degrees per second, very slow. The triangle follows the signs it joins. ---- */
    var SPEED = { sun: 2.4, moon: -1.8, rising: 1.2 };
    var rot = { sun: 0, moon: 0, rising: 0 };
    var spinBtn = dialEl.querySelector('[data-act="spin"]'), alignBtn = dialEl.querySelector('[data-act="align"]'),
        todayBtn = dialEl.querySelector('[data-act="today"]'), todayNote = dialEl.querySelector(".dial-today"),
        todayLayer = svg.querySelector(".today-layer");
    var spinning = false, last = 0, raf = 0, released = false, glide = 0;
    var inToday = false, todayBusy = false, savedSel = null;
    var NEEDLE = 90; /* "today's alignment" brings the three exact degrees to twelve o'clock */
    var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    function norm360(x) { return ((x % 360) + 360) % 360; }
    function norm180(x) { return norm360(x + 180) - 180; }
    function two(n) { return (n < 10 ? "0" : "") + n; }

    /* While today's alignment is showing, the only wheel button is Realign. Otherwise: Turn the wheel and Today's
       alignment, with Realign appearing once something has moved. */
    function syncButtons() {
      var moved = RINGS.some(function (r) { return Math.abs(rot[r.key]) > 0.05; });
      spinBtn.hidden = inToday;
      todayBtn.hidden = inToday;
      alignBtn.hidden = !(inToday || spinning || moved);
    }
    function applyRot() {
      RINGS.forEach(function (r) {
        var el = svg.querySelector(".ring-" + r.key);
        if (!released) el.style.animation = "none";
        el.style.transform = "rotate(" + rot[r.key].toFixed(3) + "deg)";
      });
      released = true;
      syncButtons();
      drawTriangle();
    }
    function tick(now) {
      if (!spinning) return;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      RINGS.forEach(function (r) { rot[r.key] = (rot[r.key] + SPEED[r.key] * dt) % 360; });
      applyRot();
      raf = requestAnimationFrame(tick);
    }
    function setSpin(on) {
      spinning = on;
      spinBtn.setAttribute("aria-pressed", on ? "true" : "false");
      spinBtn.querySelector(".lbl").textContent = on ? "Pause the wheel" : "Turn the wheel";
      cancelAnimationFrame(raf);
      if (on) { glide++; last = performance.now(); raf = requestAnimationFrame(tick); }
      else applyRot();
    }
    /* Turn each ring the short way round to the rotation in `target` (degrees, clockwise as the CSS sees it). */
    function glideTo(target, dur, done) {
      var id = ++glide, from = {}, to = {}, t0 = performance.now();
      RINGS.forEach(function (r) { from[r.key] = rot[r.key]; to[r.key] = from[r.key] + norm180(target[r.key] - from[r.key]); });
      if (REDUCED) dur = 0;
      (function step(now) {
        if (id !== glide) return;
        var p = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3);
        RINGS.forEach(function (r) { rot[r.key] = p >= 1 ? norm180(target[r.key]) : from[r.key] + (to[r.key] - from[r.key]) * e; });
        applyRot();
        if (p < 1) requestAnimationFrame(step);
        else if (done) done();
      })(t0);
    }

    /* ---- Today's alignment: the real Sun, Moon and Rising for this minute and the place the device's clock is
       set to (js/sky.js works them out). Each ring turns until its exact degree stands under the same pointer. ---- */
    function leaveToday(restore) {
      if (!inToday) return;
      inToday = false;
      svg.classList.remove("is-today");
      todayLayer.innerHTML = "";
      todayNote.hidden = true;
      todayNote.innerHTML = "";
      if (restore && savedSel) {
        TC.LIGHTS.forEach(function (k) { sel[k] = savedSel[k]; });
        paint();
      }
      savedSel = null;
      syncButtons();
    }
    function drawNeedle() {
      var a = pt(NEEDLE, 94), b = pt(NEEDLE, 292), tip = pt(NEEDLE, 293), l = pt(NEEDLE, 306);
      var nx = Math.cos(NEEDLE * Math.PI / 180), ny = -Math.sin(NEEDLE * Math.PI / 180); /* unit vector outwards */
      var sx = -ny * 7, sy = nx * 7;
      var h = '<line class="nd-halo" x1="' + f(a).replace(" ", '" y1="') + '" x2="' + f(b).replace(" ", '" y2="') + '"/>' +
        '<line class="nd-core" x1="' + f(a).replace(" ", '" y1="') + '" x2="' + f(b).replace(" ", '" y2="') + '"/>' +
        '<polygon class="nd-tip" points="' + f(tip) + " " + (l[0] + sx).toFixed(1) + " " + (l[1] + sy).toFixed(1) + " " + (l[0] - sx).toFixed(1) + " " + (l[1] - sy).toFixed(1) + '"/>';
      RINGS.forEach(function (r) {
        var p = pt(NEEDLE, r.r1 - 6);
        h += '<circle class="nd-pip" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5"/>';
      });
      todayLayer.innerHTML = h;
    }
    function todayText(L, n) {
      var E = window.TCEphem, rows = [["Sun", "sun"], ["Moon", "moon"], ["Rising", "rising"]].map(function (x) {
        var s = E.split(L[x[1]]);
        return '<span class="dt-row"><i>' + x[0] + "</i> " + s.deg + "°" + two(s.min) + "′ " + s.sign + "</span>";
      }).join("");
      var date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      var where = n.place && n.place.name ? TC.esc(n.place.name) : "";
      var how = n.place && n.place.fromZone ? "the place your device’s clock is set to" : "a default place, because your device did not say where you are";
      return '<span class="dt-head">Today, ' + TC.esc(date) + "</span>" + rows +
        '<span class="dt-foot">Sun and Moon are the same everywhere. The Rising is for ' + where + ", " + how + ".</span>";
    }
    function todayAlign() {
      if (todayBusy || inToday || !TC.loadSky) return;
      todayBusy = true;
      todayBtn.disabled = true;
      var lbl = todayBtn.querySelector(".lbl");
      lbl.textContent = "Reading the sky…";
      TC.loadSky().then(function (S) {
        var n = S.now(), c = n.chart, L = {};
        c.bodies.forEach(function (b) { if (b.key === "sun") L.sun = b.lon; if (b.key === "moon") L.moon = b.lon; });
        if (c.angles) L.rising = c.angles.asc;
        if (L.sun == null || L.moon == null || L.rising == null) throw new Error("incomplete");
        setSpin(false);
        savedSel = Object.assign({}, sel);
        inToday = true;
        svg.classList.add("is-today");
        TC.LIGHTS.forEach(function (k) { sel[k] = TC.SIGNS[Math.floor(norm360(L[k]) / 30)]; });
        paint();
        syncButtons();
        var target = {};
        RINGS.forEach(function (r) { target[r.key] = 180 + L[r.key] - NEEDLE; });
        glideTo(target, 1700, function () {
          if (!inToday) return;
          drawNeedle();
          todayNote.innerHTML = todayText(L, n);
          todayNote.hidden = false;
        });
      }).catch(function () {
        todayNote.innerHTML = '<span class="dt-foot">Today’s sky could not be worked out here. Reload the page and try again.</span>';
        todayNote.hidden = false;
      }).then(function () {
        todayBusy = false;
        todayBtn.disabled = false;
        lbl.textContent = "Today’s alignment";
      });
    }
    function realign() {
      setSpin(false);
      leaveToday(true);
      glideTo({ sun: 0, moon: 0, rising: 0 }, 900);
    }
    spinBtn.addEventListener("click", function () { leaveToday(false); setSpin(!spinning); });
    alignBtn.addEventListener("click", realign);
    todayBtn.addEventListener("click", todayAlign);

    function ringOf(key) { return RINGS.filter(function (r) { return r.key === key; })[0]; }
    function point(key) {
      var ring = ringOf(key);
      return pt(angle(TC.idx(sel[key])) - rot[key], (ring.r1 + ring.r0) / 2);
    }

    function drawTriangle() {
      var ks = TC.LIGHTS.filter(function (k) { return sel[k]; });
      var h = "";
      if (ks.length === 3) {
        var P = ks.map(point);
        h += '<polygon class="tri" style="stroke:none" points="' + P.map(f).join(" ") + '"/>';
      }
      for (var i = 0; i < ks.length; i++) {
        for (var j = i + 1; j < ks.length; j++) {
          var d = TC.distance(sel[ks[i]], sel[ks[j]]);
          if (d === 0) continue;
          var dash = (d === 2 || d === 4) ? "" : (d === 3 || d === 6) ? ' stroke-dasharray="9 6"' : ' stroke-dasharray="1 7"';
          var a = point(ks[i]), b = point(ks[j]);
          h += '<line class="tri-line" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"' + dash + "/>";
        }
      }
      ks.forEach(function (k) { var p = point(k); h += '<circle class="tri-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="9"/>'; });
      layer.innerHTML = h;
    }

    function drawHub() {
      var n = Math.pow(12, 3 - TC.LIGHTS.filter(function (k) { return sel[k]; }).length);
      hubN.textContent = TC.fmt(n);
      hubN.setAttribute("style", n >= 1000 ? "font-size:50px" : "");
      hubL.textContent = n === 1 ? "portrait" : "portraits";
    }

    function paint() {
      svg.querySelectorAll(".seg").forEach(function (g) {
        var on = sel[g.getAttribute("data-ring")] === g.getAttribute("data-sign");
        g.setAttribute("aria-checked", on ? "true" : "false");
      });
      /* roving tabindex: the chosen sign, else the first, carries the tab stop */
      RINGS.forEach(function (ring) {
        var segs = svg.querySelectorAll('.seg[data-ring="' + ring.key + '"]');
        var stop = sel[ring.key] ? TC.idx(sel[ring.key]) : 0;
        if (document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-ring") === ring.key) {
          stop = TC.idx(document.activeElement.getAttribute("data-sign"));
        }
        segs.forEach(function (g, i) { g.setAttribute("tabindex", i === stop ? "0" : "-1"); });
      });
      selects.forEach(function (s) { s.value = sel[s.getAttribute("data-light")] || ""; });
      drawTriangle();
      drawHub();
      TC.renderResult(resultEl, sel);
    }

    function change(key, sign, silent) {
      leaveToday(false);
      sel[key] = sel[key] === sign ? "" : sign;
      paint();
      if (!silent && cfg.onChange) cfg.onChange(Object.assign({}, sel));
    }

    svg.addEventListener("click", function (ev) {
      var g = ev.target.closest(".seg");
      if (g) change(g.getAttribute("data-ring"), g.getAttribute("data-sign"));
    });
    svg.addEventListener("keydown", function (ev) {
      var g = ev.target.closest(".seg");
      if (!g) return;
      var ring = g.getAttribute("data-ring"), i = TC.idx(g.getAttribute("data-sign")), next = null;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (i + 1) % 12;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = (i + 11) % 12;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = 11;
      else if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); change(ring, g.getAttribute("data-sign")); return; }
      if (next !== null) {
        ev.preventDefault();
        var target = svg.querySelector('.seg[data-ring="' + ring + '"][data-sign="' + TC.SIGNS[next] + '"]');
        svg.querySelectorAll('.seg[data-ring="' + ring + '"]').forEach(function (x) { x.setAttribute("tabindex", "-1"); });
        target.setAttribute("tabindex", "0");
        target.focus();
      }
    });
    selects.forEach(function (s) {
      s.addEventListener("change", function () {
        leaveToday(false);
        sel[s.getAttribute("data-light")] = s.value;
        paint();
        if (cfg.onChange) cfg.onChange(Object.assign({}, sel));
      });
    });

    if (cfg.initial) {
      TC.LIGHTS.forEach(function (k) { if (TC.SIGNS.indexOf(cfg.initial[k]) >= 0) sel[k] = cfg.initial[k]; });
    }
    paint();

    return {
      get: function () { return Object.assign({}, sel); },
      /* Set any of sun / moon / rising; pass "" to clear one. Does not call onChange. */
      set: function (next) {
        TC.LIGHTS.forEach(function (k) {
          if (next && k in next) sel[k] = TC.SIGNS.indexOf(next[k]) >= 0 ? next[k] : "";
        });
        paint();
      }
    };
  }

  window.TCDial = { mount: mount };
})();
