// This is the final app-ready OCR-improved mapping. OCR text is never displayed.
import experimentMapping from './json/experimentMapping.json';
import manuals from './json/manuals.json';
import { MANUAL_IMAGE_BASE_URL } from '../config/manualConfig';
import { bundledManualPages } from './bundledManualPages';

const processedRootMarker = '02_processed_manuals/';
const manualsById = Object.fromEntries(manuals.map((manual) => [manual.manualId, manual]));

export const getMappedManual = (manualId) => (
  manualId ? experimentMapping.manuals[manualId] || null : null
);

export const getMappedExperiment = (manualId, experimentId) => (
  getMappedManual(manualId)?.experiments.find((experiment) => experiment.id === experimentId) || null
);

export const getMappedSectionPages = (manualId, experimentId, sectionKey, technical = false) => {
  const experiment = getMappedExperiment(manualId, experimentId);
  if (!experiment) return [];
  return technical
    ? experiment.sections.technicalData?.[sectionKey] || []
    : experiment.sections[sectionKey] || [];
};

const getPageFolderRelativePath = (manualId) => {
  const folder = (manualsById[manualId]?.pageImageFolderPath || "").replaceAll("\\", "/");
  const markerIndex = folder.indexOf(processedRootMarker);
  return markerIndex >= 0
    ? folder.slice(markerIndex + processedRootMarker.length)
    : '';
};

export const getManualPageUrl = (manualId, pageFile) => {
  const relativeFolder = getPageFolderRelativePath(manualId);
  if (!relativeFolder || !pageFile) return '';
  const baseUrl = MANUAL_IMAGE_BASE_URL.replace(/\/+$/, "");
  return encodeURI(`${baseUrl}/${relativeFolder}/${pageFile}`);
};

export const getManualPageSource = (manualId, pageFile) => {
  const bundledSource = bundledManualPages[manualId]?.[pageFile];
  if (bundledSource) return bundledSource;
  const uri = getManualPageUrl(manualId, pageFile);
  return uri ? { uri } : null;
};
