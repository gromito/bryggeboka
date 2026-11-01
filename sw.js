/* Bryggeboka service worker – offline-cache
   Sider og manifest hentes fra nettet først (så oppdateringer kommer fram),
   med cachen som reserve uten nett. Ikoner hentes fra cachen først. */
var CACHE = "bryggeboka-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/logo.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf("bryggeboka-") === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Bare vanlige svar fra vår egen side skal i cachen – ikke feilsider
// eller omdirigeringer (f.eks. til en innloggingsside).
function cacheable(res) {
  return res && res.ok && res.type === "basic" && !res.redirected;
}

function put(req, res) {
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var isPage = req.mode === "navigate" || /\.(html|webmanifest)$/.test(url.pathname) || url.pathname.slice(-1) === "/";

  if (isPage) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (cacheable(res)) put(req, res);
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (cacheable(res)) put(req, res);
        return res;
      });
    })
  );
});
