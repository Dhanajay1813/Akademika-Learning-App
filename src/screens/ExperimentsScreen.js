import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getMappedManual } from '../data/manualData';
import { getExperimentsForProduct } from '../data/experiments';
import { getProductById } from '../data/products';
import { CONTENT_EDITOR_TEST_PRODUCT_ID } from '../config/contentEditorConfig';
import { saveDraftPatch } from '../storage/autosave';

export default function ExperimentsScreen({ route, navigation }) {
  const { productId } = route.params;
  const product = getProductById(productId);
  const manualId = product?.manualId;
  const mappedExperiments = getMappedManual(manualId)?.experiments;
  const experiments = mappedExperiments || (productId === CONTENT_EDITOR_TEST_PRODUCT_ID ? getExperimentsForProduct(productId) : []);

  const open = async (experimentId) => {
    await saveDraftPatch({ productId, experimentId });
    navigation.navigate('ExperimentMenu', { productId, experimentId, manualId });
  };

  return (
    <ScreenContainer title="Experiments">
      {experiments.map((experiment) => (
        <AppCard key={experiment.id} title={experiment.title} subtitle={`Experiment ID: ${experiment.id}`}>
          <AppButton title="Open" onPress={() => open(experiment.id)} />
        </AppCard>
      ))}
      {experiments.length === 0 ? <Text style={styles.empty}>Experiments will be added soon.</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 24 },
});
