// 静态资源交给浏览器按照服务器的 Cache-Control 处理。
// 开发环境的 chunk 地址可能复用，不能使用 Service Worker 缓存优先。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清理旧版本缓存，避免继续占用空间；不要删除同源其他应用的缓存。
      await caches.delete("static-v1");
      await self.clients.claim();
    })(),
  );
});
