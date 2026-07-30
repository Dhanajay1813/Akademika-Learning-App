import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildIosPdfObjectHtml } from '../../services/pdfViewerHtmlService';

export default function ExpoPdfViewer({ pdfUri, pdfBase64, title, reloadKey, onViewerMessage, onError }) {
  const onViewerMessageRef = useRef(onViewerMessage);
  const html = useMemo(
    () => buildIosPdfObjectHtml({ pdfBase64, title }),
    [pdfBase64, title, reloadKey]
  );
  const source = pdfUri ? { uri: pdfUri } : { html };

  useEffect(() => {
    onViewerMessageRef.current = onViewerMessage;
  }, [onViewerMessage]);

  useEffect(() => {
    if (pdfBase64) {
      onViewerMessageRef.current?.({ type: 'PDF_LOADED', totalPages: 1 });
      onViewerMessageRef.current?.({ type: 'PAGE_RENDERED', pageNumber: 1 });
    }
  }, [pdfBase64, reloadKey]);

  const notifyLoaded = () => {
    if (!pdfUri) return;
    onViewerMessageRef.current?.({ type: 'PDF_LOADED', totalPages: 1 });
    onViewerMessageRef.current?.({ type: 'PAGE_RENDERED', pageNumber: 1 });
  };

  return (
    <View style={styles.root}>
      <WebView
        key={reloadKey}
        originWhitelist={['*']}
        source={source}
        javaScriptEnabled
        domStorageEnabled={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.centerState}>
            <ActivityIndicator color="#0B5CAD" />
            <Text style={styles.stateText}>Preparing PDF...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>Unable to Display PDF</Text>
          </View>
        )}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs={false}
        scalesPageToFit
        onLoadEnd={notifyLoaded}
        onError={onError}
        onHttpError={onError}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 1, width: '100%', backgroundColor: '#6B7280' },
  webview: { flex: 1, minHeight: 1, width: '100%', backgroundColor: '#6B7280' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B7280' },
  stateText: { marginTop: 10, color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
