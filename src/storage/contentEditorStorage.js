import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CONTENT_EDITOR_ENABLED, CONTENT_EDITOR_TEST_PRODUCT_ID } from '../config/contentEditorConfig';
import { getJson, setJson } from './storage';

export const ACS_CONTENT_DRAFT_STORAGE_KEY = 'akademika_content_draft_acs';
export const ACS_CONTENT_EXPORT_FOLDER = 'acs_content_export/';
export const ACS_CONTENT_EXPORT_FILE = 'manualContent_acs.json';
export const ACS_CONTENT_DRAFT_IMAGE_ROOT = 'manualContentDraft/acs/';

export const canEditContentForProduct = (productId) => (
  CONTENT_EDITOR_ENABLED && productId === CONTENT_EDITOR_TEST_PRODUCT_ID
);

const getSectionStorageKey = ({ experimentId, sectionKey, technical }) => (
  experimentId + ":" + (technical ? "technical:" : "") + sectionKey
);

const getFileExtension = (uri = '') => {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop().toLowerCase() : 'jpg';
  return extension && extension.length <= 5 ? extension : 'jpg';
};

const getImageDraftDir = (experimentId) => (
  `${FileSystem.documentDirectory}${ACS_CONTENT_DRAFT_IMAGE_ROOT}${experimentId}/images/`
);

const emptyDraft = {
  productId: CONTENT_EDITOR_TEST_PRODUCT_ID,
  title: 'ACS Content Entry',
  sections: {},
  updatedAt: null,
};

export const getAcsContentDraft = async (productId) => {
  if (!canEditContentForProduct(productId)) return emptyDraft;
  return getJson(ACS_CONTENT_DRAFT_STORAGE_KEY, emptyDraft);
};

export const saveAcsContentSection = async ({ productId, experimentId, sectionKey, title, technical, blocks }) => {
  if (!canEditContentForProduct(productId)) return null;
  const draft = await getAcsContentDraft(productId);
  const normalizedBlocks = blocks.map((block, index) => {
    const order = index + 1;
    if (block.type === 'image') {
      return {
        id: block.id,
        type: 'image',
        imageUri: block.imageUri,
        caption: block.caption || '',
        order,
      };
    }
    return { ...block, order };
  });
  const nextDraft = {
    ...draft,
    productId: CONTENT_EDITOR_TEST_PRODUCT_ID,
    title: 'ACS Content Entry',
    updatedAt: new Date().toISOString(),
    sections: {
      ...(draft.sections || {}),
      [getSectionStorageKey({ experimentId, sectionKey, technical })]: {
        experimentId,
        sectionKey,
        title,
        technical: Boolean(technical),
        blocks: normalizedBlocks,
      },
    },
  };
  await setJson(ACS_CONTENT_DRAFT_STORAGE_KEY, nextDraft);
  return nextDraft;
};

export const getAcsContentSection = async ({ productId, experimentId, sectionKey, technical }) => {
  if (!canEditContentForProduct(productId)) return null;
  const draft = await getAcsContentDraft(productId);
  return draft.sections?.[getSectionStorageKey({ experimentId, sectionKey, technical })] || null;
};

export const copyAcsDraftImage = async ({ productId, experimentId, sourceUri, blockId }) => {
  if (!canEditContentForProduct(productId) || !sourceUri || !blockId) return null;
  const imageDir = getImageDraftDir(experimentId);
  await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
  const extension = getFileExtension(sourceUri);
  const imageUri = `${imageDir}${blockId}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: imageUri });
  return imageUri;
};

const getExportImageName = (imageUri = '', fallback) => {
  const cleanUri = imageUri.split('?')[0];
  const name = cleanUri.split('/').pop();
  return name || fallback;
};

const copyExportImages = async (draft, exportDir) => {
  const copied = [];
  const sections = Object.values(draft.sections || {});
  for (const section of sections) {
    for (const block of section.blocks || []) {
      if (block.type !== 'image' || !block.imageUri) continue;
      const fileName = getExportImageName(block.imageUri, `${block.id}.jpg`);
      const relativePath = `images/acs/${section.experimentId}/${fileName}`;
      const destinationDir = `${exportDir}images/acs/${section.experimentId}/`;
      const destinationUri = `${exportDir}${relativePath}`;
      await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
      await FileSystem.copyAsync({ from: block.imageUri, to: destinationUri });
      copied.push({ blockId: block.id, sourceUri: block.imageUri, exportPath: relativePath });
    }
  }
  return copied;
};

export const exportAcsContentDraft = async (productId) => {
  if (!canEditContentForProduct(productId)) return null;
  const draft = await getAcsContentDraft(productId);
  const exportDir = `${FileSystem.documentDirectory}${ACS_CONTENT_EXPORT_FOLDER}`;
  const exportUri = `${exportDir}${ACS_CONTENT_EXPORT_FILE}`;
  await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  const exportedImages = await copyExportImages(draft, exportDir);
  await FileSystem.writeAsStringAsync(exportUri, JSON.stringify({
    ...draft,
    exportedImages,
  }, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(exportUri, {
      mimeType: 'application/json',
      dialogTitle: 'Generate Final ACS Content Pack',
    });
  }
  return exportUri;
};
