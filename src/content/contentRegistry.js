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
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
