import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { PDFDocument } from 'pdf-lib';
import { resolveManualPdfUri } from './manualPdfAssetService';

const preparedSections = new Map();
const GENERIC_ERROR = 'The selected manual pages could not be prepared.';

const uniquePages = (pages = []) => {
  const seen = new Set();
  return pages
    .map((page) => Number(page))
    .filter((page) => Number.isInteger(page) && page > 0)
    .filter((page) => {
      if (seen.has(page)) return false;
      seen.add(page);
      return true;
    });
};

const safeFilePart = (value) => String(value || 'manual')
  .trim()
  .replace(/[^a-zA-Z0-9._-]+/g, '_')
  .replace(/_+/g, '_')
  .slice(0, 80) || 'manual';

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

function buildCacheKey({ manualId, experimentId, sectionKey, pages, sourceUri }) {
  return [manualId, experimentId || 'complete', sectionKey || 'manual', pages.join(','), sourceUri].join('|');
}

function buildOutputUri({ manualId, experimentId, sectionKey, cacheKey }) {
  const filename = [manualId, experimentId, sectionKey]
    .filter(Boolean)
    .map(safeFilePart)
    .join('_') || 'manual_pages';
  return `${FileSystem.cacheDirectory}${filename}_${stableHash(cacheKey)}.pdf`;
}

function fileExists(uri) {
  return Boolean(uri && new File(uri).exists);
}

export async function prepareManualSectionPdf({ manualId, experimentId, sectionKey, pages = [] } = {}) {
  const mappedPages = uniquePages(pages);
  if (!manualId || !mappedPages.length) throw new Error(GENERIC_ERROR);

  try {
    const sourceUri = await resolveManualPdfUri(manualId);
    const cacheKey = buildCacheKey({ manualId, experimentId, sectionKey, pages: mappedPages, sourceUri });
    const cachedUri = preparedSections.get(cacheKey);
    if (fileExists(cachedUri)) return cachedUri;

    const outputUri = buildOutputUri({ manualId, experimentId, sectionKey, cacheKey });
    if (fileExists(outputUri)) {
      preparedSections.set(cacheKey, outputUri);
      return outputUri;
    }

    const sourceBase64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
    const sourceDoc = await PDFDocument.load(sourceBase64);
    const outputDoc = await PDFDocument.create();
    const pageIndexes = mappedPages
      .map((page) => page - 1)
      .filter((index) => index >= 0 && index < sourceDoc.getPageCount());

    if (!pageIndexes.length) throw new Error(GENERIC_ERROR);

    const copiedPages = await outputDoc.copyPages(sourceDoc, pageIndexes);
    copiedPages.forEach((page) => outputDoc.addPage(page));
    const outputBase64 = await outputDoc.saveAsBase64();
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, { encoding: FileSystem.EncodingType.Base64 });
    preparedSections.set(cacheKey, outputUri);
    return outputUri;
  } catch (error) {
    throw new Error(GENERIC_ERROR);
  }
}
