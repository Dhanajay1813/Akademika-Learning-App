import { submittedManuals, getSubmittedManualImageSource } from '../content/contentRegistry';

export const getMappedManual = (manualId) => (
  manualId ? submittedManuals[manualId] || null : null
);

export const isSubmittedManual = (manualId) => Boolean(manualId && submittedManuals[manualId]);

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

export const getManualBlockImageSource = (manualId, imageFile) => (
  getSubmittedManualImageSource(manualId, imageFile)
);

export const getManualPageSource = (manualId, pageFile) => (
  getSubmittedManualImageSource(manualId, pageFile)
);
