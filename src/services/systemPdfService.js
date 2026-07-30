import { resolveLocalPdfFile, sharePdf } from './pdfOpenService';

export { normalizePdfUri, openPdf, openPdfOnAndroid, openPdfExternally, sharePdf } from './pdfOpenService';
export const resolvePdfFile = resolveLocalPdfFile;
export const shareOrSavePdf = sharePdf;
