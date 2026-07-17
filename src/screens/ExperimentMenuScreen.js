import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { canEditContentForProduct } from '../storage/contentEditorStorage';

export default function ExperimentMenuScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const experiment = getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId);
  const canEditAcsContent = canEditContentForProduct(productId);
  const open = async (sectionKey, title) => {
    await saveDraftPatch({ productId, experimentId, openedSection: sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title });
  };
  return (
    <ScreenContainer title={experiment?.title || 'Experiment'}>
      <AppButton title="Objective" onPress={() => open('objective', 'Objective')} />
      <AppButton title="Theory" onPress={() => open('theory', 'Theory')} />
      <AppButton title="Functional Block" onPress={() => open('functionalBlock', 'Functional Block')} />
      <AppButton title="Procedure" onPress={() => open('procedure', 'Procedure')} />
      <AppButton title="Technical Data" onPress={() => navigation.navigate('TechnicalData', { productId, experimentId, manualId })} />
      <AppButton title="Equipments" onPress={() => open('equipments', 'Equipments')} />
      {canEditAcsContent ? (
        <>
          <AppButton title="Observation" onPress={() => open('observation', 'Observation')} />
          <AppButton title="Result" onPress={() => open('result', 'Result')} />
          <AppButton title="Conclusion" onPress={() => open('conclusion', 'Conclusion')} />
        </>
      ) : null}
    </ScreenContainer>
  );
}
