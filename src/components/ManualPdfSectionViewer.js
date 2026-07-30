import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import ExpoPdfViewer from './pdf/ExpoPdfViewer';
import AndroidEmbeddedPdfViewer from './pdf/AndroidEmbeddedPdfViewer';
import { colors } from '../constants/colors';
import { prepareManualSectionPdf } from '../services/manualSectionPdfService';

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

async function readPdfBase64(uri) {
  const file = new File(uri);
  if (!file.exists || !Number(file.size || 0)) throw new Error('The selected manual pages could not be prepared.');
  if (typeof file.base64 === 'function') return file.base64();
  return LegacyFileSystem.readAsStringAsync(uri, { encoding: LegacyFileSystem.EncodingType.Base64 });
}

export default function ManualPdfSectionViewer({
  manualId,
  experimentId,
  sectionKey,
  pages = [],
  title = 'Manual Pages',
  ListFooterComponent,
}) {
  const { height: windowHeight } = useWindowDimensions();
  const mappedPages = useMemo(() => uniquePages(pages), [pages]);
  const pageKey = useMemo(() => mappedPages.join(','), [mappedPages]);
  const [pdfUri, setPdfUri] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState('Loading manual pages...');
  const hasMappedPages = mappedPages.length > 0;

  useEffect(() => {
    let active = true;

    async function loadMappedPages() {
      if (!hasMappedPages || !manualId) return;
      setLoading(true);
      setError('');
      setStatus('Loading manual pages...');
      setPdfUri('');
      setPdfBase64('');
      setReloadKey((key) => key + 1);

      try {
        const uri = await prepareManualSectionPdf({ manualId, experimentId, sectionKey: sectionKey || title, pages: mappedPages });
        if (!active) return;
        setPdfUri(uri);
        if (Platform.OS === 'android') {
          setStatus('Preparing manual pages...');
          const base64 = await readPdfBase64(uri);
          if (!active) return;
          setPdfBase64(base64);
        }
        setStatus('Rendering manual pages...');
      } catch (nextError) {
        if (!active) return;
        setError(nextError?.message || 'The selected manual pages could not be displayed.');
        setLoading(false);
      }
    }

    loadMappedPages();
    return () => { active = false; };
  }, [experimentId, hasMappedPages, manualId, pageKey, sectionKey, title]);


  const handleViewerMessage = (message) => {
    if (!message?.type) return;
    if (message.type === 'VIEWER_READY' || message.type === 'PDF_LOADING') setStatus('Loading document...');
    if (message.type === 'PDF_LOADED') setStatus(`Rendering page 1 of ${Number(message.totalPages || 1)}...`);
    if (message.type === 'PAGE_RENDERED') {
      setLoading(false);
      setError('');
    }
    if (message.type === 'PDF_ERROR') {
      setLoading(false);
      setError('The selected manual pages could not be displayed.');
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
      <View style={[styles.viewerWrap, { height: Math.max(320, windowHeight * 0.62) }]}>
        {error ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : null}
        {!error && Platform.OS === 'android' && pdfBase64 ? (
          <AndroidEmbeddedPdfViewer
            pdfBase64={pdfBase64}
            fileName={`${manualId || 'manual'}_${sectionKey || title}.pdf`}
            reloadKey={reloadKey}
            onViewerMessage={handleViewerMessage}
            onError={() => handleViewerMessage({ type: 'PDF_ERROR' })}
          />
        ) : null}
        {!error && Platform.OS !== 'android' && pdfUri ? (
          <ExpoPdfViewer
            pdfUri={pdfUri}
            title={title}
            reloadKey={reloadKey}
            onViewerMessage={handleViewerMessage}
            onError={() => handleViewerMessage({ type: 'PDF_ERROR' })}
          />
        ) : null}
        {!error && loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.status}>{status}</Text>
          </View>
        ) : null}
      </View>
      {ListFooterComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  viewerWrap: { backgroundColor: '#eef2f7', borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.background },
  status: { color: colors.muted, fontSize: 15, fontWeight: '800', lineHeight: 22, marginTop: 10, textAlign: 'center' },
  messageBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
