/* 자세 인식에 쓰는 큰 파일(모델 8.9MB + wasm)을 이 기기에 한 번만 받아 두고 계속 재사용한다.

   왜 필요한가 — 이 파일들은 만든 쪽에서 "1시간만 보관하라"고 되어 있어(max-age=3600),
   교시가 바뀌면 브라우저가 버리고 다시 받는다. 한 반 30명이 동시에 시작하면 그때마다
   270MB, 두 반이면 540MB가 학교 와이파이로 한꺼번에 쏟아져 수업이 버벅였다.
   우리가 직접 보관하면 학생 기기마다 '처음 한 번'만 받고, 그 뒤로는 네트워크를 쓰지 않는다.

   나머지 요청(앱 화면·Firebase 실시간 통신)은 손대지 않고 그대로 흘려보낸다 —
   기록·과제는 항상 최신이어야 하므로 캐시하면 안 된다. */
const BIG_CACHE = "tabata-model-v1";

// 이 주소들만 보관한다 (버전이 들어 있어 내용이 바뀌면 주소도 바뀐다 = 낡은 것을 쓸 위험이 없다)
function isBigAsset(url) {
  return url.includes("storage.googleapis.com/mediapipe-models/")
      || url.includes("cdn.jsdelivr.net/npm/@mediapipe/");
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => e.waitUntil((async () => {
  // 예전 이름으로 남은 보관함은 정리한다
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== BIG_CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  if (e.request.method !== "GET" || !isBigAsset(url)) return;   // 나머지는 건드리지 않는다

  e.respondWith((async () => {
    const cache = await caches.open(BIG_CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;                       // 이미 받아 둔 것 — 네트워크를 쓰지 않는다
    const res = await fetch(e.request);
    // 정상적으로 받은 것만 보관한다(중간에 끊긴 응답을 보관하면 다음에 깨진다)
    if (res && res.ok && res.status === 200) {
      try { await cache.put(e.request, res.clone()); } catch (err) {}
    }
    return res;
  })());
});

/* 앱이 "미리 받아 두라"고 알려주면 그때 받아 둔다 (수업 시작 전에 미리 준비시키는 용도) */
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "PREFETCH" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(BIG_CACHE);
    for (const u of d.urls) {
      try {
        if (await cache.match(u)) continue;
        const res = await fetch(u, { mode: "cors" });
        if (res && res.ok) await cache.put(u, res.clone());
      } catch (err) {}
    }
    const cs = await self.clients.matchAll();
    cs.forEach(c => c.postMessage({ type: "PREFETCH_DONE" }));
  })());
});
