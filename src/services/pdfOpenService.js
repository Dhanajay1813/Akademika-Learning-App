import { Alert, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

const PDF_MIME_TYPE = 'application/pdf';
const PDF_UTI = 'com.adobe.pdf';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const MISSING_FILE_MESSAGE = 'The PDF file could not be found. Please generate it again.';
const SYSTEM_MENU_MESSAGE = 'This device could not open the system file menu.';
const OPEN_OR_SAVE_MESSAGE = 'Choose Files or another compatible application to open or save this PDF.';
const BLOCKED_URI_PATTERNS = [
  /^exp:\/\//i,
  /^exps:\/\//i,
  /^expo-development-client:\/\//i,
  /^https?:\/\/localhost(?::\d+)?/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?/i,
  /^https?:\/\/.*\.expo\.dev/i,
  /u\.expo\.dev/i,
  /\/manifest/i,
  /bundle\.js/i,
  /hot-update/i,
  /\/node_modules\//i,
  /\/\.expo\//i,
];

export function normalizePdfUri(source) {
  if (typeof source === 'number') return '';
  if (typeof source === 'string') return source.trim();
  if (!source || typeof source !== 'object') return '';
  const values = [source.pdfUri, source.uri, source.fileUri, source.localUri, source.generatedPdfUri, source.reportUri, source.pdfPath, source.filePath, source.path];
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

async function resolveStaticAssetUri(source) {
  if (typeof source !== 'number') return '';
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  return asset.localUri || asset.uri || '';
}

async function resolvePdfSourceUri(source) {
  if (typeof source === 'number') return resolveStaticAssetUri(source);
  return normalizePdfUri(source);
}

function isBlockedPdfUri(uri) {
  return !uri || BLOCKED_URI_PATTERNS.some((pattern) => pattern.test(uri));
}

export function isInvalidPdfPreviewUri(uri) {
  return isBlockedPdfUri(uri) || !isLocalFileUri(uri);
}

function isLocalFileUri(uri) {
  return typeof uri === 'string' && uri.startsWith('file://');
}

function sanitizeFileName(value) {
  const name = String(value || 'Akademika_PDF.pdf')
    .trim()
    .replace(/[\/\\:?*"<>|#%]+/g, '_')
    .replace(/[\u0000-\u001F\u007F]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 140) || 'Akademika_PDF.pdf';
  return /\.pdf$/i.test(name) ? name : `${name.replace(/\.+$/g, '')}.pdf`;
}

function fileNameFromUri(uri) {
  const clean = String(uri || '').split(/[?#]/)[0];
  const name = clean.split('/').pop();
  return name ? decodeURIComponent(name) : '';
}


async function resolveLocalPdfFile(pdfSource, options = {}) {
  const pdfUri = await resolvePdfSourceUri(pdfSource);
  if (isBlockedPdfUri(pdfUri) || !isLocalFileUri(pdfUri)) throw new Error(MISSING_FILE_MESSAGE);
  const sourceFile = new File(pdfUri);
  if (!sourceFile.exists || !Number(sourceFile.size || 0)) throw new Error(MISSING_FILE_MESSAGE);
  return prepareAndroidSafePdfFile(sourceFile, options);
}


function androidOpenCacheDirectory() {
  return new Directory(Paths.cache, 'pdf-open');
}

function isAndroidOpenCacheFile(file) {
  return file.uri.startsWith(androidOpenCacheDirectory().uri) && hasSafePdfName(file);
}

function hasSafePdfName(file) {
  const name = fileNameFromUri(file.uri);
  return /\.pdf$/i.test(name) && sanitizeFileName(name) === name;
}

async function prepareAndroidSafePdfFile(sourceFile, options = {}) {
  if (Platform.OS !== 'android' && /\.pdf$/i.test(sourceFile.uri)) return sourceFile;
  if (Platform.OS !== 'android') return copyToSafePdfFile(sourceFile, options);
  if (hasSafePdfName(sourceFile)) return sourceFile;
  if (isAndroidOpenCacheFile(sourceFile)) return sourceFile;
  return copyToSafePdfFile(sourceFile, options);
}

async function copyToSafePdfFile(sourceFile, options = {}) {
  const directory = androidOpenCacheDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const requestedName = options.fileName || options.title || fileNameFromUri(sourceFile.uri) || 'Akademika_PDF.pdf';
  const destination = new File(directory, sanitizeFileName(requestedName));
  if (destination.exists && Number(destination.size || 0) === Number(sourceFile.size || 0)) return destination;
  if (destination.exists) destination.delete();
  sourceFile.copy(destination);
  return destination;
}

export async function openPdf(pdfSource, options = {}) {
  const localPdf = await resolveLocalPdfFile(pdfSource, options);
  return { mode: 'internal-preview', uri: localPdf.uri };
}

export async function openPdfOnAndroid(pdfSource, options = {}) {
  const localPdfFile = pdfSource instanceof File ? pdfSource : await resolveLocalPdfFile(pdfSource, options);
  try {
    // Android external applications require a readable content:// URI.
    // Expo SDK 54 currently exposes this compatibility helper through
    // expo-file-system/legacy.
    const contentUri = await LegacyFileSystem.getContentUriAsync(localPdfFile.uri);
    if (!String(contentUri || '').startsWith('content://')) throw new Error(MISSING_FILE_MESSAGE);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      type: PDF_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch (error) {
    Alert.alert('Open or Save PDF', OPEN_OR_SAVE_MESSAGE);
    if (!(await Sharing.isAvailableAsync())) throw new Error(SYSTEM_MENU_MESSAGE);
    await Sharing.shareAsync(localPdfFile.uri, {
      mimeType: PDF_MIME_TYPE,
      dialogTitle: 'Open or save PDF',
    });
  }
}

export async function openPdfExternally(pdfSource, options = {}) {
  if (Platform.OS === 'android') return openPdfOnAndroid(pdfSource, options);
  return sharePdf(pdfSource, options);
}

export async function sharePdf(pdfSource, options = {}) {
  const localPdf = await resolveLocalPdfFile(pdfSource, options);
  if (!(await Sharing.isAvailableAsync())) throw new Error(SYSTEM_MENU_MESSAGE);
  await Sharing.shareAsync(localPdf.uri, {
    mimeType: PDF_MIME_TYPE,
    UTI: PDF_UTI,
    dialogTitle: options.dialogTitle || 'Share or save PDF',
  });
}

export { resolveLocalPdfFile, resolvePdfSourceUri };
