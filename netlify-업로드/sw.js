// 오프라인 캐싱은 하지 않는다 — 포즈 인식(Mediapipe CDN)·Firebase 모두 네트워크가 필요해
// 캐시로 대신할 수 없다. 이 파일의 유일한 목적은 크롬의 PWA 설치 조건(등록된 서비스워커 +
// fetch 핸들러)을 만족시키는 것이다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
