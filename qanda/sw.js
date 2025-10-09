// Claim control ASAP
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Broadcast any incoming message to all controlled clients
self.addEventListener('message', event => {
  const data = event.data;
  // Broadcast to all window clients (including those not yet controlled)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        client.postMessage(data);
      }
      // Optional: send ack back to the sender
      try {
        event.source && event.source.postMessage({ type: 'ack', payload: data });
      } catch (_) {}
    })
  );
});