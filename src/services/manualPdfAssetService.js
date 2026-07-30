import { Asset } from 'expo-asset';
import { manualPdfAssets } from '../content/manualPdfAssets.generated';

const uriCache = new Map();

export function getManualPdfAsset(manualId) {
  if (!manualId) return null;
  return manualPdfAssets[manualId] || null;
}

export function hasManualPdfAsset(manualId) {
  return Boolean(getManualPdfAsset(manualId));
}

export async function resolveManualPdfUri(manualId) {
  if (!manualId) throw new Error('Manual ID is required.');
  if (uriCache.has(manualId)) return uriCache.get(manualId);
  const moduleRef = getManualPdfAsset(manualId);
  if (!moduleRef) throw new Error('Manual PDF asset is not bundled with this app.');
  const asset = Asset.fromModule(moduleRef);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('Manual PDF could not be resolved.');
  uriCache.set(manualId, uri);
  return uri;
}

