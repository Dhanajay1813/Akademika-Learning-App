import acsManualContent from './manuals/acs/manualContent.json';
import bel_adaManualContent from './manuals/bel-ada/manualContent.json';

import manualIndex from './manualIndex.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'acs': acsManualContent.manuals['acs'],
  'bel-ada': bel_adaManualContent.manuals['bel-ada'],
};

export const submittedManualAssets = {
  'acs/images/test/objective/71XA_N8Xj1L._SX522_.jpg': require('./manuals/acs/images/test/objective/71XA_N8Xj1L._SX522_.webp'),
  'acs/images/test/objective/71XA_N8Xj1L._SX522_.webp': require('./manuals/acs/images/test/objective/71XA_N8Xj1L._SX522_.webp'),
  'bel-ada/images/exp1/observation/01_Screenshot_from_2026-07-18_12-40-43.png': require('./manuals/bel-ada/images/exp1/observation/01_Screenshot_from_2026-07-18_12-40-43.webp'),
  'bel-ada/images/exp1/observation/01_Screenshot_from_2026-07-18_12-40-43.webp': require('./manuals/bel-ada/images/exp1/observation/01_Screenshot_from_2026-07-18_12-40-43.webp'),
  'bel-ada/images/exp1/observation/02_Screenshot_from_2026-07-18_12-40-50.png': require('./manuals/bel-ada/images/exp1/observation/02_Screenshot_from_2026-07-18_12-40-50.webp'),
  'bel-ada/images/exp1/observation/02_Screenshot_from_2026-07-18_12-40-50.webp': require('./manuals/bel-ada/images/exp1/observation/02_Screenshot_from_2026-07-18_12-40-50.webp'),
  'bel-ada/images/exp1/observation/03_Screenshot_from_2026-07-18_12-41-04.png': require('./manuals/bel-ada/images/exp1/observation/03_Screenshot_from_2026-07-18_12-41-04.webp'),
  'bel-ada/images/exp1/observation/03_Screenshot_from_2026-07-18_12-41-04.webp': require('./manuals/bel-ada/images/exp1/observation/03_Screenshot_from_2026-07-18_12-41-04.webp'),
  'bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.png': require('./manuals/bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.webp'),
  'bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.webp': require('./manuals/bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.webp'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);

