import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';
import { hasValidContent } from '../services/experimentProgressService';

const technicalSections = [
  ['datasheet', 'Datasheet'],
  ['blockDiagram', 'Block Diagram'],
  ['circuitDiagram', 'Circuit Diagram'],
  ['referenceSignal', 'Reference Signal'],
];

export default function TechnicalDataScreen({ route, navigation }) {
  const { productId, experimentId, manualId, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const experiment = getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId);
  const visibleTechnicalSections = useMemo(() => {
    if (!manualId || !experiment?.sections?.technicalData) return technicalSections;
    return technicalSections.filter(([sectionKey]) => hasValidContent(experiment.sections.technicalData[sectionKey]));
  }, [experiment, manualId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (!active) return;
      setGuestBlocked(isGuestUser(user) && !allowGuestWorkbookAccess);
      setLoadedUser(true);
    })();
    return () => { active = false; };
  }, [allowGuestWorkbookAccess]));

  const open = async (sectionKey, title) => {
    if (guestBlocked) return;
    await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId }, openedSection: `technical:${sectionKey}` });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title, technical: true, allowGuestWorkbookAccess });
  };

  if (!loadedUser) return <ScreenContainer title="Technical Data" />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Technical Data">
        <Text style={styles.locked}>Technical experiment content is not available in guest mode from Products.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Technical Data">
      {visibleTechnicalSections.length ? visibleTechnicalSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      )) : <Text style={styles.locked}>Technical data is not available for this experiment.</Text>}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
