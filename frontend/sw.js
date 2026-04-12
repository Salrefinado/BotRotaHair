/* sw.js — RotaHair Service Worker */
'use strict';

const CACHE_NAME = 'rotahair-v1';
const CACHE_ASSETS = [
  '/',
  '/app.js',
  '/app.css',
  '/static/logo.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap',
  'https://unpkg.com/lucide@latest'
];

/* ── Instalação: pré-cache dos assets estáticos ── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_ASSETS).catch((err) => {
        console.warn('[SW] Alguns assets não foram cacheados:', err);
      });
    })
  );
});

/* ── Ativação: remove caches antigos ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: estratégia Network-first para API, Cache-first para assets ── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* Ignora requisições que não são GET */
  if (event.request.method !== 'GET') return;

  /* Requisições à API — sempre vai para a rede (dados em tempo real) */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Sem conexão. Verifique sua internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  /* Assets estáticos — cache-first, fallback para rede */
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        /* Só cacheia respostas válidas */
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        /* Fallback: retorna a página principal cacheada para navegação */
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
