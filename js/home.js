/* Home page: the Dial with its result panel, and the sky section (loaded when it nears the screen). */
(function () {
  "use strict";
  var dial = document.getElementById("dial");
  if (dial && window.TCDial) {
    window.TCDial.mount({
      dial: dial,
      byName: document.getElementById("by-name"),
      result: document.getElementById("result")
    });
  }

  var sec = document.getElementById("sky"), TC = window.TC;
  if (!sec || !TC || !TC.loadSky) return;
  var app = sec.querySelector("[data-sky-app]"), started = false;
  function start() {
    if (started) return;
    started = true;
    TC.loadSky().then(function (S) {
      var n = S.now();
      app.innerHTML = "";
      S.mount(app, { mode: "now", input: n.input });
    }).catch(function () {
      app.innerHTML = '<p class="sky-wait">The chart wheel could not be loaded. Reload the page to try again.</p>';
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "700px 0px" });
    io.observe(sec);
  } else start();
})();
