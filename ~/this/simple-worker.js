/**
 * Simple test worker
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  return new Response('Hello world!', {
    headers: { 'content-type': 'text/plain' },
  });
} 