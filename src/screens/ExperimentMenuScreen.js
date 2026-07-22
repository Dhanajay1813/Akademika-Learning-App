import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { getCurrentUser, getDrafts } from '../storage/storage';
import { getDraftOwnerId, isGuestUser } from '../auth/userRole';
import { calculateExperimentProgress, hasValidContent } from '../services/experimentProgressService';
import { buildReportContentList } from '../services/experimentPdfService';
import { useAppRefresh } from '../context/AppRefreshContext';

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

const findDraft = (drafts, productId, manualId, experimentId, userId) => drafts.find((draft) => {
  const sameExperiment = draft.productId === productId && draft.experimentId === experimentId;
  const sameManual = manualId ? (!draft.manualId || draft.manualId === manualId) : true;
  return sameExperiment && sameManual && (!draft.userId || draft.userId === userId);
});

const hasTechnicalData = (sections) => (
  sections?.technicalData
    ? Object.values(sections.technicalData).some(hasValidContent)
    : false
);

export default function ExperimentMenuScreen({ route, navigation }) {
  const { productId, experimentId, manualId, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [progress, setProgress] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const { refreshVersion } = useAppRefresh();
  const experiment = getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId);
  const isMappedExperiment = Boolean(manualId && experiment?.sections);
  const visibleStandardSections = isMappedExperiment
    ? standardSections.filter(([sectionKey]) => hasValidContent(experiment.sections[sectionKey]))
    : standardSections;
  const visibleRecordSections = isMappedExperiment
    ? recordSections.filter(([sectionKey]) => hasValidContent(experiment.sections[sectionKey]))
    : [];

  const refreshProgress = useCallback(async () => {
    const user = await getCurrentUser();
    const userId = getDraftOwnerId(user);
    const drafts = await getDrafts();
    const draft = findDraft(drafts, productId, manualId, experimentId, userId) || { productId, manualId, experimentId };
    setCurrentDraft(draft);
    setProgress(calculateExperimentProgress({ productId, manualId: draft.manualId || manualId, experimentId, draft }));
    return user;
  }, [experimentId, manualId, productId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await refreshProgress();
      if (!active) return;
      setGuestBlocked(isGuestUser(user) && !allowGuestWorkbookAccess);
      setLoadedUser(true);
    })();
    return () => { active = false; };
  }, [allowGuestWorkbookAccess, refreshProgress]));

  useEffect(() => {
    if (refreshVersion > 0 && loadedUser) refreshProgress();
  }, [loadedUser, refreshProgress, refreshVersion]);

  const open = async (sectionKey, title, technical = false) => {
    if (guestBlocked) return;
    await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId }, openedSection: technical ? `technical:${sectionKey}` : sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title, technical, allowGuestWorkbookAccess });
  };

  const openPendingItem = (item) => {
    setDetailsOpen(false);
    if (item.type === 'section') {
      open(item.sectionKey, item.label, item.technical);
      return;
    }
    if (item.key === 'activity:capture') navigation.navigate('CaptureImage', { productId, experimentId, manualId, allowGuestWorkbookAccess });
    else if (item.key === 'activity:table') navigation.navigate('Table', { productId, experimentId, manualId, allowGuestWorkbookAccess });
    else if (item.key === 'activity:graph') navigation.navigate('Graph', { productId, experimentId, manualId, allowGuestWorkbookAccess });
  };

  if (!loadedUser) return <ScreenContainer title="Experiment" />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Experiments">
        <Text style={styles.locked}>Experiment content is not available in guest mode.</Text>
      </ScreenContainer>
    );
  }

  const completedCount = progress?.completedCount || 0;
  const totalCount = progress?.totalCount || 0;
  const percentage = progress?.percentage || 0;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const reportItems = buildReportContentList({ manualId, experiment, draft: currentDraft || { productId, manualId, experimentId }, completionDetails: progress });

  return (
    <ScreenContainer title={experiment?.title || 'Experiment'}>
      <View style={styles.progressCard} accessibilityLabel={`Experiment progress ${percentage} percent`}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressPercent}>{percentage}%</Text>
          <Text style={styles.progressCount}>{completedCount} of {totalCount} items completed</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.progressStatus} accessibilityLabel={remainingCount === 1 ? 'One completion item remaining' : progress?.statusText}>
          {totalCount === 0 ? 'No completion requirements are available' : percentage === 100 ? 'Experiment Completed ✓' : `${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} remaining`}
        </Text>
        <AppButton title="View Pending Items" onPress={() => setDetailsOpen(true)} variant="secondary" accessibilityLabel="View pending experiment items" />
        {percentage === 100 ? (
          <>
            <AppButton title="Generate Complete Experiment PDF" accessibilityLabel="Generate complete experiment PDF" onPress={() => navigation.navigate('GeneratePDF', { productId, experimentId, manualId })} />
            <AppButton title="Preview Report Contents" onPress={() => setReportPreviewOpen(true)} variant="secondary" />
          </>
        ) : null}
      </View>

      {visibleStandardSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}
      {!isMappedExperiment || hasTechnicalData(experiment.sections) ? (
        <AppButton title="Technical Data" onPress={() => navigation.navigate('TechnicalData', { productId, experimentId, manualId, allowGuestWorkbookAccess })} />
      ) : null}
      {visibleRecordSections.map(([sectionKey, title]) => (
        <AppButton key={sectionKey} title={title} onPress={() => open(sectionKey, title)} />
      ))}

      <Modal visible={reportPreviewOpen} transparent animationType="fade" onRequestClose={() => setReportPreviewOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReportPreviewOpen(false)}>
          <Pressable style={styles.detailsCard} onPress={() => {}}>
            <Text style={styles.detailsTitle}>Report Contents</Text>
            <ScrollView style={styles.detailsScroll}>
              {reportItems.map((item) => <Text key={item} style={styles.completedItem}>✓ {item}</Text>)}
            </ScrollView>
            <AppButton title="Generate PDF" accessibilityLabel="Generate complete experiment PDF" onPress={() => { setReportPreviewOpen(false); navigation.navigate('GeneratePDF', { productId, experimentId, manualId }); }} />
            <AppButton title="Cancel" onPress={() => setReportPreviewOpen(false)} variant="secondary" />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsOpen(false)}>
          <Pressable style={styles.detailsCard} onPress={() => {}}>
            <Text style={styles.detailsTitle}>Experiment Progress</Text>
            <Text style={styles.detailsMeta}>{completedCount} of {totalCount} items completed</Text>
            <Text style={styles.detailsPercent}>{percentage}%</Text>
            <ScrollView style={styles.detailsScroll}>
              <Text style={styles.groupTitle}>Completed</Text>
              {progress?.completedItems?.length ? progress.completedItems.map((item) => (
              <Text key={item.key} style={styles.completedItem}>✓ {item.completeLabel}</Text>
            )) : <Text style={styles.emptyItem}>No items completed yet.</Text>}
            <Text style={styles.groupTitle}>Pending</Text>
              {progress?.pendingItems?.length ? progress.pendingItems.map((item) => (
              <Pressable key={item.key} style={styles.pendingRow} onPress={() => openPendingItem(item)} accessibilityRole="button" accessibilityLabel={`${item.pendingLabel}. Open item.`}>
                <Text style={styles.pendingItem}>○ {item.pendingLabel}</Text>
              </Pressable>
            )) : <Text style={styles.completedItem}>✓ Experiment Completed</Text>}
            </ScrollView>
            <AppButton title="Close" onPress={() => setDetailsOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  progressCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 8, padding: 14, marginBottom: 14 },
  progressHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  progressPercent: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  progressCount: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  progressStatus: { color: colors.muted, fontSize: 14, marginTop: 10, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  detailsCard: { maxHeight: '88%', backgroundColor: colors.background, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
  detailsScroll: { maxHeight: 420 },
  detailsTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  detailsMeta: { color: colors.text, fontSize: 15, fontWeight: '700' },
  detailsPercent: { color: colors.primary, fontSize: 26, fontWeight: '900', marginVertical: 8 },
  groupTitle: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  completedItem: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  pendingRow: { minHeight: 36, justifyContent: 'center' },
  pendingItem: { color: colors.text, fontSize: 15, lineHeight: 22 },
  emptyItem: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
