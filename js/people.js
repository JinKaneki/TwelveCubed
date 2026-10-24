/* Saved people on the chart finder: a short list of birth details kept in this browser (localStorage), with a backup file.
   Nothing is uploaded. Opening a person puts their details back into the form and works the chart out again.

   window.TCPeople.mount(box, { open(person) })     draws the list into box
   window.TCPeople.add(person) -> { ok, updated }   save (or replace the person with the same name)
   window.TCPeople.count()
   person = { id, name, date "YYYY-MM-DD", time "HH:MM" | "", place { name, lat, lon } | null, tz, chosen { sun, moon, rising }, saved } */
(function () {
  "use strict";
  var KEY = "tc_people";
  var TC = window.TC;
  var SIGNS = (TC && TC.SIGNS) || [];
  var listeners = [];

  function readAll() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter(valid) : [];
    } catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function num(v) { return typeof v === "number" && isFinite(v); }
  function valid(p) {
    return p && typeof p === "object" && typeof p.name === "string" && p.name.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.date || "") && (!p.time || /^\d{1,2}:\d{2}$/.test(p.time)) &&
      (!p.place || (typeof p.place.name === "string" && num(p.place.lat) && num(p.place.lon))) && typeof p.tz === "string";
  }
  function clean(p) {
    var ch = p.chosen || {}, out = {
      id: typeof p.id === "string" && p.id ? p.id.slice(0, 40) : newId(),
      name: p.name.trim().slice(0, 60), date: p.date, time: p.time || "", tz: p.tz.slice(0, 80),
      place: p.place ? { name: String(p.place.name).slice(0, 160), lat: p.place.lat, lon: p.place.lon } : null,
      chosen: { sun: "", moon: "", rising: "" }, saved: num(p.saved) ? p.saved : Date.now()
    };
    ["sun", "moon", "rising"].forEach(function (k) { if (SIGNS.indexOf(ch[k]) >= 0) out.chosen[k] = ch[k]; });
    return out;
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function changed() { listeners.forEach(function (f) { f(); }); }

  function add(person) {
    if (!valid(person)) return { ok: false };
    var list = readAll(), p = clean(person), at = -1, i;
    for (i = 0; i < list.length; i++) if (list[i].name.toLowerCase() === p.name.toLowerCase()) at = i;
    if (at >= 0) { p.id = list[at].id; list[at] = p; } else list.push(p);
    if (!writeAll(list)) return { ok: false, blocked: true };
    changed();
    return { ok: true, updated: at >= 0 };
  }
  function remove(id) { writeAll(readAll().filter(function (p) { return p.id !== id; })); changed(); }

  function esc(t) { return TC.esc(t); }
  function when(p) {
    return p.date + (p.time ? " " + p.time : "") + (p.place ? " · " + p.place.name.split(",")[0] : "");
  }
  function signsLine(p) {
    var bits = [];
    [["sun", "Sun"], ["moon", "Moon"], ["rising", "Rising"]].forEach(function (k) {
      if (p.chosen[k[0]]) bits.push('<span class="p-sign">' + TC.glyph(p.chosen[k[0]]) + esc(k[1] + " " + p.chosen[k[0]]) + "</span>");
    });
    return bits.join("");
  }

  function mount(box, cfg) {
    var details = box.closest ? box.closest("[data-people]") || box.parentNode : box.parentNode;
    var count = details.querySelector("[data-people-count]");
    var status = "";

    function paint() {
      var list = readAll().sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (count) count.textContent = list.length ? "(" + list.length + ")" : "(none yet)";
      var h = "";
      if (list.length) {
        h += '<ul class="p-list">' + list.map(function (p) {
          return '<li><button type="button" class="p-open" data-id="' + esc(p.id) + '"><strong>' + esc(p.name) + '</strong><span class="p-when">' + esc(when(p)) +
            '</span><span class="p-signs">' + signsLine(p) + '</span></button>' +
            '<button type="button" class="p-del" data-del="' + esc(p.id) + '" aria-label="Remove ' + esc(p.name) + ' from the list"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></li>';
        }).join("") + "</ul>";
      } else {
        h += '<p class="hint">No one is saved yet. Find a chart, give it a name and press &ldquo;Save to my people&rdquo;. The list stays in this browser only.</p>';
      }
      h += '<div class="p-tools"><button type="button" class="p-btn" data-p="export"' + (list.length ? "" : " disabled") + '>Download a backup</button>' +
        '<label class="p-btn p-file">Restore from a backup<input type="file" accept=".json,application/json" data-p="import"></label></div>' +
        '<p class="hint p-status" role="status">' + esc(status) + "</p>";
      box.innerHTML = h;
    }

    box.addEventListener("click", function (ev) {
      var o = ev.target.closest(".p-open"), d = ev.target.closest("[data-del]"), x = ev.target.closest('[data-p="export"]');
      if (o) {
        var p = readAll().filter(function (q) { return q.id === o.getAttribute("data-id"); })[0];
        if (p && cfg && cfg.open) cfg.open(p);
      } else if (d) { remove(d.getAttribute("data-del")); status = "Removed."; paint(); }
      else if (x) {
        var blob = new Blob([JSON.stringify({ app: "TwelveCubed", kind: "saved people", version: 1, people: readAll() }, null, 1)], { type: "application/json" });
        var url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = "twelve-cubed-people.json"; a.style.display = "none"; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
        status = "Backup saved as twelve-cubed-people.json. Keep it somewhere safe; it holds birth details."; paint();
      }
    });
    box.addEventListener("change", function (ev) {
      if (!ev.target.matches || !ev.target.matches('[data-p="import"]')) return;
      var f = ev.target.files && ev.target.files[0]; if (!f) return;
      if (f.size > 2e6) { status = "That file is too large to be a backup."; paint(); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var added = 0, skipped = 0;
        try {
          var d = JSON.parse(String(rd.result)), arr = Array.isArray(d) ? d : d && d.people;
          if (!Array.isArray(arr)) throw new Error("no list");
          var list = readAll();
          arr.slice(0, 500).forEach(function (q) {
            if (!valid(q)) { skipped++; return; }
            var p = clean(q), dup = list.some(function (e) { return e.name.toLowerCase() === p.name.toLowerCase() && e.date === p.date && e.time === p.time; });
            if (dup) { skipped++; return; }
            if (list.some(function (e) { return e.id === p.id; })) p.id = newId();
            list.push(p); added++;
          });
          if (!writeAll(list)) { status = "This browser would not keep the list (a private window?)."; paint(); return; }
          status = "Restored " + added + (added === 1 ? " person" : " people") + (skipped ? "; skipped " + skipped + " (already there or not valid)." : ".");
        } catch (e) { status = "That file is not a TwelveCubed backup."; }
        changed();
      };
      rd.onerror = function () { status = "The file could not be read."; paint(); };
      rd.readAsText(f);
    });

    listeners.push(function () { paint(); if (readAll().length && !details.open && cfg && cfg.autoOpen) details.open = true; });
    paint();
    if (readAll().length) details.open = true;
  }

  window.TCPeople = { mount: mount, add: add, count: function () { return readAll().length; } };
})();
