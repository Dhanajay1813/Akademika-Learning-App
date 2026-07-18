import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { canEditContentForProduct } from '../storage/contentEditorStorage';

const standardSections = [
  ['objective', 'Objective'],
  ['theory', 'Theory'],
  ['functionalBlock', 'Functional Block'],
  ['procedure', 'Procedure'],
  ['equipments', 'Equipments'],
];

const recordSections = [
  ['observation', 'Observation'],
  ['result', 'Result'],
  ['conclusion', 'Conclusion'],
];

const hasSectionContent = (section) => Array.isArray(section) && section.length > 0;
const hasTechnicalData = (sections) => (
  sections?.technicalData
    ? Object.values(sections.technicalData).some(hasSectionContent)
    : false
);

export default function ExperimentMenuScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const experiment = getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId);
  const canEditAcsContent = canEditContentForProduct(productId);
  const isMappedExperiment = Boolean(manualId && experiment?.sections);
  const visibleStandardSections = isMappedExperiment
    ? standardSections.filter(([sectionKey]) => hasSectionContent(experiment.sections[sectionKey]))
    : standardSections;
  const visibleRecordSections = isMappedExperiment
    ? recordSections.filter(([sectionKey]) => hasSectionContent(experiment.sections[sectionKey]))
    : (canEditAcsContent ? recordSections : []);

  const open = async (sectionKey, title) => {
    await saveDraftPatch({ productId, experimentId, openedSection: sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title });
  };

  return (
    <ScreenContainer title={experiment?.title || 'Experiment'}>
      {visibleStandardSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}
      {!isMappedExperiment || hasTechnicalData(experiment.sections) ? (
        <AppButton title="Technical Data" onPress={() => navigation.navigate('TechnicalData', { productId, experimentId, manualId })} />
      ) : null}
      {visibleRecordSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}
    </ScreenContainer>
  );
}
