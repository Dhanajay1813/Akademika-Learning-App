import { Component, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import AppButton from './AppButton';
import { colors } from '../constants/colors';
import { resolveManualPdfUri } from '../services/manualPdfAssetService';
import { openPdfFile } from '../services/pdfOpenService';
import { sharePdf } from '../services/experimentPdfService';

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

// appOwnership is deprecated for general environment detection, but it remains
// the narrow compatibility check we need here: identifying Expo Go specifically.
const isExpoGo = Constants.appOwnership === 'expo';

let NativeManualPdfViewer = null;
let nativeViewerLoadFailed = false;

if (!isExpoGo) {
  try {
    NativeManualPdfViewer = require('./pdf/NativeManualPdfViewer').default;
  } catch (error) {
    nativeViewerLoadFailed = true;
  }
}

class ManualPdfErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ManualPdfFallback({ manualId, pages = [], title = 'Manual Pages', ListFooterComponent, reason }) {
  const navigation = useNavigation();
  const mappedPages = useMemo(() => uniquePages(pages), [pages]);
  const [busyAction, setBusyAction] = useState('');
  const hasMappedPages = mappedPages.length > 0;

  const runPdfAction = async (action) => {
    if (busyAction) return;
    setBusyAction(action);
    try {
      const uri = await resolveManualPdfUri(manualId);
      if (action === 'open') {
        await openPdfFile(uri);
      } else {
        await sharePdf(uri);
      }
    } catch (error) {
      Alert.alert('PDF is not available', 'The manual PDF could not be opened from this app. Please try again from the Akademika development or installed app.');
    } finally {
      setBusyAction('');
    }
  };

  if (!mappedPages.length) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>Manual content not added yet.</Text>
        {ListFooterComponent}
      </View>
    );
  }

  return (
    <View style={styles.fallbackRoot}>
      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackTitle}>PDF Preview Requires the Akademika Development App</Text>
        <Text style={styles.fallbackText}>
          This manual is stored as a PDF. The in-app PDF viewer requires the Akademika development or installed app and is not available inside Expo Go.
        </Text>
        <Text style={styles.fallbackText}>
          Mapped in-app viewing is available in the Akademika development or production build. Opening externally will show the complete PDF, not only the mapped pages for {title}.
        </Text>
        {reason ? <Text style={styles.fallbackNote}>{reason}</Text> : null}
        <View style={styles.fallbackActions}>
          <AppButton title={busyAction === 'open' ? 'Opening PDF...' : 'Open PDF'} onPress={() => runPdfAction('open')} disabled={!hasMappedPages || Boolean(busyAction)} />
          <AppButton title={busyAction === 'share' ? 'Sharing PDF...' : 'Share PDF'} onPress={() => runPdfAction('share')} variant="secondary" disabled={!hasMappedPages || Boolean(busyAction)} />
          <AppButton title="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
      {ListFooterComponent}
    </View>
  );
}

export default function ManualPdfSectionViewer(props) {
  const nativeFailureMessage = 'The in-app PDF preview could not be loaded. You can still open or share the manual PDF.';
  const fallback = (
    <ManualPdfFallback
      {...props}
      reason={nativeViewerLoadFailed ? nativeFailureMessage : ''}
    />
  );
  const runtimeFailureFallback = (
    <ManualPdfFallback
      {...props}
      reason={nativeFailureMessage}
    />
  );

  if (isExpoGo || !NativeManualPdfViewer) {
    return fallback;
  }

  return (
    <ManualPdfErrorBoundary fallback={runtimeFailureFallback}>
      <NativeManualPdfViewer {...props} />
    </ManualPdfErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallbackRoot: { flex: 1, minHeight: 0 },
  fallbackCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 18 },
  fallbackTitle: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 10 },
  fallbackText: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  fallbackNote: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  fallbackActions: { marginTop: 6 },
  messageBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
});
