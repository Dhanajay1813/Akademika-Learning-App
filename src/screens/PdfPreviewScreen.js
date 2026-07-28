import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExpoPdfViewer from '../components/pdf/ExpoPdfViewer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { openPdfExternally, resolvePdfFile, shareOrSavePdf } from '../services/systemPdfService';

const MAX_PREVIEW_BYTES = 28 * 1024 * 1024;

export default function PdfPreviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { pdfUri, title = 'PDF', fileName } = route.params || {};
  const loadIdRef = useRef(0);
  const timeoutRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Preparing PDF...');
  const [pdfFileUri, setPdfFileUri] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [externalOpening, setExternalOpening] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const screenTitle = useMemo(() => String(title || fileName || 'PDF'), [title, fileName]);
  const compactHeader = width < 390;

  const clearRenderTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const beginRenderTimeout = () => {
    clearRenderTimeout();
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Unable to display this PDF.');
    }, 18000);
  };

  const loadPdf = async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    clearRenderTimeout();
    setLoading(true);
    setStatus('Preparing PDF...');
    setError('');
    setPdfBase64('');
    setCurrentPage(0);
    setTotalPages(0);
    setReloadKey((key) => key + 1);
    try {
      const file = await resolvePdfFile(pdfUri, { title: screenTitle, fileName });
      if (loadIdRef.current !== loadId) return;
      if (!Number(file.size || 0)) throw new Error('The PDF file could not be found. Please generate it again.');
      if (Number(file.size || 0) > MAX_PREVIEW_BYTES) {
        setPdfFileUri(file.uri);
        setError('This PDF is too large for direct preview. Use Share / Save to open it through the phone’s file system.');
        setLoading(false);
        return;
      }
      const base64 = typeof file.base64 === 'function' ? await file.base64() : '';
      if (!base64) throw new Error('Unable to preview this PDF inside the app.');
      if (loadIdRef.current !== loadId) return;
      setPdfFileUri(file.uri);
      setPdfBase64(base64);
      if (Platform.OS === 'android') {
        setStatus('Preparing PDF...');
        beginRenderTimeout();
      } else {
        setStatus('Opening PDF...');
        setLoading(false);
      }
    } catch (nextError) {
      if (loadIdRef.current !== loadId) return;
      setError(nextError?.message || 'Unable to preview this PDF inside the app.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdf();
    return () => {
      loadIdRef.current += 1;
      clearRenderTimeout();
    };
  }, [fileName, pdfUri, screenTitle]);

  const handleWebViewError = () => {
    clearRenderTimeout();
    setLoading(false);
    setError('Unable to display this PDF.');
  };

  const handleViewerMessage = (message) => {
    if (!message?.type) return;
    if (message.type === 'VIEWER_READY') setStatus('Preparing PDF...');
    if (message.type === 'PDF_LOADING') setStatus('Loading PDF...');
    if (message.type === 'PDF_LOADED') {
      setTotalPages(Number(message.totalPages || 0));
      setStatus(`Rendering page 1 of ${message.totalPages || 1}...`);
    }
    if (message.type === 'PAGE_RENDERED') {
      clearRenderTimeout();
      setCurrentPage(Number(message.pageNumber || 1));
      setLoading(false);
      setError('');
    }
    if (message.type === 'CURRENT_PAGE') setCurrentPage(Number(message.pageNumber || 1));
    if (message.type === 'PDF_ERROR') {
      clearRenderTimeout();
      setLoading(false);
      setError('Unable to display this PDF.');
    }
  };

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
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.headerButton}><Text style={styles.headerButtonText}>{compactHeader ? '<' : 'Back'}</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <Pressable accessibilityRole="button" onPress={share} disabled={sharing} style={styles.headerButton}><Text style={styles.headerButtonText}>{compactHeader ? 'Save' : (sharing ? 'Saving...' : 'Share / Save')}</Text></Pressable>
      </View>
      <View style={styles.body}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to preview this PDF inside the app.</Text>
            <Text style={styles.errorText}>{error}</Text>
            <AppButton title="Try Again" onPress={loadPdf} />
            <AppButton title="Share / Save" onPress={share} variant="secondary" disabled={sharing} />
            {Platform.OS === 'android' ? <AppButton title="Open Externally" onPress={openExternal} variant="secondary" disabled={externalOpening} /> : null}
            <AppButton title="Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        ) : (
          <>
            <ExpoPdfViewer pdfBase64={pdfBase64} title={screenTitle} reloadKey={reloadKey} onViewerMessage={handleViewerMessage} onError={handleWebViewError} />
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.help}>{status}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      {!error && Platform.OS === 'android' ? (
        <View style={[styles.controls, width < 430 && styles.controlsCompact]}>
          <Text style={styles.pageText}>{totalPages ? `Page ${currentPage || 1} of ${totalPages}` : 'Page 1'}</Text>
          <AppButton title={externalOpening ? 'Opening...' : 'Open Externally'} onPress={openExternal} variant="secondary" disabled={externalOpening} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  headerButtonText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  headerTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  body: { flex: 1, minHeight: 0 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.background },
  help: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  errorCard: { margin: 16, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 8 },
  errorText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  controls: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  controlsCompact: { paddingHorizontal: 8 },
  pageText: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
});
