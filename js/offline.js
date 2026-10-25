/* Offline mode and installing the site like an app. Loaded on every page.

   1. Adds the manifest link (only when the site is opened from a web address; from a folder there is nothing to install).
   2. Registers the service worker (sw.js, made by tools/pwa.py), which keeps the app on the device and opens pages without a connection.
   3. When a new version of the site has been fetched in the background, asks once whether to switch to it.
   4. On the About page ([data-offline]): the install button, the state of offline mode, and "save the library": the portraits, the
      pair atlases, the Torah and Zohar and the Moon wheel pictures, saved on request, in the browser's own storage, and removable.

   Nothing is sent anywhere. The saved files are the site's own files, fetched from the same address the page came from. */
(function () {
  "use strict";
  var ROOT = document.body.getAttribute("data-root") || "";
  var HTTP = location.protocol === "http:" || location.protocol === "https:";
  var SECURE = HTTP && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]");
  var CAN_SW = SECURE && "serviceWorker" in navigator && "caches" in window;
  var BASE = new URL(ROOT || "./", location.href).href;        // the site's root, which is also the worker's scope
  var LIB = "tc-library", META = BASE + "__tc-meta.json";
  var deferred = null, panel = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mb(n) { return n >= 1e8 ? Math.round(n / 1e6) + " MB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB"; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* ---- 1. the manifest ---- */
  if (HTTP) {
    var link = document.createElement("link");
    link.rel = "manifest"; link.href = ROOT + "manifest.webmanifest";
    document.head.appendChild(link);
  }

  /* ---- the install prompt, where the browser offers one ---- */
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; if (panel) panel.install(); });
  window.addEventListener("appinstalled", function () { deferred = null; if (panel) panel.install(); });

  /* ---- 2. the service worker, and 3. the update notice ---- */
  var reg = null, readyWaiters = [];
  function whenReg(fn) { if (reg) fn(reg); else readyWaiters.push(fn); }
  function toast(worker) {
    if ($(".sw-toast")) return;
    var d = document.createElement("div");
    d.className = "sw-toast"; d.setAttribute("role", "status");
    d.innerHTML = "<span>A new version of TwelveCubed is ready.</span><button type=\"button\" data-go>Update now</button><button type=\"button\" data-later>Later</button>";
    document.body.appendChild(d);
    $("[data-later]", d).addEventListener("click", function () { d.remove(); });
    $("[data-go]", d).addEventListener("click", function () {
      var done = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () { if (!done) { done = true; location.reload(); } });
      worker.postMessage({ type: "SKIP_WAITING" });
      d.firstChild.textContent = "Updating…";
    });
  }
  if (CAN_SW) {
    var start = function () {
      navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT || "./", updateViaCache: "none" }).then(function (r) {
        reg = r; readyWaiters.splice(0).forEach(function (fn) { fn(r); });
        if (r.waiting && navigator.serviceWorker.controller) toast(r.waiting);
        r.addEventListener("updatefound", function () {
          var w = r.installing;
          if (!w) return;
          w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) toast(w); });
        });
        var last = Date.now();
        document.addEventListener("visibilitychange", function () {              // a long-open tab looks for a new version when it is looked at again
          if (document.visibilityState === "visible" && Date.now() - last > 30 * 60 * 1000) { last = Date.now(); r.update().catch(function () { /* offline */ }); }
        });
      }).catch(function (e) { if (window.console) console.warn("Offline mode could not start:", e && e.message); });
    };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  }

  /* ---- 4. the panel on the About page ---- */
  function mountPanel(host) {
    host.innerHTML =
      '<p class="off-state" data-off-state></p>' +
      '<div class="off-install" data-off-install></div>' +
      '<div class="off-lib" data-off-lib hidden>' +
        "<h3>Keep the library on this device</h3>" +
        '<p class="off-lede">The app itself is saved automatically and is small. The big parts are saved only when you ask. Choose what to keep, then save. Saving can be paused by closing the page, and picks up where it stopped next time.</p>' +
        '<ul class="off-groups" data-off-groups></ul>' +
        '<div class="off-actions"><button type="button" class="off-btn off-primary" data-act="save">Save for offline</button><button type="button" class="off-btn" data-act="cancel" hidden>Stop</button><button type="button" class="off-btn" data-act="remove">Remove what is saved</button></div>' +
        '<progress class="off-bar" data-off-bar max="1" value="0" hidden></progress>' +
        '<p class="off-msg" role="status" data-off-msg></p>' +
        '<p class="off-store" data-off-store></p>' +
      "</div>";
    var el = { state: $("[data-off-state]", host), install: $("[data-off-install]", host), lib: $("[data-off-lib]", host), groups: $("[data-off-groups]", host),
      save: $('[data-act="save"]', host), cancel: $('[data-act="cancel"]', host), remove: $('[data-act="remove"]', host), bar: $("[data-off-bar]", host),
      msg: $("[data-off-msg]", host), store: $("[data-off-store]", host) };
    var pre = null, meta = {}, running = false, stop = false;

    function installHtml() {
      var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
      var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (!SECURE) return "";
      if (standalone) return "<p>You are using the installed app.</p>";
      if (deferred) return '<p><button type="button" class="off-btn off-primary" data-act="install">Install TwelveCubed</button> as an app on this device: its own icon and window, and it opens offline.</p>';
      if (ios) return "<p>To install on an iPhone or iPad: tap the Share button, then <b>Add to Home Screen</b>.</p>";
      return "<p>To install: in Chrome or Edge open the browser menu and choose <b>Install app</b> (on a phone, <b>Add to Home screen</b>). Firefox on Android has <b>Install</b> in its menu too.</p>";
    }
    function paintInstall() {
      el.install.innerHTML = installHtml();
      var b = $('[data-act="install"]', el.install);
      if (b) b.addEventListener("click", function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; paintInstall(); }); });
    }
    panel = { install: paintInstall };

    if (!CAN_SW) {
      el.state.textContent = location.protocol === "file:"
        ? "You are opening the site from a folder on your computer. Then everything already works without a connection, because the files are right there. Offline mode and installing switch on by themselves when the site is opened from its web address."
        : "This browser, or this address, does not allow offline mode. It needs a modern browser and a secure (https) address.";
      return;
    }
    el.state.textContent = "Setting up offline mode…";
    paintInstall();
    whenReg(function (r) {
      var ready = function () {
        el.state.innerHTML = "<b>Offline mode is on.</b> The chart finder, the wheel, the celestial clock, the Moon calendar, the catalogue, the signs and the RoTao page open without a connection, and so does any portrait you have opened before. The Torah and Zohar readings and the rest of the portraits need the library below.";
        el.lib.hidden = false; loadLibrary();
      };
      if (navigator.serviceWorker.controller) ready();
      else navigator.serviceWorker.ready.then(function () { setTimeout(ready, 300); });
    });

    /* what is saved already, and what there is to save */
    function readMeta() {
      return caches.open(LIB).then(function (c) { return c.match(META); }).then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
    }
    function writeMeta() {
      return caches.open(LIB).then(function (c) { return c.put(META, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } })); }).catch(function () { /* nothing to do */ });
    }
    function have(g) { return g.files.filter(function (f) { return meta[f[0]] === f[1]; }).length; }
    function paintGroups() {
      el.groups.innerHTML = Object.keys(pre.groups).map(function (id) {
        var g = pre.groups[id], n = have(g), all = g.files.length, left = g.files.filter(function (f) { return meta[f[0]] !== f[1]; }).reduce(function (a, f) { return a + f[2]; }, 0);
        var status = n === all ? "all saved" : n ? num(n) + " of " + num(all) + " saved" : "not saved";
        return '<li><label><input type="checkbox" data-g="' + id + '"' + (n === all ? "" : " checked") + ' ' + (running ? "disabled" : "") + '> <span class="off-gl"><b>' + esc(g.label) + "</b> <span>" + esc(g.note) + '</span></span> <span class="off-gs">' + status + (left ? ", " + mb(left) + " to save" : "") + "</span></label></li>";
      }).join("");
    }
    function paintStore() {
      if (!navigator.storage || !navigator.storage.estimate) { el.store.textContent = ""; return; }
      navigator.storage.estimate().then(function (e) { el.store.textContent = "This site is using " + mb(e.usage || 0) + (e.quota ? " of about " + mb(e.quota) + " your browser allows." : "."); }).catch(function () { /* unknown */ });
    }
    function loadLibrary() {
      fetch(ROOT + "precache.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("list"); return r.json(); }).then(function (j) {
        pre = j; return readMeta();
      }).then(function (m) { meta = m || {}; paintGroups(); paintStore(); }).catch(function () {
        el.msg.textContent = "The list of files could not be read. Try again when you are online.";
      });
    }

    /* saving: six files at a time, straight into the browser's storage */
    function setBusy(b) {
      running = b; el.save.disabled = b; el.remove.disabled = b; el.cancel.hidden = !b; el.bar.hidden = !b;
      el.groups.querySelectorAll("input").forEach(function (i) { i.disabled = b; });
    }
    function save() {
      if (running || !pre) return;
      var chosen = Array.prototype.map.call(el.groups.querySelectorAll("input:checked"), function (i) { return pre.groups[i.getAttribute("data-g")]; });
      var jobs = [];
      chosen.forEach(function (g) { g.files.forEach(function (f) { if (meta[f[0]] !== f[1]) jobs.push(f); }); });
      if (!jobs.length) { el.msg.textContent = chosen.length ? "Everything you chose is saved already." : "Choose at least one part to save."; return; }
      if (navigator.onLine === false) { el.msg.textContent = "There is no connection right now. Try again when you are online."; return; }
      var total = jobs.reduce(function (a, f) { return a + f[2]; }, 0), doneN = 0, doneB = 0, failed = 0, quota = false, i = 0;
      stop = false; setBusy(true); el.bar.max = total; el.bar.value = 0;
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { /* fine */ });
      var tick = function () { el.msg.textContent = "Saving " + num(doneN) + " of " + num(jobs.length) + " files (" + mb(doneB) + " of " + mb(total) + ")…"; el.bar.value = doneB; };
      tick();
      caches.open(LIB).then(function (cache) {
        function one(f) {
          var tries = 0;
          function go() {
            return fetch(BASE + f[0]).then(function (res) {
              if (!res.ok) throw new Error(res.status);
              return cache.put(BASE + f[0], res);
            }).then(function () { meta[f[0]] = f[1]; doneB += f[2]; }, function (e) {
              if (e && (e.name === "QuotaExceededError" || /quota/i.test(e.message || ""))) { quota = true; stop = true; return; }
              if (++tries < 3 && !stop) return new Promise(function (r) { setTimeout(r, 400 * tries); }).then(go);
              failed++;
            });
          }
          return go().then(function () { doneN++; if (doneN % 25 === 0) { tick(); } });
        }
        function lane() {
          if (stop || i >= jobs.length) return Promise.resolve();
          return one(jobs[i++]).then(lane);
        }
        var lanes = []; for (var k = 0; k < 6; k++) lanes.push(lane());
        return Promise.all(lanes).then(writeMeta);
      }).then(function () {
        setBusy(false); paintGroups(); paintStore();
        el.msg.textContent = quota ? "There is not enough room on this device for the rest. Choose fewer parts, or free some space and try again."
          : stop ? "Stopped. What was saved stays, and saving continues from there next time."
          : failed ? num(failed) + " files could not be fetched. Press Save again to retry them."
          : "Saved. These pages and readings now open without a connection.";
      }).catch(function (e) {
        setBusy(false); paintGroups();
        el.msg.textContent = (e && e.name === "QuotaExceededError") ? "There is not enough room on this device. Choose fewer parts." : "Saving did not finish. Press Save again to continue.";
      });
    }
    el.save.addEventListener("click", save);
    el.cancel.addEventListener("click", function () { stop = true; el.msg.textContent = "Stopping…"; });
    el.remove.addEventListener("click", function () {
      if (running) return;
      caches.delete(LIB).then(function () { meta = {}; paintGroups(); paintStore(); el.msg.textContent = "The saved library was removed from this device. The app itself stays."; });
    });
    window.addEventListener("online", function () { if (!running) el.msg.textContent = ""; });
  }

  var host = $("[data-offline]");
  if (host) mountPanel(host);
})();
