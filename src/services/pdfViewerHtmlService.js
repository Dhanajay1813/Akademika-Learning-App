const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function buildPdfViewerHtml({ pdfBase64 = '', title = 'PDF' } = {}) {
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
    #error { display: none; margin: 18px; padding: 18px; background: #FFFFFF; border-radius: 8px; line-height: 1.45; font-size: 15px; }
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
      <object id="pdfObject" data="data:application/pdf;base64,${pdfBase64}" type="application/pdf">
        <iframe id="pdfFrame" title="${safeTitle}" src="data:application/pdf;base64,${pdfBase64}"></iframe>
      </object>
    </div>
    <div id="error">Unable to preview this PDF inside the app.</div>
  </div>
  <script>
    var zoom = 1;
    var status = document.getElementById('status');
    var pageWrap = document.getElementById('pageWrap');
    var lastTap = 0;
    function applyZoom() { pageWrap.style.transform = 'scale(' + zoom + ')'; status.textContent = Math.round(zoom * 100) + '% - ${safeTitle}'; }
    function zoomIn() { zoom = Math.min(3, zoom + 0.25); applyZoom(); }
    function zoomOut() { zoom = Math.max(0.5, zoom - 0.25); applyZoom(); }
    function fitWidth() { zoom = 1; applyZoom(); }
    document.addEventListener('dblclick', function () { zoom = zoom === 1 ? 1.75 : 1; applyZoom(); });
    document.addEventListener('touchend', function () { var now = Date.now(); if (now - lastTap < 280) { zoom = zoom === 1 ? 1.75 : 1; applyZoom(); } lastTap = now; });
    setTimeout(function () { status.textContent = '100% - ${safeTitle}'; }, 500);
  </script>
</body>
</html>`;
}
