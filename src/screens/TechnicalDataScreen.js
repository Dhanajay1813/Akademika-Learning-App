import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { saveDraftPatch } from '../storage/autosave';

export default function TechnicalDataScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const open = async (sectionKey, title) => {
    await saveDraftPatch({ productId, experimentId, openedSection: sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title, technical: true });
  };
  return (
    <ScreenContainer title="Technical Data">
      <AppButton title="Datasheet" onPress={() => open('datasheet', 'Datasheet')} />
      <AppButton title="Block Diagram" onPress={() => open('blockDiagram', 'Block Diagram')} />
      <AppButton title="Circuit Diagram" onPress={() => open('circuitDiagram', 'Circuit Diagram')} />
      <AppButton title="Reference Signal" onPress={() => navigation.navigate('ReferenceSignal', { productId, experimentId, manualId })} />
    </ScreenContainer>
  );
}
