import { applyProgressToDraft, calculateExperimentProgress } from '../services/experimentProgressService';

export const calculateProgress = (draft = {}) => calculateExperimentProgress({
  productId: draft.productId,
  manualId: draft.manualId,
  experimentId: draft.experimentId,
  draft,
}).percentage;

export const applyDynamicProgress = applyProgressToDraft;
