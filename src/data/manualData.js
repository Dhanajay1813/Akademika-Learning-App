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

export const getMappedSectionPages = (manualId, experimentId, sectionKey, technical = false) => {
  const experiment = getMappedExperiment(manualId, experimentId);
  if (!experiment) return [];
  const value = technical
    ? experiment.sections.technicalData?.[sectionKey] || []
    : experiment.sections[sectionKey] || [];
  if (getManualContentMode(manualId) === 'pdfPageMapping') {
    return Array.isArray(value?.pages) ? value.pages : [];
  }
  return value;
};

export const getManualBlockImageSource = (manualId, imageFile) => (
  getSubmittedManualImageSource(manualId, imageFile)
);

export const getManualPageSource = (manualId, pageFile) => (
  getSubmittedManualImageSource(manualId, pageFile)
);
