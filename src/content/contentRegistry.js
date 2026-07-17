import manualIndex from './manualIndex.json';
import acsManualContent from './manuals/acs/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  acs: acsManualContent.manuals.acs,
};

export const submittedManualAssets = {
  'acs/images/test/objective/71XA_N8Xj1L._SX522_.jpg': require('./manuals/acs/images/test/objective/71XA_N8Xj1L._SX522_.jpg'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
