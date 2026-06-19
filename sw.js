/* ============================================================
   Service Worker — 你的电子褪黑素 PWA
   ============================================================
   策略说明：
   - 静态资源（index.html, manifest.json, tracks.json）: 安装时预缓存 + Stale-While-Revalidate
   - 音频文件（ASMR/**, Natural_Noise/**）: Cache First，用户播放时自动缓存
   - 其他请求: Network First（不缓存）
   - 音频缓存容量限制: 50MB，超出时自动清理最早缓存
   ============================================================ */

/* === PWA: 缓存名称 & 版本 === */
const STATIC_CACHE = 'melatonin-static-v1';
const AUDIO_CACHE  = 'melatonin-audio-v1';
const MAX_AUDIO_CACHE_BYTES = 50 * 1024 * 1024; // 50MB
const AUDIO_PATH_PATTERNS = [/\/ASMR\//, /\/Natural_Noise\//];

/* === PWA: 安装时预缓存的静态资源列表 === */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tracks.json'
];

/* ============================================================
   Install — 预缓存核心静态文件
   ============================================================ */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing — precaching static files:', PRECACHE_URLS);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // 立即激活，不等旧 SW 释放
      .catch((err) => console.warn('[SW] Precaching partial failure:', err))
  );
});

/* ============================================================
   Activate — 清理旧版本缓存
   ============================================================ */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, AUDIO_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('melatonin-') && !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // 立即接管所有页面
  );
});

/* ============================================================
   Helper — 判断请求是否为音频文件
   ============================================================ */
function isAudioRequest(url) {
  // 匹配 ASMR/ 或 Natural_Noise/ 路径下的文件
  return AUDIO_PATH_PATTERNS.some((pattern) => pattern.test(url));
}

/* ============================================================
   Helper — 计算音频缓存总大小 & 清理最旧条目
   工作原理：
   1. 遍历 audio cache 中所有条目，累加 blob 大小
   2. 若总大小超过 50MB，按「先进先出」删除最早缓存条目
   3. 被删除的条目数量最少化，刚好降到限制以下
   ============================================================ */
async function enforceAudioCacheLimit() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();

  // 收集所有条目的大小（按插入顺序，即 FIFO 顺序）
  const entries = [];
  let totalSize = 0;

  for (const request of keys) {
    try {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        entries.push({ request, size: blob.size });
        totalSize += blob.size;
      }
    } catch (err) {
      // 条目损坏，直接删除
      console.warn('[SW] Corrupted cache entry, deleting:', request.url);
      await cache.delete(request);
    }
  }

  // 如果超出限制，从最早（数组开头）的开始删除
  let evictedCount = 0;
  while (totalSize > MAX_AUDIO_CACHE_BYTES && entries.length > 0) {
    const oldest = entries.shift();
    await cache.delete(oldest.request);
    totalSize -= oldest.size;
    evictedCount++;
    console.log(
      `[SW] 🗑 Evicted: ${oldest.request.url.split('/').pop()} ` +
      `(${(oldest.size / 1024 / 1024).toFixed(1)}MB) — ` +
      `cache now ${(totalSize / 1024 / 1024).toFixed(1)}MB`
    );
  }

  if (evictedCount > 0) {
    console.log(`[SW] Cleanup done: removed ${evictedCount} entries, ${(totalSize / 1024 / 1024).toFixed(1)}MB remaining`);
  }
}

/* ============================================================
   Helper — 缓存音频并执行容量检查
   ============================================================ */
async function cacheAudioAndEnforce(request, response) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    // 使用 put 而非 addAll，因为 response 可能已被读取
    await cache.put(request, response.clone());
    console.log('[SW] 💾 Cached audio:', request.url.split('/').pop());
    // 异步执行容量检查（不阻塞响应返回）
    enforceAudioCacheLimit().catch((err) =>
      console.warn('[SW] Cache limit enforcement failed:', err)
    );
  } catch (err) {
    console.warn('[SW] Failed to cache audio:', request.url, err);
  }
}

/* ============================================================
   Fetch — 请求拦截 & 缓存策略

   策略矩阵：
   ┌──────────────────────┬─────────────────────────────────┐
   │ 请求类型              │ 策略                            │
   ├──────────────────────┼─────────────────────────────────┤
   │ 静态资源 (HTML/manifest) │ Stale-While-Revalidate      │
   │ 音频 (ASMR/Natural)   │ Cache First（命中→缓存，      │
   │                        │ 未命中→网络→缓存→返回）        │
   │ 其他（字体/脚本等）    │ Network First                  │
   └──────────────────────┴─────────────────────────────────┘
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // ---- 策略 1: 音频文件 — Cache First ----
  if (isAudioRequest(url.pathname)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // ✅ 缓存命中：直接返回
            console.log('[SW] ⚡ Cache hit (audio):', url.pathname.split('/').pop());
            return cachedResponse;
          }
          // ❌ 缓存未命中：从网络获取、缓存、返回
          console.log('[SW] 🌐 Cache miss (audio):', url.pathname.split('/').pop());
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              // 异步缓存，不延迟响应
              cacheAudioAndEnforce(request, networkResponse);
            }
            return networkResponse;
          }).catch((err) => {
            console.warn('[SW] Audio fetch failed (offline?):', url.pathname, err);
            // 网络失败且无缓存 → 返回错误
            return new Response('Audio not available offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // ---- 策略 2: 静态资源 — Stale-While-Revalidate ----
  // 立刻返回缓存，同时后台更新缓存（适合 index.html / manifest.json）
  if (PRECACHE_URLS.some((p) => url.pathname.endsWith(p.replace(/^\//, '')) || url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          // 优先返回缓存，网络请求在后台进行
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // ---- 策略 3: 其他请求 — Network First（不缓存） ----
  // 字体、CDN 资源等由浏览器自行处理
  event.respondWith(fetch(request));
});

/* ============================================================
   Message — 接收来自页面的消息（如获取缓存状态）
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    // 返回音频缓存统计信息供调试
    (async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const keys = await cache.keys();
      let totalSize = 0;
      for (const req of keys) {
        const res = await cache.match(req);
        if (res) {
          totalSize += (await res.clone().blob()).size;
        }
      }
      const client = event.source;
      if (client) {
        client.postMessage({
          type: 'CACHE_STATS',
          audioCount: keys.length,
          audioSizeMB: (totalSize / 1024 / 1024).toFixed(1),
          maxSizeMB: (MAX_AUDIO_CACHE_BYTES / 1024 / 1024).toFixed(0)
        });
      }
    })();
  }
});
