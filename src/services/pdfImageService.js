import { Image as RNImage } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const DATA_URI_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif|heic|heif);base64,/i;
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

const extensionFromUri = (uri = '') => {
  const clean = String(uri).split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
};

const mimeFromUri = (uri, fallback = 'image/jpeg') => {
  const ext = extensionFromUri(uri);
  if (MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
  return fallback;
};

const normalizeMime = (mime = 'image/jpeg') => {
  const lower = String(mime || '').toLowerCase();
  if (lower === 'image/jpg') return 'image/jpeg';
  if (lower.startsWith('image/')) return lower;
  return 'image/jpeg';
};

const stripDataUriPrefix = (value) => String(value || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');

const outputFormat = (options = {}) => {
  if (options.outputFormat === 'png' || options.preferPng || options.preserveTransparency) return ImageManipulator.SaveFormat.PNG;
  return ImageManipulator.SaveFormat.JPEG;
};

const outputMime = (format) => (format === ImageManipulator.SaveFormat.PNG ? 'image/png' : 'image/jpeg');

const sourceUri = async (source) => {
  if (!source) return null;
  if (typeof source === 'number') {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return asset.localUri || asset.uri || RNImage.resolveAssetSource(source)?.uri || null;
  }
  if (typeof source === 'string') return source;
  if (source.uri) return source.uri;
  if (source.localUri) return source.localUri;
  if (source.imageUri) return source.imageUri;
  if (source.imageURI) return source.imageURI;
  if (source.path) return source.path;
  if (source.image) return sourceUri(source.image);
  return null;
};

async function downloadRemoteToCache(uri) {
  const filename = `pdf-image-${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFromUri(uri) || 'jpg'}`;
  const destination = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(uri, destination);
  return result.uri;
}

export function getSignalImageSource(signalRecord) {
  if (!signalRecord) return null;
  return signalRecord.imageUri
    || signalRecord.imageURI
    || signalRecord.uri
    || signalRecord.localUri
    || signalRecord.path
    || signalRecord.image
    || signalRecord.base64
    || null;
}

export async function resolvePdfImageDataUri(source, options = {}) {
  const label = options.label || 'Image';
  const preferredMime = normalizeMime(options.mimeType || options.mime || 'image/jpeg');

  if (!source) {
    return { ok: false, label, reason: 'Image source is missing.' };
  }

  if (typeof source === 'string' && DATA_URI_PATTERN.test(source)) {
    const normalized = source.replace('image/jpg', 'image/jpeg');
    return { ok: true, label, dataUri: normalized, mimeType: normalized.slice(5, normalized.indexOf(';base64,')), sourceType: 'data-uri' };
  }

  if (typeof source === 'string' && RAW_BASE64_PATTERN.test(source) && source.length > 200 && !source.includes('://')) {
    const mimeType = preferredMime;
    return { ok: true, label, dataUri: `data:${mimeType};base64,${stripDataUriPrefix(source)}`, mimeType, sourceType: 'raw-base64' };
  }

  try {
    let uri = await sourceUri(source);
    if (!uri) return { ok: false, label, reason: 'Image source URI is missing.' };

    const sourceType = uri.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)?.[1] || 'file';
    let temporaryUri = null;

    if (/^https?:\/\//i.test(uri)) {
      temporaryUri = await downloadRemoteToCache(uri);
      uri = temporaryUri;
    }

    const format = outputFormat(options);
    try {
      const normalized = await ImageManipulator.manipulateAsync(uri, [], {
        base64: true,
        compress: options.quality || 0.86,
        format,
      });
      if (normalized?.base64) {
        const mimeType = outputMime(format);
        return {
          ok: true,
          label,
          dataUri: `data:${mimeType};base64,${stripDataUriPrefix(normalized.base64)}`,
          mimeType,
          sourceType,
          temporaryUri: normalized.uri || temporaryUri,
        };
      }
    } catch (normalizeError) {
      if (__DEV__) console.warn(`PDF image normalization failed for ${label}: ${normalizeError?.message || normalizeError}`);
    }

    const mimeType = normalizeMime(options.mimeType || options.mime || mimeFromUri(uri, preferredMime));
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

    if (!base64 || base64.length < 20) {
      return { ok: false, label, reason: 'Image file could not be read.' };
    }

    return {
      ok: true,
      label,
      dataUri: `data:${mimeType};base64,${stripDataUriPrefix(base64)}`,
      mimeType,
      sourceType,
      temporaryUri,
    };
  } catch (error) {
    return { ok: false, label, reason: error?.message || 'Image could not be prepared.' };
  }
}

export function imageFailureWarning(label) {
  return `<div class="image-warning">${label || 'Image'} could not be included.</div>`;
}
