import manualIndex from './manualIndex.json';
import bel_ditManualContent from './manuals/bel-dit/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-dit': bel_ditManualContent.manuals['bel-dit'],
};

export const submittedManualAssets = {
  'bel-dit/images/exp2/theory/01_image_-_1.webp': require('./manuals/bel-dit/images/exp2/theory/01_image_-_1.webp'),
  'bel-dit/images/exp2/theory/02_image_-_2.webp': require('./manuals/bel-dit/images/exp2/theory/02_image_-_2.webp'),
  'bel-dit/images/exp2/theory/03_image_-_3.webp': require('./manuals/bel-dit/images/exp2/theory/03_image_-_3.webp'),
  'bel-dit/images/exp2/theory/04_image_-_4.webp': require('./manuals/bel-dit/images/exp2/theory/04_image_-_4.webp'),
  'bel-dit/images/exp2/theory/05_image_-_5.webp': require('./manuals/bel-dit/images/exp2/theory/05_image_-_5.webp'),
  'bel-dit/images/exp2/theory/06_image_-_6.webp': require('./manuals/bel-dit/images/exp2/theory/06_image_-_6.webp'),
  'bel-dit/images/exp2/theory/07_image_-_7.webp': require('./manuals/bel-dit/images/exp2/theory/07_image_-_7.webp'),
  'bel-dit/images/exp2/theory/08_image_-8.webp': require('./manuals/bel-dit/images/exp2/theory/08_image_-8.webp'),
  'bel-dit/images/exp2/theory/09_image_-_9.webp': require('./manuals/bel-dit/images/exp2/theory/09_image_-_9.webp'),
  'bel-dit/images/exp2/theory/10_image_-_10.webp': require('./manuals/bel-dit/images/exp2/theory/10_image_-_10.webp'),
  'bel-dit/images/exp2/theory/11_image_-_11.webp': require('./manuals/bel-dit/images/exp2/theory/11_image_-_11.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
