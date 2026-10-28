/* The Cabinet of Wonders (petals/cabinet-of-wonders/index.html): filter the pictures by field, and open a picture large in a
   lightbox with the arrow keys. Without this script every picture is still a plain link to its own page. Nothing is sent anywhere. */
(function () {
  "use strict";
  var wall = document.querySelector("[data-gem-wall]");
  if (!wall) return;
  var tiles = Array.prototype.slice.call(wall.querySelectorAll(".gem"));
  var bar = document.querySelector("[data-gem-filter]");

  /* ---- the filter by field ---- */
  if (bar) {
    bar.hidden = false;
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest(".gem-chip");
      if (!b) return;
      var f = b.getAttribute("data-field") || "";
      Array.prototype.forEach.call(bar.querySelectorAll(".gem-chip"), function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      tiles.forEach(function (t) { t.hidden = !!f && t.getAttribute("data-field") !== f; });
    });
  }

  /* ---- the lightbox ---- */
  if (typeof HTMLDialogElement !== "function") return;
  var box = document.createElement("dialog");
  box.className = "gem-box";
  box.setAttribute("aria-label", "A picture from the Cabinet of Wonders");
  box.innerHTML =
    '<div class="gem-box-in">' +
      '<button type="button" class="gem-box-x" data-x aria-label="Close">&times;</button>' +
      '<div class="gem-box-pic" data-pic></div>' +
      '<div class="gem-box-txt"><h2 data-t></h2><p data-s></p><a class="gem-box-open" data-open href="#">Open its page</a></div>' +
      '<button type="button" class="gem-box-nav gem-box-prev" data-prev aria-label="Previous picture">&lsaquo;</button>' +
      '<button type="button" class="gem-box-nav gem-box-next" data-next aria-label="Next picture">&rsaquo;</button>' +
    "</div>";
  document.body.appendChild(box);
  var el = { pic: box.querySelector("[data-pic]"), t: box.querySelector("[data-t]"), s: box.querySelector("[data-s]"), open: box.querySelector("[data-open]") };
  var at = 0;

  function visible() { return tiles.filter(function (t) { return !t.hidden; }); }
  function show(i) {
    var list = visible();
    if (!list.length) return;
    at = (i + list.length) % list.length;
    var a = list[at].querySelector("[data-gem]");
    el.pic.innerHTML = list[at].querySelector(".gem-fig").innerHTML.replace(/ loading="lazy"/g, "");
    el.t.textContent = a.getAttribute("data-title") || "";
    el.s.textContent = a.getAttribute("data-summary") || "";
    el.open.href = a.getAttribute("href");
    box.querySelector("[data-prev]").hidden = box.querySelector("[data-next]").hidden = list.length < 2;
  }
  wall.addEventListener("click", function (ev) {
    var a = ev.target.closest("[data-gem]");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
    ev.preventDefault();
    show(visible().indexOf(a.closest(".gem")));
    if (!box.open) box.showModal();
  });
  box.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-x]") || ev.target === box) box.close();
    else if (ev.target.closest("[data-prev]")) show(at - 1);
    else if (ev.target.closest("[data-next]")) show(at + 1);
  });
  box.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft") { ev.preventDefault(); show(at - 1); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); show(at + 1); }
  });
})();
