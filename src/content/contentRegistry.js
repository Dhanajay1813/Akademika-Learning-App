import manualIndex from './manualIndex.json';
import bel_adaManualContent from './manuals/bel-ada/manualContent.json';

export const submittedManualIndex = manualIndex;

export const submittedManuals = {
  'bel-ada': bel_adaManualContent.manuals['bel-ada'],
};

export const submittedManualAssets = {
  'bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.png': require('./manuals/bel-ada/images/exp1/technicalData/circuitDiagram/Screenshot_from_2026-07-18_11-20-10.png'),
};

export const getSubmittedManualImageSource = (manualId, imageFile) => (
  submittedManualAssets[`${manualId}/${imageFile}`] || null
);
