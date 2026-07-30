import manualIndex from './manualIndex.json';
import bel_ditManualContent from './manuals/bel-dit/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-dit': bel_ditManualContent.manuals['bel-dit'],
};

export const submittedManualAssets = {
  'bel-dit/images/exp2/procedure/01_1_realization_of_all_basic_gates_using_nor_gate.webp': require('./manuals/bel-dit/images/exp2/procedure/01_1_realization_of_all_basic_gates_using_nor_gate.webp'),
  'bel-dit/images/exp2/procedure/02_image_-_2.webp': require('./manuals/bel-dit/images/exp2/procedure/02_image_-_2.webp'),
  'bel-dit/images/exp2/procedure/03_2_realization_of_all_basic_gates_using_nand_gate.webp': require('./manuals/bel-dit/images/exp2/procedure/03_2_realization_of_all_basic_gates_using_nand_gate.webp'),
  'bel-dit/images/exp2/procedure/04_image_-4.webp': require('./manuals/bel-dit/images/exp2/procedure/04_image_-4.webp'),
  'bel-dit/images/exp2/procedure/05_3_realization_of_basic_exor_gate_using_and_nor_gate.webp': require('./manuals/bel-dit/images/exp2/procedure/05_3_realization_of_basic_exor_gate_using_and_nor_gate.webp'),
  'bel-dit/images/exp2/result/result.webp': require('./manuals/bel-dit/images/exp2/result/result.webp'),
  'bel-dit/images/exp3/theory/01_image_-1.webp': require('./manuals/bel-dit/images/exp3/theory/01_image_-1.webp'),
  'bel-dit/images/exp3/theory/02_image_-2.webp': require('./manuals/bel-dit/images/exp3/theory/02_image_-2.webp'),
  'bel-dit/images/exp3/theory/03_image_-3.webp': require('./manuals/bel-dit/images/exp3/theory/03_image_-3.webp'),
  'bel-dit/images/exp3/theory/04_image_-4.webp': require('./manuals/bel-dit/images/exp3/theory/04_image_-4.webp'),
  'bel-dit/images/exp4/theory/image_-1.webp': require('./manuals/bel-dit/images/exp4/theory/image_-1.webp'),
  'bel-dit/images/exp5/procedure/01_image_-_16.webp': require('./manuals/bel-dit/images/exp5/procedure/01_image_-_16.webp'),
  'bel-dit/images/exp5/procedure/02_image_-_17.webp': require('./manuals/bel-dit/images/exp5/procedure/02_image_-_17.webp'),
  'bel-dit/images/exp5/theory/01_image_-_1.webp': require('./manuals/bel-dit/images/exp5/theory/01_image_-_1.webp'),
  'bel-dit/images/exp5/theory/02_image_-_2.webp': require('./manuals/bel-dit/images/exp5/theory/02_image_-_2.webp'),
  'bel-dit/images/exp5/theory/03_image_-_3.webp': require('./manuals/bel-dit/images/exp5/theory/03_image_-_3.webp'),
  'bel-dit/images/exp5/theory/04_image_-_4.webp': require('./manuals/bel-dit/images/exp5/theory/04_image_-_4.webp'),
  'bel-dit/images/exp5/theory/05_image_-_5.webp': require('./manuals/bel-dit/images/exp5/theory/05_image_-_5.webp'),
  'bel-dit/images/exp5/theory/06_image_-_6.webp': require('./manuals/bel-dit/images/exp5/theory/06_image_-_6.webp'),
  'bel-dit/images/exp5/theory/07_image_-_7.webp': require('./manuals/bel-dit/images/exp5/theory/07_image_-_7.webp'),
  'bel-dit/images/exp5/theory/08_image_-_8.webp': require('./manuals/bel-dit/images/exp5/theory/08_image_-_8.webp'),
  'bel-dit/images/exp5/theory/09_image_-_9.webp': require('./manuals/bel-dit/images/exp5/theory/09_image_-_9.webp'),
  'bel-dit/images/exp5/theory/10_image_-_10.webp': require('./manuals/bel-dit/images/exp5/theory/10_image_-_10.webp'),
  'bel-dit/images/exp5/theory/11_image_-_11.webp': require('./manuals/bel-dit/images/exp5/theory/11_image_-_11.webp'),
  'bel-dit/images/exp5/theory/12_image_-_12.webp': require('./manuals/bel-dit/images/exp5/theory/12_image_-_12.webp'),
  'bel-dit/images/exp5/theory/13_image_-_13.webp': require('./manuals/bel-dit/images/exp5/theory/13_image_-_13.webp'),
  'bel-dit/images/exp5/theory/14_image_-_14.webp': require('./manuals/bel-dit/images/exp5/theory/14_image_-_14.webp'),
  'bel-dit/images/exp5/theory/15_image_-_15.webp': require('./manuals/bel-dit/images/exp5/theory/15_image_-_15.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
