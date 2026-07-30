import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExpoPdfViewer from '../components/pdf/ExpoPdfViewer';
import AndroidEmbeddedPdfViewer, { sendAndroidPdfViewerCommand } from '../components/pdf/AndroidEmbeddedPdfViewer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { isInvalidPdfPreviewUri, openPdfExternally, resolveLocalPdfFile, sharePdf } from '../services/pdfOpenService';

const PDF_NOT_AVAILABLE_TITLE = 'PDF Not Available';
const PDF_NOT_AVAILABLE_MESSAGE = 'The PDF file could not be found or is invalid. Please generate it again.';
const RENDER_ERROR_TITLE = 'Unable to Display PDF';
const RENDER_ERROR_MESSAGE = 'The PDF could not be rendered inside the app.';
const PDF_SOURCE_FIELDS = ['pdfUri', 'uri', 'fileUri', 'localUri', 'generatedPdfUri', 'reportUri', 'pdfPath', 'filePath', 'path'];

function createCodedError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizePdfSource(source) {
  if (typeof source === 'string') return source.trim();
  if (!source || typeof source !== 'object') return '';
  const candidates = [
    source?.pdfUri,
    source?.uri,
    source?.fileUri,
    source?.localUri,
    source?.generatedPdfUri,
    source?.reportUri,
    source?.pdfPath,
    source?.filePath,
    source?.path,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

function getSourceFieldsFound(source) {
  if (!source || typeof source !== 'object') return [];
  return PDF_SOURCE_FIELDS.filter((field) => typeof source[field] === 'string' && source[field].trim().length > 0);
}

function selectRoutePdfSource(params = {}) {
  const directSources = ['pdfUri', 'uri', 'fileUri', 'localUri', 'generatedPdfUri', 'reportUri', 'pdfPath', 'filePath', 'path']
    .map((field) => ({ source: params[field], container: field }));
  const sources = [
    { source: params.pdfSource, container: 'pdfSource' },
    { source: params.report, container: 'report' },
    { source: params.journal, container: 'journal' },
    ...directSources,
    { source: params, container: 'route.params' },
  ];
  const selected = sources.find(({ source }) => typeof source === 'number' || Boolean(normalizePdfSource(source)));
  return selected || { source: '', container: 'none' };
}

function getUriScheme(uri) {
  if (typeof uri !== 'string') return '';
  const match = uri.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  return match ? match[1] : 'path';
}

function sourceType(source) {
  if (typeof source === 'number') return 'staticAsset';
  if (typeof source === 'string') return 'string';
  if (source && typeof source === 'object') return 'object';
  return typeof source;
}

function logPdfWarning(stage, source, uri, extra = {}) {
  if (!__DEV__) return;
  console.warn('[PDF Preview]', {
    platform: Platform.OS,
    sourceType: sourceType(source),
    sourceFieldsFound: getSourceFieldsFound(source),
    uriScheme: getUriScheme(uri),
    hasUri: Boolean(uri),
    isStaticAsset: typeof source === 'number',
    stage,
    ...extra,
  });
}

function logPdfFileSystemDiagnostic(stage, source, uri, details = {}) {
  if (!__DEV__) return;
  console.warn('[PDF Preview FS]', {
    platform: Platform.OS,
    sourceType: sourceType(source),
    sourceFieldsFound: getSourceFieldsFound(source),
    uriScheme: getUriScheme(uri),
    hasUri: Boolean(uri),
    isStaticAsset: typeof source === 'number',
    stage,
    ...details,
  });
}

function normalizePdfBase64(base64) {
  return String(base64 || '')
    .replace(/^data:application\/pdf;base64,/i, '')
    .replace(/\s/g, '');
}

function decodedPdfBytes(base64, maxBytes = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const input = normalizePdfBase64(base64).slice(0, Math.ceil(maxBytes / 3) * 4);
  const bytes = [];
  for (let index = 0; index < input.length && bytes.length < maxBytes; index += 4) {
    const enc1 = chars.indexOf(input.charAt(index));
    const enc2 = chars.indexOf(input.charAt(index + 1));
    const enc3 = chars.indexOf(input.charAt(index + 2));
    const enc4 = chars.indexOf(input.charAt(index + 3));
    if (enc1 < 0 || enc2 < 0) break;
    bytes.push((enc1 << 2) | (enc2 >> 4));
    if (enc3 >= 0 && enc3 !== 64 && bytes.length < maxBytes) bytes.push(((enc2 & 15) << 4) | (enc3 >> 2));
    if (enc4 >= 0 && enc4 !== 64 && bytes.length < maxBytes) bytes.push(((enc3 & 3) << 6) | enc4);
  }
  return bytes;
}

function decodedPdfHeader(base64) {
  return decodedPdfBytes(base64, 5).map((byte) => String.fromCharCode(byte)).join('');
}

function pdfHeaderDiagnostic(base64) {
  const bytes = decodedPdfBytes(base64, 12);
  return {
    byteHeader: bytes.slice(0, 8),
    asciiHeader: bytes.map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join(''),
    startsPdf: bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45,
  };
}

async function resolveStaticPdfAsset(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  return asset.localUri || asset.uri || '';
}

export default function PdfPreviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = route.params || {};
  const { title = 'PDF', fileName, initialPage = 1 } = params;
  const loadIdRef = useRef(0);
  const timeoutRef = useRef(null);
  const [originalPdfSource, setOriginalPdfSource] = useState(null);
  const [pdfFileUri, setPdfFileUri] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState(RENDER_ERROR_TITLE);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Preparing PDF...');
  const [sharing, setSharing] = useState(false);
  const [openingExternal, setOpeningExternal] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [devErrorCode, setDevErrorCode] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [zoomRatio, setZoomRatio] = useState(1);
  const [pageInfo, setPageInfo] = useState({ currentPage: Number(initialPage || 1), totalPages: 0 });

  const screenTitle = useMemo(() => String(title || fileName || 'PDF'), [title, fileName]);
  const compactHeader = width < 390;
  const showCompactControls = width < 430 || height < 560;
  const isAndroid = Platform.OS === 'android';

  const clearRenderTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const beginRenderTimeout = (stage = 'PDF_RENDER_TIMEOUT') => {
    clearRenderTimeout();
    timeoutRef.current = setTimeout(() => {
      const diagnosticPayload = { code: stage, name: 'TimeoutError' };
      logPdfWarning(stage, originalPdfSource, pdfFileUri, diagnosticPayload);
      setLoading(false);
      setDevErrorCode(stage);
      setErrorTitle(RENDER_ERROR_TITLE);
      setError(RENDER_ERROR_MESSAGE);
    }, Platform.OS === 'ios' ? 18000 : 22000);
  };

  const readPdfBase64 = async (file) => {
    setStatus('Preparing PDF...');
    if (typeof file.base64 === 'function') return file.base64();
    return LegacyFileSystem.readAsStringAsync(file.uri, { encoding: LegacyFileSystem.EncodingType.Base64 });
  };

  const assertValidPdfBase64 = (base64) => {
    const normalized = normalizePdfBase64(base64);
    if (!normalized) throw createCodedError('PDF_INVALID', PDF_NOT_AVAILABLE_MESSAGE);
    if (decodedPdfHeader(normalized) !== '%PDF-') throw createCodedError('PDF_INVALID', PDF_NOT_AVAILABLE_MESSAGE);
    return normalized;
  };

  const showFriendlyMissingPdfState = (source, uri, code = 'PDF_INVALID') => {
    setDevErrorCode(code);
    setErrorTitle(PDF_NOT_AVAILABLE_TITLE);
    setError(PDF_NOT_AVAILABLE_MESSAGE);
    setLoading(false);
    logPdfWarning('PDF_VALIDATION', source, uri, { code });
  };

  const loadPdfForIos = async ({ source }) => {
    let resolvedUri = '';
    try {
      resolvedUri = typeof source === 'number' ? await resolveStaticPdfAsset(source) : normalizePdfSource(source);
      if (!resolvedUri) {
        showFriendlyMissingPdfState(source, resolvedUri, 'PDF_INVALID');
        return;
      }
      setPdfFileUri(resolvedUri);
      setPdfBase64('');
      setStatus('Preparing PDF...');
      setPageInfo((current) => ({ ...current, totalPages: 0 }));
      logPdfWarning('IOS_SOURCE_READY', source, resolvedUri);
      beginRenderTimeout('IOS_RENDER_TIMEOUT');
    } catch (nextError) {
      showFriendlyMissingPdfState(source, resolvedUri, nextError?.code || 'PDF_INVALID');
    }
  };

  const loadPdfForAndroid = async ({ source }) => {
    let normalizedUri = '';
    try {
      normalizedUri = typeof source === 'number' ? await resolveStaticPdfAsset(source) : normalizePdfSource(source);
      if (!normalizedUri || isInvalidPdfPreviewUri(normalizedUri)) throw createCodedError('PDF_INVALID', PDF_NOT_AVAILABLE_MESSAGE);
      const file = await resolveLocalPdfFile(normalizedUri, { title: screenTitle, fileName });
      logPdfFileSystemDiagnostic('RESOLVED_LOCAL_FILE', source, normalizedUri, {
        resolvedUriScheme: getUriScheme(file?.uri),
        exists: Boolean(file?.exists),
        size: Number(file?.size || 0),
      });
      if (!file.exists || !Number(file.size || 0)) throw createCodedError('PDF_INVALID', PDF_NOT_AVAILABLE_MESSAGE);
      const localFile = new File(file.uri);
      logPdfFileSystemDiagnostic('MODERN_FILE_READY', source, file.uri, {
        exists: Boolean(localFile.exists),
        size: Number(localFile.size || 0),
      });
      if (!localFile.exists || !Number(localFile.size || 0)) throw createCodedError('PDF_INVALID', PDF_NOT_AVAILABLE_MESSAGE);
      const base64 = await readPdfBase64(localFile);
      logPdfFileSystemDiagnostic('BASE64_READ', source, file.uri, {
        exists: Boolean(localFile.exists),
        size: Number(localFile.size || 0),
        hasBase64: Boolean(base64),
        base64Length: String(base64 || '').length,
        ...pdfHeaderDiagnostic(base64),
      });
      const validBase64 = assertValidPdfBase64(base64);
      setPdfFileUri(file.uri);
      setPdfBase64(validBase64);
      setStatus('Loading document...');
      beginRenderTimeout('PDF_RENDER_TIMEOUT');
    } catch (nextError) {
      const code = nextError?.code || nextError?.message || 'PDF_LOAD_FAILED';
      showFriendlyMissingPdfState(source, normalizedUri, String(code));
    }
  };

  const loadPdf = async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    clearRenderTimeout();
    setLoading(true);
    setStatus('Preparing PDF...');
    setError('');
    setErrorTitle(RENDER_ERROR_TITLE);
    setDevErrorCode('');
    setPdfFileUri('');
    setPdfBase64('');
    setRetrying(true);
    setZoomRatio(1);
    setPageInfo({ currentPage: Number(initialPage || 1), totalPages: 0 });
    setReloadKey((key) => key + 1);

    const selectedSource = selectRoutePdfSource(params);
    setOriginalPdfSource(selectedSource.source);
    const normalizedSource = typeof selectedSource.source === 'number' ? 'static-asset' : normalizePdfSource(selectedSource.source);

    try {
      if (!selectedSource.source && !normalizedSource) {
        showFriendlyMissingPdfState(selectedSource.source, '');
        return;
      }
      logPdfWarning('PDF_SOURCE_SELECTED', selectedSource.source, normalizedSource === 'static-asset' ? '' : normalizedSource, { container: selectedSource.container });
      if (Platform.OS === 'ios') {
        await loadPdfForIos(selectedSource);
        return;
      }
      await loadPdfForAndroid(selectedSource);
    } finally {
      if (loadIdRef.current === loadId) setRetrying(false);
    }
  };

  useEffect(() => {
    loadPdf();
    return () => {
      loadIdRef.current += 1;
      clearRenderTimeout();
      setPdfBase64('');
    };
  }, [params, screenTitle, initialPage]);

  const currentPdfSource = pdfFileUri || originalPdfSource || params.pdfUri || params.pdfSource;

  const share = async () => {
    if (sharing) return;
    try {
      setSharing(true);
      await sharePdf(currentPdfSource, { title: screenTitle, fileName, dialogTitle: 'Share or save PDF' });
    } catch (nextError) {
      Alert.alert('Share / Save', nextError?.message || 'This device could not open the system file menu.');
    } finally {
      setSharing(false);
    }
  };

  const openExternal = async () => {
    if (openingExternal) return;
    try {
      setOpeningExternal(true);
      await openPdfExternally(currentPdfSource, { title: screenTitle, fileName });
    } catch (nextError) {
      Alert.alert('Open Externally', nextError?.message || 'No compatible application could open this PDF.');
    } finally {
      setOpeningExternal(false);
    }
  };

  const handleViewerMessage = (message) => {
    if (!message?.type) return;
    if (message.type === 'VIEWER_READY') setStatus('Loading document...');
    if (message.type === 'PDF_LOADING') setStatus('Loading document...');
    if (message.type === 'PDF_LOADED') {
      const totalPages = Number(message.totalPages || 0);
      setPageInfo((current) => ({ ...current, totalPages }));
      setStatus(`Rendering page 1 of ${totalPages || 1}...`);
    }
    if (message.type === 'PAGE_RENDERED') {
      clearRenderTimeout();
      setLoading(false);
      setError('');
      setPageInfo((current) => ({ ...current, currentPage: Number(message.pageNumber || current.currentPage || 1) }));
    }
    if (message.type === 'CURRENT_PAGE') {
      setPageInfo((current) => ({ ...current, currentPage: Number(message.pageNumber || current.currentPage || 1) }));
    }
    if (message.type === 'PDF_ERROR') {
      clearRenderTimeout();
      setLoading(false);
      const code = message.code || 'PDF_RENDER_FAILED';
      logPdfWarning(message.stage || 'PDF_RENDER', originalPdfSource, pdfFileUri, { code });
      setDevErrorCode(code);
      setErrorTitle(RENDER_ERROR_TITLE);
      setError(RENDER_ERROR_MESSAGE);
    }
  };

  const changeZoom = (nextRatio) => {
    const bounded = Math.max(0.6, Math.min(3, nextRatio));
    setZoomRatio(bounded);
    sendAndroidPdfViewerCommand({ type: 'SET_ZOOM', scale: bounded });
  };

  const fitWidth = () => {
    setZoomRatio(1);
    sendAndroidPdfViewerCommand({ type: 'FIT_WIDTH' });
  };

  const goBack = () => navigation.goBack();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <View style={[styles.header, compactHeader && styles.headerCompact]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>{compactHeader ? '<' : 'Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="middle">{screenTitle}</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Share or save PDF" onPress={share} disabled={sharing} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{compactHeader ? 'Save' : (sharing ? 'Saving...' : 'Share / Save')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open PDF externally" onPress={openExternal} disabled={openingExternal} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{compactHeader ? 'Open' : (openingExternal ? 'Opening...' : 'Open Externally')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {error ? (
          <View style={styles.center}>
            <View style={[styles.errorCard, { maxWidth: Math.min(width - 32, 460) }]}> 
              <Text style={styles.errorTitle}>{errorTitle}</Text>
              <Text style={styles.errorText}>{error}</Text>
              {__DEV__ && devErrorCode ? <Text style={styles.devCode}>{devErrorCode}</Text> : null}
              <AppButton title={retrying ? 'Preparing PDF...' : 'Try Again'} onPress={loadPdf} disabled={retrying} />
              <AppButton title="Share / Save" onPress={share} variant="secondary" disabled={sharing} />
              <AppButton title="Open Externally" onPress={openExternal} variant="secondary" disabled={openingExternal} />
              <AppButton title="Back" onPress={goBack} variant="secondary" />
            </View>
          </View>
        ) : (
          <>
            {isAndroid ? (
              <AndroidEmbeddedPdfViewer
                pdfBase64={pdfBase64}
                fileName={fileName}
                initialPage={initialPage}
                reloadKey={reloadKey}
                onViewerMessage={handleViewerMessage}
                onError={() => handleViewerMessage({ type: 'PDF_ERROR', stage: 'WEBVIEW', code: 'PDF_LOAD_FAILED', message: 'WebView failed to load.' })}
              />
            ) : (
              <ExpoPdfViewer pdfUri={pdfFileUri} title={screenTitle} reloadKey={reloadKey} onViewerMessage={handleViewerMessage} onError={() => handleViewerMessage({ type: 'PDF_ERROR', stage: 'IOS_VIEWER', code: 'PDF_LOAD_FAILED', message: 'iOS preview failed to load.' })} />
            )}
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.help}>{status}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {!error ? (
        <View style={[styles.controls, showCompactControls && styles.controlsCompact]}>
          <Text style={styles.pageText}>{pageInfo.totalPages ? `Page ${pageInfo.currentPage || 1} of ${pageInfo.totalPages}` : 'Loading page information...'}</Text>
          {isAndroid ? (
            <View style={styles.zoomControls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => changeZoom(zoomRatio - 0.25)} style={styles.controlButton}>
                <Text style={styles.controlButtonText}>-</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Fit width" onPress={fitWidth} style={styles.fitButton}>
                <Text style={styles.controlButtonText}>Fit Width</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => changeZoom(zoomRatio + 0.25)} style={styles.controlButton}>
                <Text style={styles.controlButtonText}>+</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerCompact: { gap: 4, paddingHorizontal: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  headerButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  headerButtonText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  headerTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  body: { flex: 1, minHeight: 0, width: '100%', backgroundColor: '#eef2f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.background },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.background },
  help: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  errorCard: { width: '100%', borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 8 },
  errorText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  devCode: { color: colors.primary, fontSize: 12, fontWeight: '900', marginBottom: 12 },
  controls: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, minHeight: 52, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  controlsCompact: { paddingHorizontal: 8 },
  pageText: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  zoomControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  controlButton: { minWidth: 44, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  fitButton: { minHeight: 44, minWidth: 96, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  controlButtonText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
});
