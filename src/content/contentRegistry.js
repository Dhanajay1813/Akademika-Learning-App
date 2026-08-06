import manualIndex from './manualIndex.json';
import bel_adaManualContent from './manuals/bel-ada/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-ada': bel_adaManualContent.manuals['bel-ada'],
};

export const submittedManualAssets = {
  'bel-ada/images/exp1/observation/01_observations-1.webp': require('./manuals/bel-ada/images/exp1/observation/01_observations-1.webp'),
  'bel-ada/images/exp1/observation/02_observations-1.webp': require('./manuals/bel-ada/images/exp1/observation/02_observations-1.webp'),
  'bel-ada/images/exp1/observation/03_observations.1.webp': require('./manuals/bel-ada/images/exp1/observation/03_observations.1.webp'),
  'bel-ada/images/exp1/observation/04_observations-calculation.webp': require('./manuals/bel-ada/images/exp1/observation/04_observations-calculation.webp'),
  'bel-ada/images/exp1/procedure/procedure.webp': require('./manuals/bel-ada/images/exp1/procedure/procedure.webp'),
  'bel-ada/images/exp1/technicalData/datasheet/technical_specification.webp': require('./manuals/bel-ada/images/exp1/technicalData/datasheet/technical_specification.webp'),
  'bel-ada/images/exp1/theory/01_theory.webp': require('./manuals/bel-ada/images/exp1/theory/01_theory.webp'),
  'bel-ada/images/exp1/theory/02_image-2.webp': require('./manuals/bel-ada/images/exp1/theory/02_image-2.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
