import manualIndex from './manualIndex.json';
import bel_cotManualContent from './manuals/bel-cot/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-cot': bel_cotManualContent.manuals['bel-cot'],
};

export const submittedManualAssets = {
  'bel-cot/images/exp3/observation/observation.webp': require('./manuals/bel-cot/images/exp3/observation/observation.webp'),
  'bel-cot/images/exp3/procedure/01_series_combination.webp': require('./manuals/bel-cot/images/exp3/procedure/01_series_combination.webp'),
  'bel-cot/images/exp3/procedure/02_parallel_combination.webp': require('./manuals/bel-cot/images/exp3/procedure/02_parallel_combination.webp'),
  'bel-cot/images/exp3/theory/01_image-1.webp': require('./manuals/bel-cot/images/exp3/theory/01_image-1.webp'),
  'bel-cot/images/exp3/theory/02_image-2.webp': require('./manuals/bel-cot/images/exp3/theory/02_image-2.webp'),
  'bel-cot/images/exp3/theory/03_image-3.webp': require('./manuals/bel-cot/images/exp3/theory/03_image-3.webp'),
  'bel-cot/images/exp3/theory/04_image-4.webp': require('./manuals/bel-cot/images/exp3/theory/04_image-4.webp'),
  'bel-cot/images/exp4/observation/observation.webp': require('./manuals/bel-cot/images/exp4/observation/observation.webp'),
  'bel-cot/images/exp4/procedure/01_image-1.webp': require('./manuals/bel-cot/images/exp4/procedure/01_image-1.webp'),
  'bel-cot/images/exp4/procedure/02_image-2.webp': require('./manuals/bel-cot/images/exp4/procedure/02_image-2.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
