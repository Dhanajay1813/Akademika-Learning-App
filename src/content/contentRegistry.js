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
  'bel-cot/images/exp5/observation/observation.webp': require('./manuals/bel-cot/images/exp5/observation/observation.webp'),
  'bel-cot/images/exp5/procedure/image-1.webp': require('./manuals/bel-cot/images/exp5/procedure/image-1.webp'),
  'bel-cot/images/exp6/observation/observation.webp': require('./manuals/bel-cot/images/exp6/observation/observation.webp'),
  'bel-cot/images/exp6/procedure/opto-coupler.webp': require('./manuals/bel-cot/images/exp6/procedure/opto-coupler.webp'),
  'bel-cot/images/exp6/result/frequency_response_graphs.webp': require('./manuals/bel-cot/images/exp6/result/frequency_response_graphs.webp'),
  'bel-cot/images/exp6/theory/image-1.webp': require('./manuals/bel-cot/images/exp6/theory/image-1.webp'),
  'bel-cot/images/exp7/conclusion/conclusion.webp': require('./manuals/bel-cot/images/exp7/conclusion/conclusion.webp'),
  'bel-cot/images/exp7/observation/observation.webp': require('./manuals/bel-cot/images/exp7/observation/observation.webp'),
  'bel-cot/images/exp7/procedure/01_reverse_bias_characteristics.webp': require('./manuals/bel-cot/images/exp7/procedure/01_reverse_bias_characteristics.webp'),
  'bel-cot/images/exp7/procedure/02_forward_bias_characteristics.webp': require('./manuals/bel-cot/images/exp7/procedure/02_forward_bias_characteristics.webp'),
  'bel-cot/images/exp7/result/01_image-1.webp': require('./manuals/bel-cot/images/exp7/result/01_image-1.webp'),
  'bel-cot/images/exp7/result/02_image-2.webp': require('./manuals/bel-cot/images/exp7/result/02_image-2.webp'),
  'bel-cot/images/exp7/result/03_image-3.webp': require('./manuals/bel-cot/images/exp7/result/03_image-3.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
