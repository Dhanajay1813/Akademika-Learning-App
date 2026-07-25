import { submittedManuals, getSubmittedManualImageSource } from '../content/contentRegistry';

export const getMappedManual = (manualId) => (
  manualId ? submittedManuals[manualId] || null : null
);

export const isSubmittedManual = (manualId) => Boolean(manualId && submittedManuals[manualId]);

export const getManualContentMode = (manualId) => (
  getMappedManual(manualId)?.contentMode || 'blocks'
);

export const isPdfPageMappedManual = (manualId) => (
  getManualContentMode(manualId) === 'pdfPageMapping'
);

export const getMappedExperiment = (manualId, experimentId) => (
  getMappedManual(manualId)?.experiments.find((experiment) => experiment.id === experimentId) || null
);

export const getMappedSectionValue = (manualId, experimentId, sectionKey, technical = false) => {
  const experiment = getMappedExperiment(manualId, experimentId);
  if (!experiment) return null;
  return technical
    ? experiment.sections.technicalData?.[sectionKey] || null
    : experiment.sections[sectionKey] || null;
};

export const getMappedSectionPages = (manualId, experimentId, sectionKey, technical = false) => {
  const value = getMappedSectionValue(manualId, experimentId, sectionKey, technical);
  if (getManualContentMode(manualId) === 'pdfPageMapping') {
    return Array.isArray(value?.pages) ? value.pages : [];
  }
  return Array.isArray(value) ? value : [];
};

export const getMappedSectionBlocks = (manualId, experimentId, sectionKey, technical = false) => {
  const value = getMappedSectionValue(manualId, experimentId, sectionKey, technical);
  if (getManualContentMode(manualId) === 'pdfPageMapping') {
    return Array.isArray(value?.blocks) ? value.blocks : [];
  }
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object' && item.type) : [];
};

export const getManualBlockImageSource = (manualId, imageFile) => (
  getSubmittedManualImageSource(manualId, imageFile)
);

export const getManualPageSource = (manualId, pageFile) => (
  getSubmittedManualImageSource(manualId, pageFile)
);
