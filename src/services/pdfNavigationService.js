import { Platform } from 'react-native';
import { normalizePdfUri, resolveLocalPdfFile } from './pdfOpenService';

export async function openPdfInsideApp(navigation, pdfSource, options = {}) {
  if (Platform.OS === 'ios') {
    const pdfUri = normalizePdfUri(pdfSource);
    const previewParams = {
      title: options.title || options.fileName || 'PDF',
      fileName: options.fileName || (typeof pdfUri === 'string' ? pdfUri.split('/').pop() : ''),
      initialPage: options.initialPage || 1,
    };
    if (typeof pdfSource === 'number') previewParams.pdfUri = pdfSource;
    else if (pdfUri) previewParams.pdfUri = pdfUri;
    else previewParams.pdfSource = pdfSource;
    navigation.navigate('PdfPreview', previewParams);
    return pdfUri || pdfSource;
  }

  const file = await resolveLocalPdfFile(pdfSource, options);
  navigation.navigate('PdfPreview', {
    pdfUri: file.uri,
    title: options.title || options.fileName || 'PDF',
    fileName: options.fileName || file.uri.split('/').pop(),
    initialPage: options.initialPage || 1,
  });
  return file.uri;
}
