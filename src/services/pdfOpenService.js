import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

const PDF_MIME_TYPE = 'application/pdf';
const ANDROID_ACTION_VIEW = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

async function sharePdfFallback(pdfUri) {
  Alert.alert('No PDF viewer was available', 'Choose an application to open or save the report.');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, { mimeType: PDF_MIME_TYPE, UTI: 'com.adobe.pdf' });
    return;
  }
  throw new Error('No PDF viewer or share sheet is available on this device.');
}

export async function openPdfFile(pdfUri) {
  if (!pdfUri) throw new Error('Generated PDF file is missing.');

  const info = await FileSystem.getInfoAsync(pdfUri);
  if (!info.exists) throw new Error('Generated PDF file was not found. Please generate the PDF again.');

  if (Platform.OS !== 'android') {
    const canOpen = await Linking.canOpenURL(pdfUri);
    if (canOpen) {
      await Linking.openURL(pdfUri);
      return;
    }
    await sharePdfFallback(pdfUri);
    return;
  }

  try {
    const contentUri = await FileSystem.getContentUriAsync(pdfUri);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
      type: PDF_MIME_TYPE,
    });
  } catch (error) {
    await sharePdfFallback(pdfUri);
  }
}
