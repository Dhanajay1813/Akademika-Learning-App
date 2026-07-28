import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import AppButton from '../AppButton';
import { colors } from '../../constants/colors';
import { resolveManualPdfUri } from '../../services/manualPdfAssetService';

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

export default function NativeManualPdfViewer({ manualId, pages = [], title = 'Manual Pages', ListFooterComponent }) {
  const insets = useSafeAreaInsets();
  const pdfRef = useRef(null);
  const mappedPages = useMemo(() => uniquePages(pages), [pages]);
  const [pdfUri, setPdfUri] = useState('');
  const [mappedIndex, setMappedIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(mappedPages.length));
  const [error, setError] = useState('');
  const currentPage = mappedPages[mappedIndex] || 0;

  useEffect(() => {
    let active = true;
    setError('');
    if (!manualId || !mappedPages.length) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    resolveManualPdfUri(manualId)
      .then((uri) => {
        if (!active) return;
        setPdfUri(uri);
        setLoading(false);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError?.message || 'Manual PDF could not be opened.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [manualId, mappedPages.length]);

  useEffect(() => {
    if (pdfRef.current && currentPage) {
      pdfRef.current.setPage(currentPage);
    }
  }, [currentPage, pdfUri]);

  const goToMappedIndex = (nextIndex) => {
    const bounded = Math.max(0, Math.min(mappedPages.length - 1, nextIndex));
    setMappedIndex(bounded);
  };

  if (!mappedPages.length) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>Manual content not added yet.</Text>
        {ListFooterComponent}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.messageBox} accessibilityLabel={`Loading ${title}`}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.messageText}>Loading manual PDF...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.errorText}>{error}</Text>
        {ListFooterComponent}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.viewerHeader}>
        <Text style={styles.pageStatus}>
          Mapped page {mappedIndex + 1} of {mappedPages.length} - Manual page {currentPage}
        </Text>
      </View>
      <View style={styles.pdfFrame}>
        <Pdf
          ref={pdfRef}
          source={{ uri: pdfUri }}
          page={currentPage}
          singlePage
          enablePaging={false}
          enableDoubleTapZoom
          fitPolicy={0}
          minScale={1}
          maxScale={5}
          spacing={0}
          trustAllCerts={false}
          onPageChanged={(page) => {
            if (page !== currentPage && pdfRef.current) pdfRef.current.setPage(currentPage);
          }}
          onError={(nextError) => setError(nextError?.message || 'Manual PDF could not be displayed.')}
          style={styles.pdf}
        />
      </View>
      <View style={styles.controls}>
        <AppButton title="Previous" onPress={() => goToMappedIndex(mappedIndex - 1)} variant="secondary" disabled={mappedIndex === 0} />
        <AppButton title="Next" onPress={() => goToMappedIndex(mappedIndex + 1)} variant="secondary" disabled={mappedIndex >= mappedPages.length - 1} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageStrip}>
        {mappedPages.map((page, index) => (
          <Pressable
            key={`${page}-${index}`}
            onPress={() => goToMappedIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`Open mapped page ${index + 1}, manual page ${page}`}
            style={[styles.pageChip, index === mappedIndex && styles.pageChipActive]}
          >
            <Text style={[styles.pageChipText, index === mappedIndex && styles.pageChipTextActive]}>{page}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {ListFooterComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  viewerHeader: { paddingHorizontal: 4, paddingBottom: 8 },
  pageStatus: { color: colors.text, fontSize: 14, fontWeight: '800' },
  pdfFrame: { flex: 1, minHeight: 360, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  pdf: { flex: 1, width: '100%', height: '100%', backgroundColor: colors.surface },
  controls: { paddingTop: 8 },
  pageStrip: { gap: 8, paddingVertical: 8 },
  pageChip: { minWidth: 42, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pageChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  pageChipText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  pageChipTextActive: { color: '#FFFFFF' },
  messageBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  errorText: { color: colors.danger || '#B42318', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
