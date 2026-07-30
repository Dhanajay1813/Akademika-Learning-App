import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

export const ANDROID_PDF_CHUNK_SIZE = 64 * 1024;

const pdfJsAsset = require('../../assets/pdfjs/pdf.min.mjs.txt');
const pdfJsWorkerAsset = require('../../assets/pdfjs/pdf.worker.min.mjs.txt');

async function readTextAsset(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('PDFJS_NOT_LOADED');
  return LegacyFileSystem.readAsStringAsync(uri);
}

function buildAndroidPdfViewerHtml({ pdfJsSource, workerSource }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
  <style>
    html, body { margin: 0; width: 100%; min-height: 100%; background: #5f6978; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body { overflow: hidden; }
    #viewer { height: 100vh; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; background: #5f6978; box-sizing: border-box; }
    #pages { width: 100%; min-height: 100vh; box-sizing: border-box; }
    .page-shell { width: 100%; display: flex; justify-content: center; box-sizing: border-box; }
    .page { position: relative; background: #ffffff; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.26); margin: 10px 0; overflow: hidden; }
    .placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 13px; font-weight: 700; background: #f8fafc; }
    canvas { display: block; width: 100%; height: 100%; background: #ffffff; }
  </style>
</head>
<body>
  <div id="viewer"><div id="pages"></div></div>
  <script>
    (function () {
      var pdfJsSource = ${JSON.stringify(pdfJsSource)};
      var workerSource = ${JSON.stringify(workerSource)};
      var pdfjsLib = null;
      var pdfDocument = null;
      var chunks = [];
      var expectedChunks = 0;
      var expectedLength = 0;
      var activeTransferId = '';
      var pageStates = new Map();
      var renderQueue = [];
      var rendering = false;
      var observer = null;
      var zoom = 1;
      var initialFitScale = 1;
      var currentPage = 1;
      var pageMetrics = [];
      var requestedInitialPage = 1;
      var renderedPages = new Set();
      var viewer = document.getElementById('viewer');
      var pagesRoot = document.getElementById('pages');

      function post(message) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }

      function reportError(stage, code, message) {
        post({ type: 'PDF_ERROR', stage: stage, code: code, message: String(message || code) });
      }

      function screenWidth() {
        return document.documentElement.clientWidth || window.innerWidth || 360;
      }

      function horizontalPadding() {
        var width = screenWidth();
        if (width < 360) return 8;
        if (width >= 768) return 24;
        return 12;
      }

      function outputScale() {
        return Math.min(window.devicePixelRatio || 1, 2);
      }

      function base64ToUint8Array(base64) {
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
      }

      function createModuleDataUrl(source) {
        return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
      }

      function createWorkerBlobUrl(source) {
        return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      }

      async function loadPdfJs() {
        try {
          var pdfJsUrl = createModuleDataUrl(pdfJsSource);
          var workerUrl = createWorkerBlobUrl(workerSource);
          pdfjsLib = await import(pdfJsUrl);
          if (!pdfjsLib || !pdfjsLib.getDocument) throw new Error('PDFJS_NOT_LOADED');
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch (error) {
          reportError('PDFJS_SETUP', 'PDFJS_NOT_LOADED', error && error.message);
          return;
        }
        post({ type: 'VIEWER_READY' });
      }

      function resetTransfer(message) {
        activeTransferId = message.transferId;
        expectedChunks = Number(message.totalChunks || 0);
        expectedLength = Number(message.base64Length || 0);
        chunks = new Array(expectedChunks);
        pdfDocument = null;
        renderedPages.clear();
        pageStates.clear();
        renderQueue = [];
        rendering = false;
        currentPage = 1;
        pageMetrics = [];
        requestedInitialPage = Math.max(1, Number(message.initialPage || 1));
        pagesRoot.innerHTML = '';
        post({ type: 'PDF_LOADING' });
      }

      function receiveChunk(message) {
        if (message.transferId !== activeTransferId) return;
        var index = Number(message.index);
        if (!Number.isInteger(index) || index < 0 || index >= expectedChunks) {
          reportError('PDF_TRANSFER', 'CHUNKS_MISSING', 'Invalid chunk index');
          return;
        }
        chunks[index] = String(message.data || '');
        post({ type: 'CHUNK_RECEIVED', transferId: activeTransferId, index: index });
      }

      function verifyChunks() {
        for (var index = 0; index < expectedChunks; index += 1) {
          if (typeof chunks[index] !== 'string') return false;
        }
        return true;
      }

      async function completeTransfer(message) {
        if (message.transferId !== activeTransferId) return;
        try {
          if (!verifyChunks()) throw new Error('CHUNKS_MISSING');
          var joined = chunks.join('');
          if (joined.length !== expectedLength) throw new Error('PDF_INVALID');
          var pdfBytes = base64ToUint8Array(joined);
          if (pdfBytes.length < 5 || pdfBytes[0] !== 37 || pdfBytes[1] !== 80 || pdfBytes[2] !== 68 || pdfBytes[3] !== 70 || pdfBytes[4] !== 45) throw new Error('PDF_INVALID');
          chunks = [];
          var loadingTask = pdfjsLib.getDocument({ data: pdfBytes, useSystemFonts: true });
          pdfDocument = await loadingTask.promise;
          post({ type: 'PDF_LOADED', totalPages: pdfDocument.numPages });
          await preparePages();
          await renderPage(1, true);
          if (requestedInitialPage > 1) goToPage(requestedInitialPage);
          scheduleVisiblePages();
        } catch (error) {
          var code = error && error.message === 'CHUNKS_MISSING' ? 'CHUNKS_MISSING' : (error && error.message === 'PDF_INVALID' ? 'PDF_INVALID' : 'PDF_LOAD_FAILED');
          reportError('PDF_LOAD', code, error && error.message);
        }
      }

      async function preparePages() {
        var firstPage = await pdfDocument.getPage(1);
        var baseViewport = firstPage.getViewport({ scale: 1 });
        var availableWidth = screenWidth() - horizontalPadding() * 2;
        initialFitScale = availableWidth / baseViewport.width;
        zoom = initialFitScale;
        var total = pdfDocument.numPages;
        var fragment = document.createDocumentFragment();
        for (var pageNumber = 1; pageNumber <= total; pageNumber += 1) {
          var metrics = pageNumber === 1 ? baseViewport : null;
          pageMetrics[pageNumber] = metrics;
          var shell = document.createElement('div');
          shell.className = 'page-shell';
          shell.dataset.pageNumber = String(pageNumber);
          shell.style.paddingLeft = horizontalPadding() + 'px';
          shell.style.paddingRight = horizontalPadding() + 'px';
          var pageEl = document.createElement('div');
          pageEl.className = 'page';
          pageEl.dataset.pageNumber = String(pageNumber);
          var width = metrics ? Math.floor(metrics.width * zoom) : Math.floor(availableWidth);
          var height = metrics ? Math.floor(metrics.height * zoom) : Math.floor(availableWidth * 1.3);
          pageEl.style.width = width + 'px';
          pageEl.style.height = height + 'px';
          var placeholder = document.createElement('div');
          placeholder.className = 'placeholder';
          placeholder.textContent = 'Page ' + pageNumber;
          pageEl.appendChild(placeholder);
          shell.appendChild(pageEl);
          fragment.appendChild(shell);
          pageStates.set(pageNumber, { element: pageEl, shell: shell, rendering: false });
        }
        pagesRoot.appendChild(fragment);
        setupObserver();
      }

      function setupObserver() {
        if (observer) observer.disconnect();
        if ('IntersectionObserver' in window) {
          observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              var pageNumber = Number(entry.target.dataset.pageNumber || 0);
              if (entry.isIntersecting) {
                updateCurrentPage(pageNumber);
                enqueuePage(pageNumber);
                enqueuePage(pageNumber + 1);
              }
            });
          }, { root: viewer, rootMargin: '600px 0px', threshold: 0.01 });
          pageStates.forEach(function (state) { observer.observe(state.shell); });
        } else {
          viewer.addEventListener('scroll', scheduleVisiblePages, { passive: true });
        }
        viewer.addEventListener('scroll', function () { releaseDistantCanvases(); updateCurrentPageFromScroll(); }, { passive: true });
      }

      function updateCurrentPage(pageNumber) {
        if (!pageNumber || pageNumber === currentPage) return;
        currentPage = pageNumber;
        post({ type: 'CURRENT_PAGE', pageNumber: currentPage });
      }

      function updateCurrentPageFromScroll() {
        var midpoint = viewer.scrollTop + viewer.clientHeight / 2;
        var closest = currentPage;
        var distance = Infinity;
        pageStates.forEach(function (state, pageNumber) {
          var center = state.shell.offsetTop + state.shell.offsetHeight / 2;
          var nextDistance = Math.abs(center - midpoint);
          if (nextDistance < distance) {
            distance = nextDistance;
            closest = pageNumber;
          }
        });
        updateCurrentPage(closest);
      }

      function scheduleVisiblePages() {
        var top = viewer.scrollTop - 600;
        var bottom = viewer.scrollTop + viewer.clientHeight + 900;
        pageStates.forEach(function (state, pageNumber) {
          if (state.shell.offsetTop < bottom && state.shell.offsetTop + state.shell.offsetHeight > top) enqueuePage(pageNumber);
        });
      }

      function enqueuePage(pageNumber) {
        if (!pdfDocument || pageNumber < 1 || pageNumber > pdfDocument.numPages || renderedPages.has(pageNumber)) return;
        if (renderQueue.indexOf(pageNumber) === -1) renderQueue.push(pageNumber);
        processQueue();
      }

      async function processQueue() {
        if (rendering) return;
        rendering = true;
        while (renderQueue.length) {
          var pageNumber = renderQueue.shift();
          if (!renderedPages.has(pageNumber)) await renderPage(pageNumber, false);
        }
        rendering = false;
      }

      async function renderPage(pageNumber, firstRender) {
        var state = pageStates.get(pageNumber);
        if (!state || state.rendering) return;
        state.rendering = true;
        try {
          var page = await pdfDocument.getPage(pageNumber);
          var baseViewport = page.getViewport({ scale: 1 });
          pageMetrics[pageNumber] = baseViewport;
          var viewport = page.getViewport({ scale: zoom });
          var scale = outputScale();
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d', { alpha: false });
          if (!context) throw new Error('CANVAS_INVALID');
          canvas.width = Math.floor(viewport.width * scale);
          canvas.height = Math.floor(viewport.height * scale);
          canvas.style.width = Math.floor(viewport.width) + 'px';
          canvas.style.height = Math.floor(viewport.height) + 'px';
          state.element.style.width = Math.floor(viewport.width) + 'px';
          state.element.style.height = Math.floor(viewport.height) + 'px';
          await page.render({ canvasContext: context, viewport: viewport, transform: scale !== 1 ? [scale, 0, 0, scale, 0, 0] : null }).promise;
          state.element.innerHTML = '';
          state.element.appendChild(canvas);
          renderedPages.add(pageNumber);
          post({ type: 'PAGE_RENDERED', pageNumber: pageNumber });
          if (firstRender) updateCurrentPage(pageNumber);
        } catch (error) {
          reportError('PAGE_RENDER', error && error.message === 'CANVAS_INVALID' ? 'CANVAS_INVALID' : 'PAGE_RENDER_FAILED', error && error.message);
        } finally {
          state.rendering = false;
        }
      }

      function releaseDistantCanvases() {
        var top = viewer.scrollTop;
        var pageHeight = viewer.clientHeight || 800;
        pageStates.forEach(function (state, pageNumber) {
          if (pageNumber === currentPage || Math.abs(state.shell.offsetTop - top) < pageHeight * 4) return;
          if (!renderedPages.has(pageNumber)) return;
          state.element.innerHTML = '<div class="placeholder">Page ' + pageNumber + '</div>';
          renderedPages.delete(pageNumber);
        });
      }

      function rerenderForZoom(nextZoom) {
        if (!pdfDocument) return;
        zoom = Math.max(initialFitScale * 0.6, Math.min(initialFitScale * 3, nextZoom));
        renderedPages.clear();
        pageStates.forEach(function (state, pageNumber) {
          var metrics = pageMetrics[pageNumber];
          var availableWidth = screenWidth() - horizontalPadding() * 2;
          var width = metrics ? Math.floor(metrics.width * zoom) : Math.floor(availableWidth);
          var height = metrics ? Math.floor(metrics.height * zoom) : Math.floor(availableWidth * 1.3);
          state.shell.style.paddingLeft = horizontalPadding() + 'px';
          state.shell.style.paddingRight = horizontalPadding() + 'px';
          state.element.style.width = width + 'px';
          state.element.style.height = height + 'px';
          state.element.innerHTML = '<div class="placeholder">Page ' + pageNumber + '</div>';
        });
        enqueuePage(currentPage);
        scheduleVisiblePages();
      }

      function fitWidth() {
        if (!pdfDocument || !pageMetrics[1]) return;
        var availableWidth = screenWidth() - horizontalPadding() * 2;
        initialFitScale = availableWidth / pageMetrics[1].width;
        rerenderForZoom(initialFitScale);
      }

      function goToPage(pageNumber) {
        var target = Number(pageNumber || 1);
        if (!pageStates.has(target)) return;
        pageStates.get(target).shell.scrollIntoView();
        enqueuePage(target);
      }

      viewer.addEventListener('dblclick', function () {
        rerenderForZoom(Math.abs(zoom - initialFitScale) < 0.02 ? initialFitScale * 1.75 : initialFitScale);
      });
      window.addEventListener('resize', function () { window.clearTimeout(window.__pdfResizeTimer); window.__pdfResizeTimer = window.setTimeout(fitWidth, 160); });

      function handleNativeMessage(event) {
        var message;
        try { message = JSON.parse(event.data); } catch (error) { return; }
        if (!message || !message.type) return;
        if (message.type === 'PDF_START') resetTransfer(message);
        if (message.type === 'PDF_CHUNK') receiveChunk(message);
        if (message.type === 'PDF_COMPLETE') completeTransfer(message);
        if (message.type === 'SET_ZOOM') rerenderForZoom(initialFitScale * Number(message.scale || 1));
        if (message.type === 'FIT_WIDTH') fitWidth();
        if (message.type === 'GO_TO_PAGE') goToPage(message.pageNumber);
      }

      document.addEventListener('message', handleNativeMessage);
      window.addEventListener('message', handleNativeMessage);
      loadPdfJs();
    }());
  </script>
