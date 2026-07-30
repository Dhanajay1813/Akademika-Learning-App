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
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
