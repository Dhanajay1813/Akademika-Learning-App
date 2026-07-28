import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildAndroidPdfJsHtml, buildIosPdfObjectHtml } from '../../services/pdfViewerHtmlService';

const CHUNK_SIZE = 384 * 1024;

export default function ExpoPdfViewer({ pdfBase64, title, reloadKey, onViewerMessage, onError }) {
  const webViewRef = useRef(null);
  const readyRef = useRef(false);
  const sentKeyRef = useRef('');
  const android = Platform.OS === 'android';
  const html = useMemo(
    () => (android ? buildAndroidPdfJsHtml({ title }) : buildIosPdfObjectHtml({ pdfBase64, title })),
    [android, android ? null : pdfBase64, title, reloadKey]
  );

  const sendMessage = (message) => {
    const script = `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(message))} })); true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  const sendPdfChunks = () => {
    if (!android || !readyRef.current || !pdfBase64) return;
    const sendKey = `${reloadKey}:${pdfBase64.length}`;
    if (sentKeyRef.current === sendKey) return;
    sentKeyRef.current = sendKey;
    const totalChunks = Math.ceil(pdfBase64.length / CHUNK_SIZE);
    sendMessage({ type: 'PDF_START', totalChunks, fileName: title || 'PDF' });
    for (let index = 0; index < totalChunks; index += 1) {
      sendMessage({ type: 'PDF_CHUNK', index, data: pdfBase64.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE) });
    }
    sendMessage({ type: 'PDF_COMPLETE' });
  };

  useEffect(() => {
    readyRef.current = false;
    sentKeyRef.current = '';
  }, [reloadKey]);

  useEffect(() => {
    sendPdfChunks();
  }, [pdfBase64, reloadKey]);

  const handleMessage = (event) => {
    let message = null;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      return;
    }
    if (message?.type === 'VIEWER_READY') {
      readyRef.current = true;
      sendPdfChunks();
    }
    onViewerMessage?.(message);
  };

  return (
    <View style={styles.root}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
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
            <Text style={styles.stateText}>Unable to display this PDF.</Text>
          </View>
        )}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        scalesPageToFit
        onMessage={handleMessage}
        onError={onError}
        onHttpError={onError}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: '#6B7280' },
  webview: { flex: 1, backgroundColor: '#6B7280' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B7280' },
  stateText: { marginTop: 10, color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
