import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import ExpoPdfViewer from '../components/pdf/ExpoPdfViewer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { openPdfExternally, resolvePdfFile, shareOrSavePdf } from '../services/systemPdfService';

const MAX_PREVIEW_BYTES = 28 * 1024 * 1024;

export default function PdfPreviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { pdfUri, title = 'PDF', fileName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [pdfFileUri, setPdfFileUri] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [externalOpening, setExternalOpening] = useState(false);

  const screenTitle = useMemo(() => String(title || fileName || 'PDF'), [title, fileName]);

  const loadPdf = async () => {
    let active = true;
    setLoading(true);
    setError('');
    setPdfBase64('');
    try {
      const file = await resolvePdfFile(pdfUri, { title: screenTitle, fileName });
      if (!active) return;
      if (Number(file.size || 0) > MAX_PREVIEW_BYTES) {
        setPdfFileUri(file.uri);
        setError('This PDF is too large for direct preview. Use Share / Save to open it through the phone’s file system.');
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      if (!active) return;
      setPdfFileUri(file.uri);
      setPdfBase64(base64);
    } catch (nextError) {
      if (!active) return;
      setError(nextError?.message || 'Unable to preview this PDF inside the app.');
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setPdfBase64('');
      try {
        const file = await resolvePdfFile(pdfUri, { title: screenTitle, fileName });
        if (cancelled) return;
        if (Number(file.size || 0) > MAX_PREVIEW_BYTES) {
          setPdfFileUri(file.uri);
          setError('This PDF is too large for direct preview. Use Share / Save to open it through the phone’s file system.');
          return;
        }
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        if (cancelled) return;
        setPdfFileUri(file.uri);
        setPdfBase64(base64);
      } catch (nextError) {
        if (!cancelled) setError(nextError?.message || 'Unable to preview this PDF inside the app.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setPdfBase64('');
    };
  }, [fileName, pdfUri, screenTitle]);

  const share = async () => {
    if (sharing) return;
    try {
      setSharing(true);
      await shareOrSavePdf(pdfFileUri || pdfUri, { title: screenTitle, fileName });
    } catch (nextError) {
      Alert.alert('Share / Save', nextError?.message || 'This device could not open the system file menu.');
    } finally {
      setSharing(false);
    }
  };

  const openExternal = async () => {
    if (externalOpening) return;
    try {
      setExternalOpening(true);
      await openPdfExternally(pdfFileUri || pdfUri, { title: screenTitle, fileName });
    } catch (nextError) {
      Alert.alert('Open Externally', nextError?.message || 'This device could not open the PDF.');
    } finally {
      setExternalOpening(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.headerButton}><Text style={styles.headerButtonText}>Back</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <Pressable accessibilityRole="button" onPress={share} disabled={sharing} style={styles.headerButton}><Text style={styles.headerButtonText}>{sharing ? 'Saving...' : 'Share / Save'}</Text></Pressable>
      </View>
      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.help}>Preparing PDF...</Text></View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to preview this PDF inside the app.</Text>
            <Text style={styles.errorText}>{error}</Text>
            <AppButton title="Try Again" onPress={loadPdf} />
            <AppButton title="Share / Save" onPress={share} variant="secondary" disabled={sharing} />
            {Platform.OS === 'android' ? <AppButton title="Open Externally" onPress={openExternal} variant="secondary" disabled={externalOpening} /> : null}
            <AppButton title="Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        ) : (
          <ExpoPdfViewer pdfBase64={pdfBase64} title={screenTitle} onError={() => setError('Unable to preview this PDF inside the app.')} />
        )}
      </View>
      {!loading && !error && Platform.OS === 'android' ? (
        <View style={styles.footer}><AppButton title={externalOpening ? 'Opening...' : 'Open Externally'} onPress={openExternal} variant="secondary" disabled={externalOpening} /></View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  headerButtonText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  headerTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  body: { flex: 1, minHeight: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  help: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  errorCard: { margin: 16, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 8 },
  errorText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  footer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
