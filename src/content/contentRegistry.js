import manualIndex from './manualIndex.json';
import bel_adaManualContent from './manuals/bel-ada/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-ada': bel_adaManualContent.manuals['bel-ada'],
};

export const submittedManualAssets = {
  'bel-ada/images/exp6/procedure/01_6.1.webp': require('./manuals/bel-ada/images/exp6/procedure/01_6.1.webp'),
  'bel-ada/images/exp6/procedure/02_6.2.webp': require('./manuals/bel-ada/images/exp6/procedure/02_6.2.webp'),
  'bel-ada/images/exp6/technicalData/datasheet/technical_specification.webp': require('./manuals/bel-ada/images/exp6/technicalData/datasheet/technical_specification.webp'),
  'bel-ada/images/exp7/procedure/01_7.1.webp': require('./manuals/bel-ada/images/exp7/procedure/01_7.1.webp'),
  'bel-ada/images/exp7/procedure/02_7.2.webp': require('./manuals/bel-ada/images/exp7/procedure/02_7.2.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
