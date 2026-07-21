import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment, getMappedManual } from '../data/manualData';
import { getProductById } from '../data/products';
import { getCurrentUser, getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
import { buildReportContentList, generateCompleteExperimentPdf, sharePdf } from '../services/experimentPdfService';
import { calculateExperimentProgress } from '../services/experimentProgressService';

const sameDraft = (item, productId, manualId, experimentId) => (
  item.productId === productId && item.experimentId === experimentId && (!manualId || !item.manualId || item.manualId === manualId)
);

export default function GeneratePDFScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const product = getProductById(productId);
  const manual = getMappedManual(manualId || product?.manualId);
  const experiment = getMappedExperiment(manual?.manualId, experimentId) || getExperimentById(experimentId);
  const [user, setUser] = useState(null);
  const [draft, setDraft] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [journalId, setJournalId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastError, setLastError] = useState('');

  const load = async () => {
    const currentUser = await getCurrentUser();
    const drafts = await getDrafts();
    const selectedDraft = drafts.find((item) => sameDraft(item, productId, manual?.manualId || manualId, experimentId)) || { productId, manualId: manual?.manualId || manualId, experimentId };
    const details = calculateExperimentProgress({ productId, manualId: selectedDraft.manualId || manual?.manualId || manualId, experimentId, draft: selectedDraft });
    setUser(currentUser);
    setDraft(selectedDraft);
    setCompletion(details);
    return { currentUser, selectedDraft, details };
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLastError('');
    const loaded = await load();
    const currentUser = loaded?.currentUser || user;
    const currentDraft = loaded?.selectedDraft || draft || { productId, manualId: manual?.manualId || manualId, experimentId };
    const currentCompletion = loaded?.details || calculateExperimentProgress({ productId, manualId: currentDraft.manualId || manual?.manualId || manualId, experimentId, draft: currentDraft });
    setCompletion(currentCompletion);
    if (currentCompletion.percentage !== 100) {
      Alert.alert('Complete pending items', 'Complete the pending experiment items before generating the report.');
      return;
    }
    try {
      setGenerating(true);
      const result = await generateCompleteExperimentPdf({ user: currentUser, product, manual, experiment, studentRecord: currentDraft, completionDetails: currentCompletion });
      const id = `JRN-${Date.now()}`;
      const next = await saveDraftPatch({ productId, experimentId, manualId: currentDraft.manualId || manual?.manualId || manualId, patch: { manualId: currentDraft.manualId || manual?.manualId || manualId, pdfGenerated: true, pdfUri: result.uri, pdfFilename: result.filename, journalId: id } });
      setDraft(next);
      setJournalId(id);
      Alert.alert('PDF ready', 'Complete experiment report was generated.');
    } catch (error) {
      setLastError(error?.message || 'PDF generation could not be completed.');
      Alert.alert('PDF', 'PDF generation could not be completed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const reportItems = buildReportContentList({ manualId: manual?.manualId || manualId, experiment, draft: draft || {}, completionDetails: completion });
  const complete = completion?.percentage === 100;

  if (draft?.pdfGenerated) {
    return (
      <ScreenContainer title="PDF Generated Successfully">
        <Text style={styles.meta}>Journal ID: {draft.journalId || journalId}</Text>
        {draft.pdfFilename ? <Text style={styles.meta}>File: {draft.pdfFilename}</Text> : null}
        <AppButton title="Open PDF" accessibilityLabel="Open generated experiment PDF" onPress={() => draft.pdfUri ? Linking.openURL(draft.pdfUri) : null} />
        <AppButton title="Share PDF" accessibilityLabel="Share generated experiment PDF" onPress={() => sharePdf(draft.pdfUri)} variant="secondary" />
        <AppButton title="Generate Again" onPress={generate} variant="secondary" disabled={generating || !complete} />
        <AppButton title="Go to Workbook" onPress={() => navigation.navigate('Workbook')} />
        <AutoSaveStatus />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Complete Experiment PDF">
      <Text style={styles.meta}>Experiment Name: {experiment?.title || 'Experiment'}</Text>
      <Text style={styles.meta}>Product Name: {product?.name || 'Product'}</Text>
      <Text style={complete ? styles.completed : styles.pending}>{completion?.percentage || 0}% complete</Text>
      {!complete ? <Text style={styles.help}>Complete the pending experiment items before generating the report.</Text> : null}
      <View style={styles.list}>
        <Text style={styles.listTitle}>This report will include:</Text>
        {reportItems.map((item) => <Text key={item} style={styles.item}>✓ {item}</Text>)}
      </View>
      {generating ? <Text style={styles.help} accessibilityLabel="Preparing complete experiment report">Preparing complete experiment report…</Text> : null}
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
      <AppButton title="Generate Complete Experiment PDF" accessibilityLabel={complete ? 'Generate complete experiment PDF' : 'Complete the pending experiment items before generating the report'} onPress={generate} disabled={!complete || generating} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  completed: { color: colors.success, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  pending: { color: colors.muted, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  help: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  error: { color: colors.danger || '#B42318', fontSize: 14, lineHeight: 21, marginBottom: 10 },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, marginVertical: 12 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  item: { color: colors.text, fontSize: 15, marginBottom: 8, lineHeight: 21 },
});
