import manualIndex from './manualIndex.json';
import bel_cotManualContent from './manuals/bel-cot/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-cot': bel_cotManualContent.manuals['bel-cot'],
};

export const submittedManualAssets = {
  'bel-cot/images/exp1/observation/observation.webp': require('./manuals/bel-cot/images/exp1/observation/observation.webp'),
  'bel-cot/images/exp1/theory/01_image-1.webp': require('./manuals/bel-cot/images/exp1/theory/01_image-1.webp'),
  'bel-cot/images/exp1/theory/02_image-2.webp': require('./manuals/bel-cot/images/exp1/theory/02_image-2.webp'),
  'bel-cot/images/exp1/theory/03_image-3.webp': require('./manuals/bel-cot/images/exp1/theory/03_image-3.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
