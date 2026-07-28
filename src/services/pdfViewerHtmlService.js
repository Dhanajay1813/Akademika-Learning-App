const getBundledPdfJsSource = () => require('../vendor/pdfjs/pdfjsSource.generated').PDFJS_MJS_SOURCE;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function buildIosPdfObjectHtml({ pdfBase64 = '', title = 'PDF' } = {}) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
  <style>
    html, body { margin: 0; min-height: 100%; background: #6B7280; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #toolbar { position: sticky; top: 0; z-index: 5; height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 10px; background: #111827; color: white; box-sizing: border-box; }
    #status { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 700; }
    button { min-width: 40px; height: 32px; border: 1px solid #374151; border-radius: 6px; background: #F9FAFB; color: #111827; font-size: 14px; font-weight: 800; }
    #viewport { min-height: calc(100vh - 44px); overflow: auto; -webkit-overflow-scrolling: touch; background: #6B7280; }
    #pageWrap { transform-origin: top center; transition: transform 120ms ease; min-height: calc(100vh - 44px); display: flex; justify-content: center; align-items: flex-start; padding: 10px; box-sizing: border-box; }
    embed, iframe, object { width: 100%; height: calc(100vh - 74px); min-height: 720px; border: 0; background: #FFFFFF; box-shadow: 0 1px 5px rgba(15, 23, 42, 0.25); }
  </style>
</head>
<body>
  <div id="toolbar">
    <button onclick="zoomOut()">-</button>
    <button onclick="fitWidth()">Fit</button>
    <button onclick="zoomIn()">+</button>
    <div id="status">Loading ${safeTitle}...</div>
  </div>
  <div id="viewport">
    <div id="pageWrap">
      <object data="data:application/pdf;base64,${pdfBase64}" type="application/pdf">
        <iframe title="${safeTitle}" src="data:application/pdf;base64,${pdfBase64}"></iframe>
      </object>
    </div>
  </div>
  <script>
    var zoom = 1;
    var status = document.getElementById('status');
    var pageWrap = document.getElementById('pageWrap');
    function applyZoom() { pageWrap.style.transform = 'scale(' + zoom + ')'; status.textContent = Math.round(zoom * 100) + '% - ${safeTitle}'; }
    function zoomIn() { zoom = Math.min(3, zoom + 0.25); applyZoom(); }
    function zoomOut() { zoom = Math.max(0.5, zoom - 0.25); applyZoom(); }
    function fitWidth() { zoom = 1; applyZoom(); }
    document.addEventListener('dblclick', function () { zoom = zoom === 1 ? 1.75 : 1; applyZoom(); });
    setTimeout(function () { status.textContent = '100% - ${safeTitle}'; }, 500);
  </script>
</body>
</html>`;
}

export function buildAndroidPdfJsHtml({ title = 'PDF', pdfJsSource } = {}) {
  const safeTitle = escapeHtml(title);
  const bundledPdfJsSource = pdfJsSource ?? getBundledPdfJsSource();
  const pdfJsModuleSource = JSON.stringify(bundledPdfJsSource || '').replace(/<\//g, '<\\/');
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
  <style>
    html, body { margin: 0; width: 100%; min-height: 100%; background: #6B7280; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
    #viewerRoot { height: 100vh; display: flex; flex-direction: column; background: #6B7280; }
    #viewer { flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch; padding: 10px; box-sizing: border-box; }
    #controls { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; padding: 7px 8px; background: #111827; color: white; box-sizing: border-box; }
    .controlRow { display: flex; gap: 6px; align-items: center; justify-content: center; min-width: 0; }
    .controlButton { min-width: 42px; min-height: 34px; border: 1px solid #374151; border-radius: 6px; background: #F9FAFB; color: #111827; font-size: 13px; font-weight: 900; }
    #pageIndicator, #zoomIndicator { min-width: 82px; text-align: center; font-size: 13px; font-weight: 900; }
    #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; min-height: 100%; }
    .pageShell { max-width: 100%; background: white; box-shadow: 0 1px 5px rgba(15, 23, 42, 0.28); }
    canvas { display: block; background: white; max-width: none; }
    #status { position: fixed; left: 12px; bottom: 12px; z-index: 10; padding: 6px 9px; border-radius: 999px; background: rgba(17, 24, 39, 0.88); color: white; font-size: 12px; font-weight: 800; }
    #error { display: none; margin: 16px; padding: 18px; background: white; border-radius: 8px; line-height: 1.45; font-size: 15px; }
    @media (max-width: 420px) { #controls { flex-direction: column; } .controlRow { width: 100%; } }
    @media (min-width: 700px) { #viewer { padding: 20px; } #controls { padding-left: 20px; padding-right: 20px; } }
  </style>
  <script>
    window.__pdfJsReady = (async function () {
      try {
        var source = ${pdfJsModuleSource};
        if (!source) throw new Error('PDF.js source is missing.');
        var blob = new Blob([source], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var module = await import(url);
        URL.revokeObjectURL(url);
        window.pdfjsLib = module;
        return true;
      } catch (error) {
        window.__pdfJsLoadError = error && error.message ? error.message : 'PDF.js could not be loaded.';
        return false;
      }
    })();
  </script>
</head>
<body>
  <div id="viewerRoot">
    <div id="viewer"><div id="pages"></div><div id="error">Unable to display this PDF.</div></div>
    <div id="controls">
      <div class="controlRow">
        <button class="controlButton" onclick="goPrevious()">Prev</button>
        <span id="pageIndicator">Page 1</span>
        <button class="controlButton" onclick="goNext()">Next</button>
      </div>
      <div class="controlRow">
        <button class="controlButton" onclick="zoomOut()">-</button>
        <span id="zoomIndicator">Fit</span>
        <button class="controlButton" onclick="zoomIn()">+</button>
        <button class="controlButton" onclick="fitWidth()">Fit</button>
      </div>
    </div>
    <div id="status">Preparing ${safeTitle}...</div>
  </div>
  <script>
    (function () {
      var chunks = [];
      var processed = {};
      var expectedChunks = 0;
      var receivedChunks = 0;
      var currentPage = 1;
      var totalPages = 0;
      var pdfDocument = null;
      var renderTasks = {};
      var renderedPages = {};
      var pageShells = {};
      var pageMetrics = {};
      var zoomFactor = 1;
      var MIN_SCALE = 0.25;
      var MAX_SCALE = 5;
      var renderTimer = null;
      var scrollTimer = null;
      var firstPageReported = false;
      var status = document.getElementById('status');
      var pagesEl = document.getElementById('pages');
      var errorEl = document.getElementById('error');
      var viewer = document.getElementById('viewer');
      var pageIndicator = document.getElementById('pageIndicator');
      var zoomIndicator = document.getElementById('zoomIndicator');

      function post(message) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function showError(message) {
        status.textContent = 'Unable to display PDF';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Unable to display this PDF.';
        post({ type: 'PDF_ERROR', message: message || 'Unable to display this PDF.' });
      }

      function setStatus(message) { status.textContent = message; }

      function base64ToUint8Array(base64) {
        var binary = atob(base64);
        var length = binary.length;
        var bytes = new Uint8Array(length);
        for (var i = 0; i < length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }

      function availableWidth() {
        var containerWidth = document.documentElement.clientWidth || window.innerWidth || 1;
        var padding = containerWidth >= 700 ? 40 : 20;
        return Math.max(1, containerWidth - padding);
      }

      function scaleForPage(pageNumber) {
        var metrics = pageMetrics[pageNumber];
        if (!metrics || !metrics.width) return 1;
        var fitScale = availableWidth() / metrics.width;
        return Math.min(Math.max(fitScale * zoomFactor, MIN_SCALE), MAX_SCALE);
      }

      function updateIndicators() {
        pageIndicator.textContent = totalPages ? 'Page ' + currentPage + ' of ' + totalPages : 'Page 1';
        zoomIndicator.textContent = zoomFactor === 1 ? 'Fit' : Math.round(zoomFactor * 100) + '%';
        if (totalPages) setStatus('Page ' + currentPage + ' of ' + totalPages + ' - ' + (zoomFactor === 1 ? 'Fit' : Math.round(zoomFactor * 100) + '%'));
      }

      function applyShellSize(pageNumber) {
        var shell = pageShells[pageNumber];
        var metrics = pageMetrics[pageNumber];
        if (!shell || !metrics) return;
        var scale = scaleForPage(pageNumber);
        shell.style.width = Math.floor(metrics.width * scale) + 'px';
        shell.style.minHeight = Math.floor(metrics.height * scale) + 'px';
      }

      function clearRenderedCanvases() {
        Object.keys(renderTasks).forEach(function (pageNumber) {
          var task = renderTasks[pageNumber];
          if (task && task.cancel) {
            try { task.cancel(); } catch (error) {}
          }
        });
        renderTasks = {};
        Object.keys(renderedPages).forEach(function (pageNumber) {
          var shell = pageShells[pageNumber];
          if (shell) shell.innerHTML = '';
        });
        renderedPages = {};
      }

      function releaseDistantCanvases() {
        Object.keys(renderedPages).forEach(function (pageNumberText) {
          var pageNumber = Number(pageNumberText);
          if (Math.abs(pageNumber - currentPage) <= 2) return;
          var task = renderTasks[pageNumber];
          if (task && task.cancel) {
            try { task.cancel(); } catch (error) {}
          }
          delete renderTasks[pageNumber];
          var shell = pageShells[pageNumber];
          if (shell) shell.innerHTML = '';
          delete renderedPages[pageNumber];
        });
      }

      async function renderPageCanvas(pageNumber) {
        if (!pdfDocument || !pageShells[pageNumber]) return;
        var scale = scaleForPage(pageNumber);
        var renderKey = scale.toFixed(3);
        if (renderedPages[pageNumber] === renderKey) return;
        var oldTask = renderTasks[pageNumber];
        if (oldTask && oldTask.cancel) {
          try { oldTask.cancel(); } catch (error) {}
        }
        var page = await pdfDocument.getPage(pageNumber);
        var viewport = page.getViewport({ scale: scale });
        if (!viewport.width || !viewport.height) throw new Error('Invalid page size.');
        var outputScale = Math.min(window.devicePixelRatio || 1, 2);
        var shell = pageShells[pageNumber];
        shell.innerHTML = '';
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d', { alpha: false });
        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        shell.appendChild(canvas);
        renderTasks[pageNumber] = page.render({ canvasContext: context, viewport: viewport, transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null });
        await renderTasks[pageNumber].promise;
        renderedPages[pageNumber] = renderKey;
        if (!firstPageReported) {
          firstPageReported = true;
          post({ type: 'PAGE_RENDERED', pageNumber: pageNumber });
        }
      }

      function visiblePageNumbers() {
        var viewerRect = viewer.getBoundingClientRect();
        var topLimit = viewerRect.top - 700;
        var bottomLimit = viewerRect.bottom + 900;
        var visible = [];
        var closestPage = currentPage;
        var closestDistance = Infinity;
        for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          var shell = pageShells[pageNumber];
          if (!shell) continue;
          var rect = shell.getBoundingClientRect();
          var distance = Math.abs(rect.top - viewerRect.top - 10);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPage = pageNumber;
          }
          if (rect.bottom >= topLimit && rect.top <= bottomLimit) visible.push(pageNumber);
        }
        currentPage = closestPage;
        updateIndicators();
        post({ type: 'CURRENT_PAGE', pageNumber: currentPage });
        return visible.length ? visible : [currentPage];
      }

      async function renderVisiblePages() {
        try {
          var visible = visiblePageNumbers();
          for (var i = 0; i < visible.length; i += 1) {
            await renderPageCanvas(visible[i]);
          }
          releaseDistantCanvases();
        } catch (error) {
          showError(error && error.message ? error.message : 'Unable to display this PDF.');
        }
      }

      async function buildPageShells() {
        pagesEl.innerHTML = '';
        pageShells = {};
        pageMetrics = {};
        renderedPages = {};
        firstPageReported = false;
        setStatus('Rendering page 1 of ' + totalPages + '...');
        for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          var page = await pdfDocument.getPage(pageNumber);
          var baseViewport = page.getViewport({ scale: 1 });
          pageMetrics[pageNumber] = { width: baseViewport.width, height: baseViewport.height };
          var shell = document.createElement('div');
          shell.className = 'pageShell';
          shell.setAttribute('data-page-number', String(pageNumber));
          pageShells[pageNumber] = shell;
          pagesEl.appendChild(shell);
          applyShellSize(pageNumber);
        }
        updateIndicators();
        await renderVisiblePages();
      }

      function scrollToPage(pageNumber) {
        currentPage = Math.max(1, Math.min(totalPages, pageNumber));
        var shell = pageShells[currentPage];
        if (shell) shell.scrollIntoView({ block: 'start', inline: 'nearest' });
        updateIndicators();
        renderVisiblePages();
      }

      window.goPrevious = function () { if (pdfDocument) scrollToPage(currentPage - 1); };
      window.goNext = function () { if (pdfDocument) scrollToPage(currentPage + 1); };
      window.zoomIn = function () { zoomFactor = Math.min(5, zoomFactor + 0.25); clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); updateIndicators(); renderVisiblePages(); };
      window.zoomOut = function () { zoomFactor = Math.max(1, zoomFactor - 0.25); clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); updateIndicators(); renderVisiblePages(); };
      window.fitWidth = function () { zoomFactor = 1; clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); updateIndicators(); renderVisiblePages(); };

      async function loadPdfFromChunks() {
        try {
          if (!window.pdfjsLib) {
            showError('PDF.js is not available in the WebView bundle.');
            return;
          }
          if (receivedChunks !== expectedChunks) return;
          post({ type: 'PDF_LOADING' });
          setStatus('Loading PDF...');
          var base64 = chunks.join('');
          chunks = [];
          processed = {};
          var bytes = base64ToUint8Array(base64);
          base64 = '';
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          var loadingTask = window.pdfjsLib.getDocument({ data: bytes, disableWorker: true });
          if (loadingTask.onProgress !== undefined) {
            loadingTask.onProgress = function (progress) {
              if (progress && progress.total) setStatus('Loading ' + Math.round((progress.loaded / progress.total) * 100) + '%...');
            };
          }
          pdfDocument = await loadingTask.promise;
          totalPages = pdfDocument.numPages || 0;
          post({ type: 'PDF_LOADED', totalPages: totalPages });
          await buildPageShells();
        } catch (error) {
          showError(error && error.message ? error.message : 'Unable to display this PDF.');
        }
      }

      function handleNativeMessage(event) {
        var message;
        try { message = JSON.parse(event.data); } catch (error) { return; }
        if (!message || !message.type) return;
        if (message.type === 'PDF_START') {
          chunks = new Array(message.totalChunks || 0);
          processed = {};
          expectedChunks = message.totalChunks || 0;
          receivedChunks = 0;
          currentPage = 1;
          totalPages = 0;
          setStatus('Receiving PDF...');
        }
        if (message.type === 'PDF_CHUNK') {
          if (processed[message.index]) return;
          processed[message.index] = true;
          chunks[message.index] = message.data || '';
          receivedChunks += 1;
        }
        if (message.type === 'PDF_COMPLETE') loadPdfFromChunks();
        if (message.type === 'SET_ZOOM') { zoomFactor = Math.min(Math.max(Number(message.scale) || 1, 1), 5); clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); updateIndicators(); renderVisiblePages(); }
        if (message.type === 'FIT_WIDTH') window.fitWidth();
        if (message.type === 'GO_TO_PAGE') scrollToPage(Number(message.pageNumber) || currentPage);
      }

      window.addEventListener('message', handleNativeMessage);
      document.addEventListener('message', handleNativeMessage);
      viewer.addEventListener('scroll', function () { clearTimeout(scrollTimer); scrollTimer = setTimeout(function () { if (pdfDocument) renderVisiblePages(); }, 120); });
      window.addEventListener('resize', function () { clearTimeout(renderTimer); renderTimer = setTimeout(function () { if (pdfDocument) { clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); scrollToPage(currentPage); } }, 180); });
      window.addEventListener('orientationchange', function () { clearTimeout(renderTimer); renderTimer = setTimeout(function () { if (pdfDocument) { clearRenderedCanvases(); for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) applyShellSize(pageNumber); scrollToPage(currentPage); } }, 240); });
      window.addEventListener('unload', function () { clearRenderedCanvases(); if (pdfDocument && pdfDocument.destroy) pdfDocument.destroy(); chunks = []; pageShells = {}; pageMetrics = {}; });
      window.__pdfJsReady.then(function (ready) {
        if (ready && window.pdfjsLib) {
          post({ type: 'VIEWER_READY' });
        } else {
          showError(window.__pdfJsLoadError || 'PDF.js could not be loaded.');
        }
      });
    })();
  </script>
</body>
</html>`;
}
