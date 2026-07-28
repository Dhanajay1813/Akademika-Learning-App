import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildPdfViewerHtml } from '../../services/pdfViewerHtmlService';

export default function ExpoPdfViewer({ pdfBase64, title, onError }) {
  const html = useMemo(() => buildPdfViewerHtml({ pdfBase64, title }), [pdfBase64, title]);
  return (
    <View style={styles.root}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        scalesPageToFit
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
});
