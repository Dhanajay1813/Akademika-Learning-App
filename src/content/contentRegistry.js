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
  'bel-ada/images/exp2/observation/01_observation.webp': require('./manuals/bel-ada/images/exp2/observation/01_observation.webp'),
  'bel-ada/images/exp2/observation/02_observation.webp': require('./manuals/bel-ada/images/exp2/observation/02_observation.webp'),
  'bel-ada/images/exp2/procedure/procedure.webp': require('./manuals/bel-ada/images/exp2/procedure/procedure.webp'),
  'bel-ada/images/exp2/technicalData/datasheet/technical_data.webp': require('./manuals/bel-ada/images/exp2/technicalData/datasheet/technical_data.webp'),
  'bel-ada/images/exp2/theory/theory.webp': require('./manuals/bel-ada/images/exp2/theory/theory.webp'),
  'bel-ada/images/exp3/observation/01_observation.webp': require('./manuals/bel-ada/images/exp3/observation/01_observation.webp'),
  'bel-ada/images/exp3/observation/02_observation2.webp': require('./manuals/bel-ada/images/exp3/observation/02_observation2.webp'),
  'bel-ada/images/exp3/procedure/01_procedure.webp': require('./manuals/bel-ada/images/exp3/procedure/01_procedure.webp'),
  'bel-ada/images/exp3/procedure/02_procedure3.3.webp': require('./manuals/bel-ada/images/exp3/procedure/02_procedure3.3.webp'),
  'bel-ada/images/exp3/procedure/03_3.4.webp': require('./manuals/bel-ada/images/exp3/procedure/03_3.4.webp'),
  'bel-ada/images/exp3/procedure/04_procedure3.5.webp': require('./manuals/bel-ada/images/exp3/procedure/04_procedure3.5.webp'),
  'bel-ada/images/exp3/procedure/05_procedure3.6.webp': require('./manuals/bel-ada/images/exp3/procedure/05_procedure3.6.webp'),
  'bel-ada/images/exp3/procedure/06_3.7.webp': require('./manuals/bel-ada/images/exp3/procedure/06_3.7.webp'),
  'bel-ada/images/exp3/procedure/07_3.8.webp': require('./manuals/bel-ada/images/exp3/procedure/07_3.8.webp'),
  'bel-ada/images/exp3/procedure/08_3.9.webp': require('./manuals/bel-ada/images/exp3/procedure/08_3.9.webp'),
  'bel-ada/images/exp3/procedure/09_3.10.webp': require('./manuals/bel-ada/images/exp3/procedure/09_3.10.webp'),
  'bel-ada/images/exp3/procedure/10_3.11.webp': require('./manuals/bel-ada/images/exp3/procedure/10_3.11.webp'),
  'bel-ada/images/exp3/result/01_3.12.webp': require('./manuals/bel-ada/images/exp3/result/01_3.12.webp'),
  'bel-ada/images/exp3/result/02_3.13.webp': require('./manuals/bel-ada/images/exp3/result/02_3.13.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
