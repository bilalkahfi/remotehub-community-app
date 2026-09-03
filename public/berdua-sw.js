/* Service worker Berdua - dipakai buat nerima Web Push.
   Di iPhone, push cuma jalan kalau aplikasinya udah di-Add to Home Screen. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "Berdua", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Berdua";
  const options = {
    body: payload.body || "",
    icon: "/berdua/icon-192.png",
    badge: "/berdua/icon-192.png",
    tag: payload.tag || "berdua",
    renotify: Boolean(payload.renotify),
    data: { url: payload.url || "/berdua" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/berdua";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/berdua") && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
