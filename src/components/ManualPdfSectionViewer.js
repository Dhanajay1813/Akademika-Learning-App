import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppButton from './AppButton';
import { colors } from '../constants/colors';
import { resolveManualPdfUri } from '../services/manualPdfAssetService';
import { prepareManualSectionPdf } from '../services/manualSectionPdfService';
import { sharePdf } from '../services/pdfOpenService';
import { openPdfInsideApp } from '../services/pdfNavigationService';

const sectionPdfOptions = {
  title: 'Open PDF',
  message: 'These mapped manual pages will open as a PDF.',
};

const completeManualOptions = {
  title: 'Open PDF',
  message: 'The complete manual will open as a PDF.',
};

const uniquePages = (pages = []) => {
  const seen = new Set();
  return pages
    .map((page) => Number(page))
    .filter((page) => Number.isInteger(page) && page > 0)
    .filter((page) => {
      if (seen.has(page)) return false;
      seen.add(page);
      return true;
    });
};

function friendlyPdfError(action) {
  if (action === 'prepare') return 'The selected manual pages could not be prepared.';
  return 'This device could not open the system file menu.';
}

export default function ManualPdfSectionViewer({
  manualId,
  experimentId,
  sectionKey,
  pages = [],
  title = 'Manual Pages',
  isCompleteManual = false,
  ListFooterComponent,
}) {
  const navigation = useNavigation();
  const mappedPages = useMemo(() => uniquePages(pages), [pages]);
  const [busyAction, setBusyAction] = useState('');
  const hasMappedPages = mappedPages.length > 0;
  const actionOptions = isCompleteManual ? completeManualOptions : sectionPdfOptions;
  const heading = isCompleteManual ? 'Complete Manual PDF' : 'Manual Pages PDF';
  const message = isCompleteManual ? completeManualOptions.message : sectionPdfOptions.message;
  const primaryLabel = isCompleteManual ? 'Open Complete Manual' : 'Open Section PDF';
  const shareLabel = isCompleteManual ? 'Share / Save Manual' : 'Share / Save Section';

  const resolvePdfForAction = async () => {
    if (isCompleteManual) return resolveManualPdfUri(manualId);
    return prepareManualSectionPdf({ manualId, experimentId, sectionKey: sectionKey || title, pages: mappedPages });
  };

  const runPdfAction = async (action) => {
    if (busyAction) return;
    setBusyAction(action === 'open' ? 'open' : 'share');
    try {
      const uri = await resolvePdfForAction();
      setBusyAction(action === 'open' ? 'opening-menu' : 'sharing');
      const options = { title, fileName: isCompleteManual ? `${manualId || 'manual'}.pdf` : `${manualId || 'manual'}_${sectionKey || title}.pdf` };
      if (action === 'open') {
        await openPdfInsideApp(navigation, uri, { ...options, title: isCompleteManual ? (title || 'Complete Manual') : `${title || 'Section'} PDF` });
      } else {
        await sharePdf(uri, actionOptions);
      }
    } catch (error) {
      Alert.alert(actionOptions.title, error?.message || friendlyPdfError(action === 'open' && !isCompleteManual ? 'prepare' : action));
    } finally {
      setBusyAction('');
    }
  };

  if (!hasMappedPages) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>Manual content not added yet.</Text>
        {ListFooterComponent}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>{heading}</Text>
        <Text style={styles.message}>{message}</Text>
        {!isCompleteManual ? (
          <Text style={styles.detail}>{mappedPages.length} mapped page{mappedPages.length === 1 ? '' : 's'} will be prepared for {title}.</Text>
        ) : null}
        {busyAction === 'open' || busyAction === 'share' ? <Text style={styles.status}>Preparing PDF...</Text> : null}
        {busyAction === 'opening-menu' ? <Text style={styles.status}>Opening PDF...</Text> : null}
        {busyAction === 'sharing' ? <Text style={styles.status}>Sharing PDF...</Text> : null}
        <View style={styles.actions}>
          <AppButton title={primaryLabel} onPress={() => runPdfAction('open')} disabled={Boolean(busyAction)} />
          <AppButton title={shareLabel} onPress={() => runPdfAction('share')} variant="secondary" disabled={Boolean(busyAction)} />
        </View>
      </View>
      {ListFooterComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 18 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 10 },
  message: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  status: { color: colors.primary, fontSize: 14, fontWeight: '800', lineHeight: 20, marginBottom: 8 },
  actions: { marginTop: 6 },
  messageBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
});
