import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getProductById } from '../data/products';
import { getCurrentUser, getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
import { generateWorkbookPdf, sharePdf } from '../utils/pdfGenerator';
import { hasFilledTable } from '../utils/graphUtils';

export default function GeneratePDFScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const product = getProductById(productId);
  const experiment = getExperimentById(experimentId);
  const [user, setUser] = useState(null);
  const [draft, setDraft] = useState(null);
  const [journalId, setJournalId] = useState('');

  const load = async () => {
    setUser(await getCurrentUser());
    const drafts = await getDrafts();
    setDraft(drafts.find((item) => item.productId === productId && item.experimentId === experimentId && (!manualId || !item.manualId || item.manualId === manualId)) || {});
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    try {
      const pdfUri = await generateWorkbookPdf({ user, product, experiment, draft: draft || {} });
      const id = `JRN-${Date.now()}`;
      const next = await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId, pdfGenerated: true, pdfUri, journalId: id } });
      setDraft(next);
      setJournalId(id);
    } catch (error) {
      Alert.alert('PDF', 'PDF generation placeholder failed on this device. The flow is ready for Expo Print.');
    }
  };

  const included = [
    'User details',
    'Experiment content/manual pages',
    draft?.openedSections?.includes('referenceSignal') ? 'Reference Signal' : null,
    draft?.capturedImages?.length ? 'Captured Images' : null,
    hasFilledTable(draft?.table) ? 'Table' : null,
    draft?.graph?.generated ? 'Graph' : null,
    draft?.observation ? 'Observation' : null,
    draft?.result ? 'Result' : null,
  ].filter(Boolean);

  if (draft?.pdfGenerated) {
    return (
      <ScreenContainer title="PDF Generated Successfully">
        <Text style={styles.meta}>Journal ID: {draft.journalId || journalId}</Text>
        <AppButton title="View PDF" onPress={() => draft.pdfUri ? Linking.openURL(draft.pdfUri) : null} />
        <AppButton title="Download" onPress={() => Alert.alert('Download', 'PDF is saved locally for MVP.')} variant="secondary" />
        <AppButton title="Share" onPress={() => sharePdf(draft.pdfUri)} variant="secondary" />
        <AppButton title="Go to Workbook" onPress={() => navigation.navigate('Workbook')} />
        <AutoSaveStatus />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Generate Workbook PDF">
      <Text style={styles.meta}>Experiment Name: {experiment.title}</Text>
      <Text style={styles.meta}>Product Name: {product.name}</Text>
      <View style={styles.list}>{included.map((item) => <Text key={item} style={styles.item}>• {item}</Text>)}</View>
      <AppButton title="Generate PDF" onPress={generate} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, marginVertical: 12 },
  item: { color: colors.text, fontSize: 15, marginBottom: 8 },
});
