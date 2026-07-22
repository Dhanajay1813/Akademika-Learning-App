import { Alert, Linking, Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

const PDF_MIME_TYPE = 'application/pdf';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export function normalizePdfUri(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value?.uri === 'string') return value.uri.trim();
  if (typeof value?.fileUri === 'string') return value.fileUri.trim();
  return '';
}

async function sharePdfFallback(pdfFile) {
  Alert.alert('No PDF viewer was available', 'Choose an application to open or save the report.');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfFile.uri, {
      mimeType: PDF_MIME_TYPE,
      dialogTitle: 'Open or save experiment report',
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  throw new Error('No PDF viewer or share sheet is available on this device.');
}

async function openPdfOnAndroid(pdfFile) {
  try {
    // Android ACTION_VIEW requires a content URI.
    // getContentUriAsync currently remains in the legacy compatibility API.
    const contentUri = await LegacyFileSystem.getContentUriAsync(pdfFile.uri);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      type: PDF_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch (error) {
    await sharePdfFallback(pdfFile);
  }
}

async function openPdfOnIos(pdfFile) {
  const canOpen = await Linking.canOpenURL(pdfFile.uri);
  if (canOpen) {
    await Linking.openURL(pdfFile.uri);
    return;
  }
  await sharePdfFallback(pdfFile);
}

export async function openPdfFile(pdfSource) {
  const pdfUri = normalizePdfUri(pdfSource);
  if (!pdfUri) throw new Error('Generated PDF file is missing. Please generate the report again.');

  const pdfFile = new File(pdfUri);
  if (!pdfFile.exists) throw new Error('Generated PDF file was not found. Please generate the report again.');

  if (Platform.OS === 'android') return openPdfOnAndroid(pdfFile);
  return openPdfOnIos(pdfFile);
}
