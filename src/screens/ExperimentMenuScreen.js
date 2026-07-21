import { useCallback, useState } from 'react';
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
  const { productId, experimentId, manualId, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const experiment = getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId);
  const isMappedExperiment = Boolean(manualId && experiment?.sections);
  const visibleStandardSections = isMappedExperiment
    ? standardSections.filter(([sectionKey]) => hasSectionContent(experiment.sections[sectionKey]))
    : standardSections;
  const visibleRecordSections = isMappedExperiment
    ? recordSections.filter(([sectionKey]) => hasSectionContent(experiment.sections[sectionKey]))
    : [];

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
    await saveDraftPatch({ productId, experimentId, patch: { manualId }, openedSection: sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title, allowGuestWorkbookAccess });
  };

  if (!loadedUser) return <ScreenContainer title="Experiment" />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Experiments">
        <Text style={styles.locked}>Experiment content is not available in guest mode.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={experiment?.title || 'Experiment'}>
      {visibleStandardSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}
      {!isMappedExperiment || hasTechnicalData(experiment.sections) ? (
        <AppButton title="Technical Data" onPress={() => navigation.navigate('TechnicalData', { productId, experimentId, manualId, allowGuestWorkbookAccess })} />
      ) : null}
      {visibleRecordSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
