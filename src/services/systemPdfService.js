import { Alert, Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

const PDF_MIME_TYPE = 'application/pdf';
const PDF_UTI = 'com.adobe.pdf';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const MISSING_FILE_MESSAGE = 'The PDF file could not be found. Please generate it again.';
const SHARING_UNAVAILABLE_MESSAGE = 'This device could not open the system file menu.';
const INVALID_PDF_URI_MESSAGE = 'The PDF file could not be found. Please generate it again.';
const BLOCKED_URI_PATTERNS = [
  /^exp:\/\//i,
  /^exps:\/\//i,
  /^expo-development-client:\/\//i,
  /u\.expo\.dev/i,
  /\/node_modules\/expo\//i,
  /\/\.expo\//i,
  /^https?:\/\/localhost(?::\d+)?/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?/i,
  /^https?:\/\/.*\.expo\.dev/i,
  /\/node_modules\//i,
  /\/manifest/i,
  /bundle\.js/i,
  /hot-update/i,
];

export function normalizePdfUri(source) {
  if (typeof source === 'string') return source.trim();
  if (!source || typeof source !== 'object') return '';
  const candidates = [source.uri, source.fileUri, source.pdfUri, source.generatedPdfUri, source.localUri];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return value?.trim() || '';
}

export function isBlockedPdfUri(uri) {
  return !uri || BLOCKED_URI_PATTERNS.some((pattern) => pattern.test(uri));
}

function safeFilePart(value) {
  return String(value || 'Akademika_PDF')
    .trim()
    .replace(/[\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || 'Akademika_PDF';
}

async function copyToPdfFileIfNeeded(file, options = {}) {
  if (/\.pdf(?:$|[?#])/i.test(file.uri)) return file;
  const filename = `${safeFilePart(options.fileName || options.title || 'Akademika_PDF').replace(/\.pdf$/i, '')}.pdf`;
  const destination = `${LegacyFileSystem.cacheDirectory}${filename}`;
  await LegacyFileSystem.copyAsync({ from: file.uri, to: destination });
  return new File(destination);
}

export async function resolvePdfFile(pdfSource, options = {}) {
  const pdfUri = normalizePdfUri(pdfSource);
  if (isBlockedPdfUri(pdfUri)) throw new Error(INVALID_PDF_URI_MESSAGE);
  const file = new File(pdfUri);
  if (!file.exists) throw new Error(MISSING_FILE_MESSAGE);
  return copyToPdfFileIfNeeded(file, options);
}

async function ensureSharingAvailable() {
  if (await Sharing.isAvailableAsync()) return;
  throw new Error(SHARING_UNAVAILABLE_MESSAGE);
}

export async function shareOrSavePdf(pdfSource, options = {}) {
  const file = await resolvePdfFile(pdfSource, options);
  await ensureSharingAvailable();
  await Sharing.shareAsync(file.uri, {
    mimeType: PDF_MIME_TYPE,
    dialogTitle: options.dialogTitle || 'Share or save PDF',
    UTI: PDF_UTI,
  });
}

export async function openPdfExternally(pdfSource, options = {}) {
  const file = await resolvePdfFile(pdfSource, options);
  if (Platform.OS === 'android') {
    const contentUri = await LegacyFileSystem.getContentUriAsync(file.uri);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      type: PDF_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
    return;
  }
  await shareOrSavePdf(file.uri, options);
}

export const sharePdf = shareOrSavePdf;
