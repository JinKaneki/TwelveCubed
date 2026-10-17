/* The catalogue: all 1,728 combinations as an index, filtered by sign, by title, or by phrases
   such as "Leo Sun Scorpio Moon". State lives in the URL hash so a filtered view can be shared:
   catalogue.html#sun=Leo&moon=Scorpio&rising=Pisces&q=garden&written=1 */
(function () {
  "use strict";
  var TC = window.TC;
  var form = document.getElementById("filters");
  var list = document.getElementById("list");
  var countEl = document.getElementById("count");
  if (!form || !list || !TC.SIGNS.length) return;

  var FIELDS = TC.LIGHTS; // sun, moon, rising
  var items = [];
  TC.SIGNS.forEach(function (s) {
    TC.SIGNS.forEach(function (m) {
      TC.SIGNS.forEach(function (r) {
        var t = TC.titleOf(s, m, r), e = TC.essenceOf(s, m, r);
        items.push({ s: s, m: m, r: r, sign: { sun: s, moon: m, rising: r }, title: t, essence: e,
          hay: (s + " " + m + " " + r + " " + t + " " + e).toLowerCase() });
      });
    });
  });
  var written = items.filter(function (x) { return x.title; }).length;

  /* ---- the form ---- */
  function selectHTML(k) {
    return '<label>' + TC.LIGHT_NAMES[k] + '<select id="f-' + k + '"><option value="">Any</option>' +
      TC.SIGNS.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("") + "</select></label>";
  }
  form.innerHTML =
    '<label class="grow">Search<input type="search" id="f-q" autocomplete="off" placeholder="A title, a word, or Leo Sun Scorpio Moon"></label>' +
    FIELDS.map(selectHTML).join("") +
    '<label class="check"><input type="checkbox" id="f-written"> Written only</label>' +
    '<button type="button" id="f-clear" hidden>Clear</button>';
  var q = document.getElementById("f-q"), cb = document.getElementById("f-written"), clear = document.getElementById("f-clear");
  var sels = {};
  FIELDS.forEach(function (k) { sels[k] = document.getElementById("f-" + k); });

  /* ---- reading a typed query ---- */
  var ALIAS = { sun: "sun", moon: "moon", rising: "rising", ascendant: "rising", asc: "rising" };
  var STOP = { sun: 1, moon: 1, rising: 1, ascendant: 1, asc: 1, "in": 1, the: 1, a: 1, an: 1, and: 1, "with": 1, sign: 1 };
  var SIGN_RE = TC.SIGNS.map(function (s) { return s.toLowerCase(); }).join("|");
  var FIELD_RE = "sun|moon|rising|ascendant|asc";
  var PAIR = new RegExp("\\b(?:(" + SIGN_RE + ")\\s+(" + FIELD_RE + ")|(" + FIELD_RE + ")\\s+(?:in\\s+)?(" + SIGN_RE + "))\\b", "g");
  var CASE = {};
  TC.SIGNS.forEach(function (s) { CASE[s.toLowerCase()] = s; });

  function parse(raw) {
    var fields = {}, impossible = false;
    var rest = raw.toLowerCase().replace(PAIR, function (_, s1, f1, f2, s2) {
      var field = ALIAS[f1 || f2], sign = CASE[s1 || s2];
      if (fields[field] && fields[field] !== sign) impossible = true;
      fields[field] = sign;
      return " ";
    });
    var words = rest.split(/[^a-z0-9'’-]+/).filter(function (w) { return w && !STOP[w]; });
    return { fields: fields, words: words, impossible: impossible };
  }

  function match() {
    var p = parse(q.value);
    if (p.impossible) return [];
    var want = {};
    for (var i = 0; i < FIELDS.length; i++) {
      var k = FIELDS[i], dd = sels[k].value;
      if (dd && p.fields[k] && dd !== p.fields[k]) return [];
      want[k] = dd || p.fields[k] || "";
    }
    return items.filter(function (it) {
      if (cb.checked && !it.title) return false;
      for (var j = 0; j < FIELDS.length; j++) if (want[FIELDS[j]] && it.sign[FIELDS[j]] !== want[FIELDS[j]]) return false;
      return p.words.every(function (w) { return it.hay.indexOf(w) >= 0; });
    });
  }

  /* ---- drawing ---- */
  function rowHTML(it) {
    var label = it.s + " Sun · " + it.m + " Moon · " + it.r + " Rising";
    var trio = '<span class="trio" aria-hidden="true">' + TC.glyph(it.s) + TC.glyph(it.m) + TC.glyph(it.r) + "</span>";
    var body = it.title
      ? '<span><span class="t">' + TC.esc(it.title) + '</span><span class="who">' + label + '</span><span class="e">' + TC.esc(it.essence) + "</span></span>"
      : '<span><span class="t">' + label + '</span><span class="e">Portrait being written. Each pair of lights is already read on its page.</span></span>';
    return '<li><a class="row' + (it.title ? "" : " pending") + '" href="' + TC.readHref(it.s, it.m, it.r) + '">' + trio + body + "</a></li>";
  }

  function active() { return q.value.trim() !== "" || cb.checked || FIELDS.some(function (k) { return sels[k].value; }); }

  function render() {
    var out = match();
    list.innerHTML = out.map(rowHTML).join("");
    clear.hidden = !active();
    var pend = items.length - written;
    countEl.textContent = (out.length === 0 ? "Nothing matches. Try fewer words or clear the filters. " : "Showing " + TC.fmt(out.length) + " of " + TC.fmt(items.length) + " combinations. ") +
      TC.fmt(written) + " portraits written" + (pend ? "; the rest show their pair readings until the portrait arrives." : ".");
    save();
  }

  /* ---- shareable state ---- */
  function load() {
    var p = new URLSearchParams(location.hash.slice(1));
    FIELDS.forEach(function (k) { var v = p.get(k); sels[k].value = TC.SIGNS.indexOf(v) >= 0 ? v : ""; });
    q.value = p.get("q") || "";
    cb.checked = p.get("written") === "1";
  }
  function save() {
    var p = new URLSearchParams();
    FIELDS.forEach(function (k) { if (sels[k].value) p.set(k, sels[k].value); });
    if (q.value.trim()) p.set("q", q.value.trim());
    if (cb.checked) p.set("written", "1");
    var h = p.toString();
    try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (e) { /* file:// in some browsers */ }
  }

  var timer;
  q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 120); });
  FIELDS.forEach(function (k) { sels[k].addEventListener("change", render); });
  cb.addEventListener("change", render);
  clear.addEventListener("click", function () {
    q.value = ""; cb.checked = false; FIELDS.forEach(function (k) { sels[k].value = ""; });
    render(); q.focus();
  });
  window.addEventListener("hashchange", function () { load(); render(); });

  load();
  render();
})();
