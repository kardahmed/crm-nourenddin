/* global self, clients */
// Imported by the Workbox-generated service worker via
// workbox.importScripts. Adds Web Push handlers without us owning the
// full SW file.

self.addEventListener('push', (event) => {
  let payload = { title: 'IMMO PRO-X', body: '', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (_) {
    if (event.data) payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/logo-180.png',
      badge: '/favicon.png',
      tag: payload.tag || 'immo-prox',
      data: { url: payload.url },
      renotify: !!payload.renotify,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.focus()
          if ('navigate' in c) c.navigate(targetUrl)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    }),
  )
})
