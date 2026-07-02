// 保守型 Service Worker：只缓存「带内容指纹的静态资源」（可长期缓存、天然防脏）。
// 页面导航与所有 /api 请求一律走网络——避免缓存出脏数据或串号/鉴权问题。
// 这样既拿到 PWA 可安装 + 静态资源秒开，又不给动态考试系统引入数据风险。
const STATIC_CACHE = "static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 仅缓存内容指纹静态资源；页面 & API 直接走网络
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpe?g|svg|gif|webp|ico|woff2?|ttf)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
