import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getProductById } from '../data/products';
import { getCurrentUser, getDrafts } from '../storage/storage';
import { getDraftOwnerId, isGuestUser } from '../auth/userRole';
import { applyProgressToDraft } from '../services/experimentProgressService';
import { openOrSavePdf, sharePdf } from '../services/systemPdfService';
import { useAppRefresh } from '../context/AppRefreshContext';

export default function WorkbookScreen({ navigation }) {
  const [tab, setTab] = useState('progress');
  const [drafts, setDrafts] = useState([]);
  const [busyPdfDraftId, setBusyPdfDraftId] = useState('');
  const { refreshVersion, isRefreshing, refreshAppData } = useAppRefresh();

  const loadWorkbook = useCallback(async () => {
    const user = await getCurrentUser();
    if (isGuestUser(user)) {
      navigation.replace('Home');
      return;
    }
    const userId = getDraftOwnerId(user);
    const all = await getDrafts();
    const visibleDrafts = all
      .filter((draft) => !draft.userId || draft.userId === userId)
      .map(applyProgressToDraft);
    setDrafts(visibleDrafts);
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    loadWorkbook();
  }, [loadWorkbook]));

  useEffect(() => {
    if (refreshVersion > 0) loadWorkbook();
  }, [loadWorkbook, refreshVersion]);


  const runWorkbookPdfAction = async (draft, action) => {
    if (busyPdfDraftId) return;
    if (!draft?.pdfUri) {
      Alert.alert('PDF unavailable', 'Generated PDF file is missing.');
      return;
    }
    setBusyPdfDraftId(`${action}:${draft.id}`);
    try {
      const options = { title: 'Open PDF', message: 'Choose Files or another compatible application to open this PDF.' };
      if (action === 'open') {
        await openOrSavePdf(draft.pdfUri, options);
      } else {
        await sharePdf(draft.pdfUri, options);
      }
    } catch (error) {
      Alert.alert('Open PDF', error?.message || 'This device could not open the PDF.');
    } finally {
      setBusyPdfDraftId('');
    }
  };

  const shown = drafts.filter((draft) => (tab === 'completed' ? draft.pdfGenerated : !draft.pdfGenerated));

  return (
    <ScreenContainer title="Workbook" refreshing={isRefreshing} onRefresh={refreshAppData}>
      <View style={styles.tabs}>
        <View style={styles.tab}>
          <AppButton title="In Progress" onPress={() => setTab('progress')} variant={tab === 'progress' ? 'primary' : 'secondary'} />
        </View>
        <View style={styles.tab}>
          <AppButton title="Completed" onPress={() => setTab('completed')} variant={tab === 'completed' ? 'primary' : 'secondary'} />
        </View>
      </View>
      {shown.map((draft) => {
        const product = getProductById(draft.productId);
        const experiment = getExperimentById(draft.experimentId);
        const subtitle = (product?.name || 'Product') + '\n'
          + 'Last saved: ' + (draft.lastSavedAt ? new Date(draft.lastSavedAt).toLocaleString() : 'Not saved') + '\n'
          + 'Progress: ' + (draft.progress || 0) + '%';

        return (
          <AppCard key={draft.id} title={experiment?.title || 'Experiment'} subtitle={subtitle}>
            {tab === 'completed' ? (
              <>
                <Text style={styles.status}>PDF status: Generated</Text>
                <AppButton title={busyPdfDraftId === `open:${draft.id}` ? 'Opening PDF...' : 'Open PDF'} onPress={() => runWorkbookPdfAction(draft, 'open')} disabled={Boolean(busyPdfDraftId)} />
                <AppButton title={busyPdfDraftId === `share:${draft.id}` ? 'Sharing PDF...' : 'Share PDF'} onPress={() => runWorkbookPdfAction(draft, 'share')} variant="secondary" disabled={Boolean(busyPdfDraftId)} />
                <AppButton title="View Details" onPress={() => navigation.navigate('GeneratePDF', { productId: draft.productId, experimentId: draft.experimentId, manualId: draft.manualId || product?.manualId, allowGuestWorkbookAccess: true })} variant="secondary" />
              </>
            ) : (
              <AppButton title="Resume" onPress={() => navigation.navigate('ExperimentMenu', { productId: draft.productId, experimentId: draft.experimentId, manualId: draft.manualId || product?.manualId, allowGuestWorkbookAccess: true })} />
            )}
          </AppCard>
        );
      })}
      {shown.length === 0 ? <Text style={styles.empty}>No workbook items yet.</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tab: { flex: 1 },
  status: { color: colors.success, fontWeight: '700', marginBottom: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