</body>
</html>`;
}

export default function AndroidEmbeddedPdfViewer({ pdfBase64, fileName, initialPage = 1, reloadKey, onViewerMessage, onError }) {
  const webViewRef = useRef(null);
  const onViewerMessageRef = useRef(onViewerMessage);
  const startedRef = useRef(false);
  const transferRef = useRef({ id: '', chunks: [], nextIndex: 0 });
  const [assetSources, setAssetSources] = useState({ pdfJsSource: '', workerSource: '' });
  const [assetError, setAssetError] = useState('');
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    onViewerMessageRef.current = onViewerMessage;
  }, [onViewerMessage]);

  useEffect(() => {
    let cancelled = false;
    setAssetError('');
    Promise.all([readTextAsset(pdfJsAsset), readTextAsset(pdfJsWorkerAsset)])
      .then(([pdfJsSource, workerSource]) => {
        if (!cancelled) setAssetSources({ pdfJsSource, workerSource });
      })
      .catch((error) => {
        if (!cancelled) {
          const code = String(error?.message || 'PDFJS_NOT_LOADED');
          setAssetError(code);
          onViewerMessageRef.current?.({ type: 'PDF_ERROR', stage: 'PDFJS_ASSET_LOAD', code, message: code });
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    startedRef.current = false;
    transferRef.current = { id: '', chunks: [], nextIndex: 0 };
    setViewerReady(false);
  }, [reloadKey, pdfBase64]);

  const html = useMemo(() => {
    if (!assetSources.pdfJsSource || !assetSources.workerSource) return '';
    return buildAndroidPdfViewerHtml(assetSources);
  }, [assetSources]);

  const postToWebView = useCallback((message) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const sendChunk = useCallback((index) => {
    const transfer = transferRef.current;
    if (!transfer.id || index >= transfer.chunks.length) {
      postToWebView({ type: 'PDF_COMPLETE', transferId: transfer.id });
      return;
    }
    transfer.nextIndex = index;
    postToWebView({ type: 'PDF_CHUNK', transferId: transfer.id, index, data: transfer.chunks[index] });
  }, [postToWebView]);

  const startTransfer = useCallback(() => {
    if (!viewerReady || !pdfBase64 || startedRef.current) return;
    const chunks = [];
    for (let index = 0; index < pdfBase64.length; index += ANDROID_PDF_CHUNK_SIZE) {
      chunks.push(pdfBase64.slice(index, index + ANDROID_PDF_CHUNK_SIZE));
    }
    const transferId = `${Date.now()}-${reloadKey}-${Math.random().toString(36).slice(2)}`;
    transferRef.current = { id: transferId, chunks, nextIndex: 0 };
    startedRef.current = true;
    postToWebView({ type: 'PDF_START', transferId, totalChunks: chunks.length, base64Length: pdfBase64.length, fileName: fileName || 'Akademika_PDF.pdf', initialPage: Number(initialPage || 1) });
    sendChunk(0);
  }, [fileName, initialPage, pdfBase64, postToWebView, reloadKey, sendChunk, viewerReady]);

  useEffect(() => {
    startTransfer();
  }, [startTransfer]);

  const handleWebViewMessage = useCallback((event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      return;
    }
    if (!message?.type) return;
    if (message.type === 'VIEWER_READY') {
      setViewerReady(true);
      onViewerMessage?.(message);
      return;
    }
    if (message.type === 'CHUNK_RECEIVED') {
      onViewerMessage?.(message);
      if (message.transferId === transferRef.current.id) sendChunk(Number(message.index || 0) + 1);
      return;
    }
    onViewerMessage?.(message);
  }, [onViewerMessage, sendChunk]);

  const sendControl = useCallback((message) => {
    postToWebView(message);
  }, [postToWebView]);

  useEffect(() => {
    AndroidEmbeddedPdfViewer.sendControl = sendControl;
    return () => {
      if (AndroidEmbeddedPdfViewer.sendControl === sendControl) AndroidEmbeddedPdfViewer.sendControl = null;
    };
  }, [sendControl]);

  if (assetError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>Unable to Display PDF</Text>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#0B5CAD" />
        <Text style={styles.stateText}>Preparing PDF...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        onMessage={handleWebViewMessage}
        onError={onError}
        onHttpError={onError}
        setSupportMultipleWindows={false}
        overScrollMode="always"
        scalesPageToFit={false}
        style={styles.webview}
      />
    </View>
  );
}

AndroidEmbeddedPdfViewer.sendControl = null;

export function sendAndroidPdfViewerCommand(message) {
  AndroidEmbeddedPdfViewer.sendControl?.(message);
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 1, width: '100%', backgroundColor: '#5f6978' },
  webview: { flex: 1, minHeight: 1, width: '100%', backgroundColor: '#5f6978' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5f6978' },
  stateText: { marginTop: 10, color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
