import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import ManualPageList from '../components/ManualPageList';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getMappedSectionPages } from '../data/manualData';
import { getCurrentUser, getDrafts } from '../storage/storage';
import { hasPlottableTable } from '../utils/graphUtils';
import { isGuestUser } from '../auth/userRole';

export default function ExperimentContentScreen({ route, navigation }) {
  const { productId, experimentId, manualId, sectionKey, title, technical, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const legacyExperiment = manualId ? null : getExperimentById(experimentId);
  const legacyText = technical
    ? legacyExperiment?.sections.technicalData[sectionKey]
    : legacyExperiment?.sections[sectionKey];
  const pageFiles = manualId
    ? getMappedSectionPages(manualId, experimentId, sectionKey, technical)
    : [];
  const isProcedure = sectionKey === 'procedure' && !technical;

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

  const openGraph = async () => {
    const drafts = await getDrafts();
    const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId);
    if (!hasPlottableTable(draft?.table)) {
      Alert.alert('Table data required', 'Please fill table data first.');
      return;
    }
    navigation.navigate('Graph', { productId, experimentId, allowGuestWorkbookAccess });
  };

  const recordTools = isProcedure && !guestBlocked ? (
    <View style={styles.recordSection}>
      <Text style={styles.recordTitle}>Experiment Record</Text>
      <AppButton title="Capture Signal / Your Signal" onPress={() => navigation.navigate('CaptureImage', { productId, experimentId, allowGuestWorkbookAccess })} />
      <AppButton title="Table" onPress={() => navigation.navigate('Table', { productId, experimentId, allowGuestWorkbookAccess })} variant="secondary" />
      <AppButton title="Graph" onPress={openGraph} variant="secondary" />
    </View>
  ) : null;

  if (!loadedUser) return <ScreenContainer title={title || 'Experiment Content'} scroll={false} />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Experiment Content">
        <Text style={styles.locked}>Experiment content is not available in guest mode.</Text>
      </ScreenContainer>
    );
  }

  if (manualId) {
    return (
      <ScreenContainer title={title} scroll={false}>
        <ManualPageList manualId={manualId} pageFiles={pageFiles} />
        <AutoSaveStatus />
        {recordTools}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={title}>
      <View style={styles.placeholder}><Text style={styles.content}>{legacyText || 'Manual content not added yet.'}</Text></View>
      <AutoSaveStatus />
      {recordTools}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: { minHeight: 220, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, justifyContent: 'center', marginBottom: 12 },
  content: { color: colors.text, fontSize: 16, lineHeight: 24 },
  recordSection: { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  recordTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
