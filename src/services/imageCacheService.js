import { Image as ExpoImage } from 'expo-image';

const pendingPrefetches = new Set();

export async function clearImageCache() {
  const result = {
    memory: { ok: false, error: null },
    disk: { ok: false, error: null },
    ok: false,
  };
  try {
    await ExpoImage.clearMemoryCache();
    result.memory.ok = true;
  } catch (error) {
    result.memory.error = error?.message || String(error);
  }
  try {
    await ExpoImage.clearDiskCache();
    result.disk.ok = true;
  } catch (error) {
    result.disk.error = error?.message || String(error);
  }
  result.ok = result.memory.ok && result.disk.ok;
  return result;
}

export async function prefetchRemoteImages(items = [], limit = 2) {
  const remoteItems = items
    .filter((item) => item?.uri)
    .slice(0, limit)
    .filter((item) => {
      const key = item.cacheKey || item.uri;
      if (pendingPrefetches.has(key)) return false;
      pendingPrefetches.add(key);
      return true;
    });

  await Promise.all(remoteItems.map(async (item) => {
    const key = item.cacheKey || item.uri;
    try {
      await ExpoImage.prefetch(item.uri, 'memory-disk');
    } catch (error) {
      if (__DEV__) console.warn(`Image prefetch failed: ${item.uri}`);
    } finally {
      pendingPrefetches.delete(key);
    }
  }));
}
