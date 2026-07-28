import { Alert, Linking, Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

const PDF_MIME_TYPE = 'application/pdf';
const PDF_UTI = 'com.adobe.pdf';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const DEFAULT_TITLE = 'Open PDF';
const DEFAULT_MESSAGE = 'Choose Files or another compatible application to open this PDF.';
const SHARING_UNAVAILABLE_MESSAGE = 'This device could not open the system file menu.';
const MISSING_FILE_MESSAGE = 'The PDF file could not be found. Please generate or download it again.';

export function normalizePdfUri(pdfSource) {
  if (typeof pdfSource === 'string') return pdfSource.trim();
  if (typeof pdfSource?.uri === 'string') return pdfSource.uri.trim();
  if (typeof pdfSource?.fileUri === 'string') return pdfSource.fileUri.trim();
  return '';
}

function getMessage(options = {}) {
  return options.message || DEFAULT_MESSAGE;
}

function getTitle(options = {}) {
  return options.title || DEFAULT_TITLE;
}

function resolvePdfFile(pdfSource) {
  const pdfUri = normalizePdfUri(pdfSource);
  if (!pdfUri) throw new Error(MISSING_FILE_MESSAGE);
  const file = new File(pdfUri);
  if (!file.exists) throw new Error(MISSING_FILE_MESSAGE);
  return file;
}

async function ensureSharingAvailable() {
  if (await Sharing.isAvailableAsync()) return;
  throw new Error(SHARING_UNAVAILABLE_MESSAGE);
}

async function shareWithSystemSheet(file, options = {}) {
  await ensureSharingAvailable();
  await Sharing.shareAsync(file.uri, {
    mimeType: PDF_MIME_TYPE,
    dialogTitle: getTitle(options),
    UTI: PDF_UTI,
  });
}

function showSystemFallbackMessage(options = {}) {
  return new Promise((resolve) => {
    Alert.alert(
      getTitle(options),
      getMessage(options),
      [{ text: 'Continue', onPress: resolve }],
      { cancelable: true, onDismiss: resolve }
    );
  });
}

async function openOrSavePdfOnAndroid(file, options = {}) {
  try {
    const contentUri = await LegacyFileSystem.getContentUriAsync(file.uri);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      type: PDF_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch (error) {
    await showSystemFallbackMessage(options);
    await shareWithSystemSheet(file, options);
  }
}

async function openPdfOnIos(file, options = {}) {
  try {
    const canOpen = await Linking.canOpenURL(file.uri);
    if (canOpen) {
      await Linking.openURL(file.uri);
      return;
    }
  } catch (error) {
    // Fall through to the system sheet when direct preview is unavailable.
  }
  await shareWithSystemSheet(file, options);
}

export async function openOrSavePdf(pdfSource, options = {}) {
  const file = resolvePdfFile(pdfSource);
  if (Platform.OS === 'android') return openOrSavePdfOnAndroid(file, options);
  if (Platform.OS === 'ios') return openPdfOnIos(file, options);
  await shareWithSystemSheet(file, options);
}

export async function sharePdf(pdfSource, options = {}) {
  const file = resolvePdfFile(pdfSource);
  await shareWithSystemSheet(file, options);
}
