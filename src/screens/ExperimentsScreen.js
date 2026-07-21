import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getMappedManual } from '../data/manualData';
import { getProductById } from '../data/products';
import { saveDraftPatch } from '../storage/autosave';
import { getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';

export default function ExperimentsScreen({ route, navigation }) {
  const { productId } = route.params;
  const [guest, setGuest] = useState(false);
  const product = getProductById(productId);
  const manualId = product?.manualId;
  const mappedExperiments = getMappedManual(manualId)?.experiments;
  const experiments = mappedExperiments || [];

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (active) setGuest(isGuestUser(user));
    })();
    return () => { active = false; };
  }, []));

  const open = async (experimentId) => {
    if (guest) return;
    await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId } });
    navigation.navigate('ExperimentMenu', { productId, experimentId, manualId });
  };

  return (
    <ScreenContainer title="Experiments">
      {guest ? <Text style={styles.notice}>Experiment content is available to registered students.</Text> : null}
      {experiments.map((experiment) => (
        <AppCard key={experiment.id} title={experiment.title}>
          {!guest ? <AppButton title="Open" onPress={() => open(experiment.id)} /> : null}
        </AppCard>
      ))}
      {experiments.length === 0 ? <Text style={styles.empty}>Experiments will be added soon.</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notice: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  empty: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 24 },
});
