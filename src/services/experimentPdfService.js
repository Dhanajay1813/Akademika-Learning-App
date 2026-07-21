import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getSubmittedManualImageSource } from '../content/contentRegistry';
import { getMappedExperiment, getMappedManual } from '../data/manualData';
import { getExperimentById } from '../data/experiments';
import { getProductCategoryById } from '../data/products';
import { calculateExperimentProgress } from './experimentProgressService';
import { resolvePdfImageDataUri, getSignalImageSource } from './pdfImageService';
import { getNumericPairs, hasFilledTable } from '../utils/graphUtils';

const PRE_TECHNICAL_SECTION_ORDER = [
  ['objective', 'Objective'],
  ['theory', 'Theory'],
  ['functionalBlock', 'Functional Block'],
  ['procedure', 'Procedure'],
];

const POST_TECHNICAL_SECTION_ORDER = [
  ['observation', 'Observation Instructions'],
  ['equipments', 'Equipments'],
  ['result', 'Result Guidance'],
  ['conclusion', 'Conclusion Guidance'],
];

const SECTION_ORDER = [...PRE_TECHNICAL_SECTION_ORDER, ...POST_TECHNICAL_SECTION_ORDER];
const TECHNICAL_ORDER = [
  ['datasheet', 'Datasheet'],
  ['blockDiagram', 'Block Diagram'],
  ['circuitDiagram', 'Circuit Diagram'],
  ['referenceSignal', 'Reference Signal'],
];

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

function safeFilePart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'experiment';
}

function imageWarning(label) {
  return `<div class="image-warning">${escapeHtml(label || 'Image')} could not be included.</div>`;
}

function imageVariantForSection(sectionKey) {
  if (['functionalBlock', 'datasheet', 'blockDiagram', 'circuitDiagram', 'referenceSignal'].includes(sectionKey)) return 'diagram';
  if (sectionKey === 'observation') return 'document-page';
  return 'photo';
}

function reportImageHtml(dataUri, caption, alt, variant = 'photo') {
  if (!dataUri) return imageWarning(alt || caption || 'Image');
  const captionHtml = hasText(caption) ? `<div class="image-caption">${escapeHtml(caption)}</div>` : '';
  return `<div class="pdf-image pdf-image--${variant} keep-together"><img src="${dataUri}" alt="${escapeHtml(alt || caption || 'Experiment image')}"/>${captionHtml}</div>`;
}

function imageItemsFromBlock(block) {
  const files = Array.isArray(block?.imageFiles) && block.imageFiles.length
    ? block.imageFiles
    : block?.imageFile
      ? [block.imageFile]
      : [];
  return files
    .map((item) => (typeof item === 'string' ? { imageFile: item, caption: block?.caption || '' } : { ...item, caption: item?.caption || block?.caption || '' }))
    .filter((item) => hasText(item.imageFile));
}

function allSectionGroups(sections = {}) {
  return [
    ...SECTION_ORDER.map(([key, label]) => ({ key, label, blocks: sections[key] })),
    ...TECHNICAL_ORDER.map(([key, label]) => ({ key, label, technical: true, blocks: sections.technicalData?.[key] })),
  ];
}

function collectManualImageItems(sections = {}) {
  const images = [];
  allSectionGroups(sections).forEach((section) => {
    if (!Array.isArray(section.blocks)) return;
    section.blocks.forEach((block) => {
      if (block?.type !== 'image') return;
      imageItemsFromBlock(block).forEach((item) => {
        images.push({ ...item, sectionLabel: section.label });
      });
    });
  });
  return images;
}

async function prepareReportImages({ manualId, sections = {}, capturedImages = [] }) {
  const warnings = [];
  const temporaryUris = [];
  const manualImages = {};
  const captured = [];

  for (const item of collectManualImageItems(sections)) {
    if (manualImages[item.imageFile]) continue;
    const source = getSubmittedManualImageSource(manualId, item.imageFile);
    const label = item.caption || `${item.sectionLabel} image`;
    const result = await resolvePdfImageDataUri(source, { label });
    if (result.ok) {
      if (result.temporaryUri) temporaryUris.push(result.temporaryUri);
      manualImages[item.imageFile] = result.dataUri;
    } else {
      manualImages[item.imageFile] = null;
      warnings.push({ label, reason: result.reason || 'Image could not be prepared.' });
    }
  }

  for (const record of capturedImages || []) {
    const source = getSignalImageSource(record);
    const label = record?.caption || record?.title || 'Captured Signal / Your Signal';
    const result = await resolvePdfImageDataUri(source, { label, mimeType: 'image/jpeg' });
    if (result.ok) {
      if (result.temporaryUri) temporaryUris.push(result.temporaryUri);
      captured.push({ record, dataUri: result.dataUri, failed: false });
    } else {
      captured.push({ record, dataUri: null, failed: true, reason: result.reason || 'Image could not be prepared.' });
      warnings.push({ label, reason: result.reason || 'Image could not be prepared.' });
    }
  }

  return { manualImages, captured, warnings, temporaryUris };
}

function structuredTextItems(text) {
  if (!hasText(text)) return [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const items = [];
  let list = [];
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    items.push(`<p class="report-paragraph">${paragraph.map(escapeHtml).join('<br/>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    if (listType === 'numbered') {
      items.push(`<div class="report-numbered-list">${list.map((item) => `<div class="report-numbered-item"><div class="report-numbered-marker">${escapeHtml(item.marker)}.</div><div class="report-numbered-body">${escapeHtml(item.body)}</div></div>`).join('')}</div>`);
    } else {
      items.push(`<ul class="report-list">${list.map((item) => `<li>${escapeHtml(item.body)}</li>`).join('')}</ul>`);
    }
    list = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    const bulleted = trimmed.match(/^[-•*]\s+(.*)$/);
    if (numbered || bulleted) {
      flushParagraph();
      const nextType = numbered ? 'numbered' : 'bullet';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push(numbered ? { marker: numbered[1], body: numbered[2] } : { body: bulleted[1] });
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });
  flushParagraph();
  flushList();
  return items;
}

function structuredTextHtml(text) {
  return structuredTextItems(text).join('');
}

function reportTableHtml({ columns = [], rows = [], className = '', tableText = '' }) {
  if (hasText(tableText)) return `<pre class="manual-table-text">${escapeHtml(tableText)}</pre>`;
  const meaningfulRows = rows.filter((row) => Array.isArray(row) && row.some((cell) => hasText(String(cell || ''))));
  if (!columns.length && !meaningfulRows.length) return '';
  const header = columns.length ? `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>` : '';
  const columnBasis = columns.length ? columns : meaningfulRows[0] || [];
  const body = meaningfulRows
    .map((row) => `<tr>${columnBasis.map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>`)
    .join('');
  return body ? `<table class="report-table ${className}">${header}<tbody>${body}</tbody></table>` : '';
}

function manualTableHtml(block) {
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  if (!columns.length && !rows.length && !hasText(block?.tableData)) return '';
  return reportTableHtml({ columns, rows, tableText: block?.tableData });
}

function blockHtmlItems(block, manualImages = {}, sectionKey = '') {
  if (!block) return [];
  if (block.type === 'image') {
    return imageItemsFromBlock(block).map((item) => (
      manualImages[item.imageFile]
        ? reportImageHtml(manualImages[item.imageFile], item.caption || block.caption || '', item.caption || 'Manual image', imageVariantForSection(sectionKey))
        : imageWarning(item.caption || block.caption || 'Manual image')
    ));
  }
  if (block.type === 'table') {
    const table = manualTableHtml(block);
    return table ? [`<div class="table-block">${table}</div>`] : [];
  }
  if (block.type === 'note') return [`<div class="note keep-together"><strong>Note:</strong>${structuredTextHtml(block.text || block.note || '')}</div>`];
  return structuredTextItems(block.text || block.tableData || '');
}

function blockHtml(block, manualImages = {}, sectionKey = '') {
  return blockHtmlItems(block, manualImages, sectionKey).join('');
}

function blockItemsHtml(blocks, manualImages = {}, sectionKey = '') {
  if (!Array.isArray(blocks)) return structuredTextItems(blocks);
  return blocks.flatMap((block) => blockHtmlItems(block, manualImages, sectionKey)).filter(Boolean);
}

function blocksHtml(blocks, manualImages = {}, sectionKey = '') {
  if (!Array.isArray(blocks)) return structuredTextHtml(blocks);
  return blocks.map((block) => blockHtml(block, manualImages, sectionKey)).filter(Boolean).join('');
}

function hasRenderableBlocks(blocks) {
  if (hasText(blocks)) return true;
  if (!Array.isArray(blocks)) return false;
  return blocks.some((block) => {
    if (!block) return false;
    if (block.type === 'image') return imageItemsFromBlock(block).length > 0;
    if (block.type === 'table') return Boolean(manualTableHtml(block));
    return hasText(block.text) || hasText(block.tableData) || hasText(block.note);
  });
}

function sectionHtml(title, blocks, manualImages, extra = '', sectionKey = '') {
  const items = blockItemsHtml(blocks, manualImages, sectionKey);
  if (!items.length && !extra) return '';
  const first = items.shift() || '';
  return `<section class="report-section allow-break"><div class="section-opening"><h2 class="report-heading">${escapeHtml(title)}</h2>${first}</div>${items.join('')}${extra}</section>`;
}

function userDetailsHtml(user = {}) {
  const rows = [
    ['Student Name', user.fullName || user.name],
    ['Email', user.email],
    ['Mobile Number', user.mobile],
    ['Institution', user.collegeName || user.institution],
    ['Course', user.course],
    ['Registration / Roll Number', user.rollNumber || user.registrationNumber],
    ['Semester / Year', user.semesterYear],
  ].filter(([, value]) => hasText(value));
  return rows.length ? `<table class="report-table report-meta-table"><tbody>${rows.map(([label, value]) => `<tr><th class="label-column">${escapeHtml(label)}</th><td class="value-column">${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>` : '<p class="report-paragraph">No student details available.</p>';
}

function completionHtml(completionDetails) {
  const details = completionDetails || { percentage: 0, completedCount: 0, totalCount: 0, completedItems: [] };
  return `<section class="report-section completion-section"><div class="section-opening completion-opening"><h2 class="report-heading">Completion Summary</h2><p class="report-paragraph"><strong>Experiment Status:</strong> ${details.percentage === 100 ? 'Completed' : 'Incomplete'}</p><p class="report-paragraph"><strong>Progress:</strong> ${details.percentage || 0}%</p><p class="report-paragraph"><strong>Completed Requirements:</strong> ${details.completedCount || 0} of ${details.totalCount || 0}</p><ul class="completion-list">${(details.completedItems || []).map((item) => `<li>${escapeHtml(item.completeLabel || item.label)}</li>`).join('')}</ul></div></section>`;
}

function capturedSignalsHtml(resolvedImages = []) {
  if (!resolvedImages.length) return '';
  return resolvedImages.map(({ record, dataUri, failed }) => {
    const caption = record?.caption || record?.title || 'Captured signal';
    const imageHtml = failed || !dataUri ? `${imageWarning('Captured signal image')}<div class="image-caption">${escapeHtml(caption)}</div>` : reportImageHtml(dataUri, caption, 'Captured signal', 'photo');
    return `<section class="report-section signal-section keep-together"><h2 class="report-heading">Captured Signal / Your Signal</h2>${imageHtml}</section>`;
  }).join('');
}

function studentTableHtml(table) {
  if (!hasFilledTable(table)) return '';
  return `<section class="report-section table-section"><div class="section-opening"><h2 class="report-heading">Observation Tables</h2><h3 class="report-subheading">${escapeHtml(table.tableName || 'Observation Table')}</h3>${reportTableHtml({ columns: table.columns || [], rows: table.rows || [], className: 'student-table' })}</div></section>`;
}

function graphSvgHtml(table, graph) {
  if (!graph?.generated) return '';
  const points = getNumericPairs(table, graph.xAxis, graph.yAxis);
  if (!points.length) return '';
  const width = 620;
  const height = 300;
  const padding = 48;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const scaled = points.map((point) => ({ x: padding + ((point.x - minX) / xRange) * (width - padding * 2), y: height - padding - ((point.y - minY) / yRange) * (height - padding * 2) }));
  const polyline = scaled.map((point) => `${point.x},${point.y}`).join(' ');
  return `<section class="report-section graph-section"><div class="graph-block"><h2 class="report-heading">Graphs</h2><p class="report-paragraph"><strong>Type:</strong> ${escapeHtml(graph.graphType || 'line')} | <strong>X-Axis:</strong> ${escapeHtml(graph.xAxis)} | <strong>Y-Axis:</strong> ${escapeHtml(graph.yAxis)}</p><svg class="graph-image" viewBox="0 0 ${width} ${height}" width="100%" height="300" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#F8FAFC" stroke="#D9E2EC"/><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#65758B"/><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#65758B"/><text x="${padding}" y="24" font-size="13" fill="#65758B">${escapeHtml(graph.yAxis || 'Y')}</text><text x="${width - padding - 80}" y="${height - 14}" font-size="13" fill="#65758B">${escapeHtml(graph.xAxis || 'X')}</text>${graph.graphType === 'line' && scaled.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#0B5CAD" stroke-width="3"/>` : ''}${scaled.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0B5CAD"/>`).join('')}</svg></div><div class="graph-values-block"><h3 class="report-subheading">Graph Values</h3>${reportTableHtml({ columns: [graph.xAxis || 'X', graph.yAxis || 'Y'], rows: points.map((point) => [point.x, point.y]), className: 'graph-values-table' })}</div></section>`;
}

function studentRecordHtml(draft = {}) {
  const entries = [
    draft.capturedImages?.some((image) => hasText(getSignalImageSource(image))) ? 'Captured Signal / Your Signal saved' : null,
    hasFilledTable(draft.table) ? 'Observation Table saved' : null,
    draft.graph?.generated ? 'Graph generated' : null,
    hasText(draft.observation) ? 'Student Observation Record included above' : null,
    hasText(draft.result) ? 'Student Result / Conclusion included above' : null,
  ].filter(Boolean);
  return entries.length ? `<section class="report-section"><div class="section-opening"><h2 class="report-heading">Student Experiment Record</h2><ul class="report-list">${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></div></section>` : '';
}

export function buildReportContentList({ manualId, experiment, draft = {}, completionDetails }) {
  const sections = experiment?.sections || {};
  const items = ['Cover and experiment details', 'Student details', 'Completion summary'];
  PRE_TECHNICAL_SECTION_ORDER.forEach(([key, label]) => {
    if (hasRenderableBlocks(sections[key])) items.push(label);
  });
  const technical = TECHNICAL_ORDER.filter(([key]) => hasRenderableBlocks(sections.technicalData?.[key])).map(([, label]) => label);
  if (technical.length) items.push(`Technical Data: ${technical.join(', ')}`);
  POST_TECHNICAL_SECTION_ORDER.forEach(([key, label]) => {
    if (hasRenderableBlocks(sections[key])) items.push(label.replace(' Instructions', '').replace(' Guidance', ''));
  });
  if (hasText(draft.observation)) items.push('Student Observation Record');
  const signalCount = (draft.capturedImages || []).filter((image) => hasText(getSignalImageSource(image))).length;
  if (signalCount) items.push(`${signalCount} captured signal image${signalCount === 1 ? '' : 's'}`);
  if (hasFilledTable(draft.table)) items.push('Observation Table');
  if (draft.graph?.generated) items.push('Graph');
  if (hasText(draft.result)) items.push('Student Result / Conclusion');
  if (completionDetails?.percentage === 100) items.push('Completion sign-off');
  return items;
}

export function buildCompleteExperimentHtml({ user, product, manual, experiment, studentRecord = {}, completionDetails, resolvedImages = {} }) {
  const manualId = manual?.manualId || studentRecord.manualId || product?.manualId;
  const category = getProductCategoryById(product?.categoryId);
  const sections = experiment?.sections || {};
  const now = new Date();
  const coverRows = [
    ['Category', manual?.categoryName || category?.name],
    ['Product', product?.name || manual?.productName],
    ['Product ID / Model', product?.id || manual?.productId],
    ['Experiment Number', experiment?.experimentNumber],
    ['Experiment Title', experiment?.title],
    ['Completion Percentage', `${completionDetails?.percentage || 0}%`],
    ['Completion Date', completionDetails?.percentage === 100 ? now.toLocaleDateString() : 'Not completed'],
    ['PDF Generation Date', now.toLocaleString()],
  ].filter(([, value]) => hasText(value));

  const preTechnicalSections = PRE_TECHNICAL_SECTION_ORDER.map(([key, label]) => sectionHtml(label, sections[key], resolvedImages.manualImages, '', key)).filter(Boolean).join('');
  const postTechnicalSections = POST_TECHNICAL_SECTION_ORDER.map(([key, label]) => {
    const studentObservation = studentRecord.observation ? `<div class="section-opening"><h3 class="report-subheading">Student Observation Record</h3>${structuredTextHtml(studentRecord.observation)}</div>` : '';
    const studentResult = studentRecord.result ? `<div class="section-opening"><h3 class="report-subheading">Student Result</h3>${structuredTextHtml(studentRecord.result)}</div>` : '';
    if (key === 'observation') return sectionHtml(label, sections[key], resolvedImages.manualImages, studentObservation, key);
    if (key === 'result') return sectionHtml(label, sections[key], resolvedImages.manualImages, studentResult, key);
    return sectionHtml(label, sections[key], resolvedImages.manualImages, '', key);
  }).filter(Boolean).join('');
  const technicalSectionItems = TECHNICAL_ORDER.map(([key, label]) => sectionHtml(label, sections.technicalData?.[key], resolvedImages.manualImages, '', key)).filter(Boolean);
  const firstTechnicalSection = technicalSectionItems.shift() || '';
  const technicalHtml = firstTechnicalSection ? `<section class="report-section technical-section allow-break"><div class="section-opening"><h2 class="report-heading">Technical Data</h2>${firstTechnicalSection}</div>${technicalSectionItems.join('')}</section>` : '';
  const warningHtml = resolvedImages.warnings?.length ? `<section class="report-section"><div class="section-opening"><h2 class="report-heading">Image Preparation Warnings</h2><ul class="report-list">${resolvedImages.warnings.map((warning) => `<li>${escapeHtml(warning.label)} could not be included.</li>`).join('')}</ul></div></section>` : '';

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
    @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #172033; font-size: 10.8pt; line-height: 1.45; margin: 0; padding: 0; }
    h1, h2, h3, p, ul, ol, figure, table { margin: 0; }
    h1 { color: #0B5CAD; font-size: 20pt; line-height: 1.2; margin-bottom: 6px; }
    .report-heading { color: #172033; font-size: 14.5pt; line-height: 1.25; margin: 18px 0 8px; border-bottom: 1px solid #D9E2EC; padding-bottom: 5px; break-after: avoid; page-break-after: avoid; }
    .report-subheading { color: #172033; font-size: 12.5pt; line-height: 1.3; margin: 12px 0 7px; break-after: avoid; page-break-after: avoid; }
    .report-paragraph { margin: 0 0 8px; line-height: 1.48; white-space: normal; orphans: 3; widows: 3; }
    .report-section { margin: 0 0 14px; break-inside: auto; page-break-inside: auto; }
    .section-opening, .keep-together, .table-block, .graph-block, .graph-values-block, .signoff-block { break-inside: avoid; page-break-inside: avoid; }
    .keep-with-next { break-after: avoid; page-break-after: avoid; }
    .allow-break { break-inside: auto; page-break-inside: auto; }
    .page-break-before { break-before: page; page-break-before: always; }
    .page-break-after { break-after: page; page-break-after: always; }
    .cover { background: #F8FAFC; border: 1px solid #D9E2EC; padding: 12px 14px; border-radius: 6px; break-inside: avoid; page-break-inside: avoid; }
    .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 9px 0 14px; break-inside: auto; page-break-inside: auto; }
    .report-table th, .report-table td { border: 1px solid #CBD5E1; padding: 6px 7px; text-align: left; vertical-align: top; font-size: 9.8pt; overflow-wrap: anywhere; word-break: normal; }
    .report-table th { background: #EAF2FB; font-weight: 700; }
    .report-table thead { display: table-header-group; }
    .report-meta-table .label-column { width: 32%; }
    .report-meta-table .value-column { width: 68%; }
    .completion-opening { break-inside: avoid; page-break-inside: avoid; }
    .completion-list { list-style: none; margin: 8px 0 14px; padding: 0; }
    .completion-list li { position: relative; padding-left: 20px; margin: 4px 0; line-height: 1.4; break-inside: avoid; page-break-inside: avoid; }
    .completion-list li::before { content: "✓"; position: absolute; left: 0; font-weight: 700; color: #087443; }
    .report-list { margin: 7px 0 12px; padding-left: 20px; }
    .report-list li { margin-bottom: 5px; padding-left: 3px; line-height: 1.42; break-inside: avoid; page-break-inside: avoid; }
    .report-numbered-list { margin: 7px 0 12px; }
    .report-numbered-item { display: flex; align-items: flex-start; break-inside: avoid; page-break-inside: avoid; margin-bottom: 5px; }
    .report-numbered-marker { flex: 0 0 28px; text-align: right; margin-right: 8px; font-weight: 700; }
    .report-numbered-body { flex: 1; min-width: 0; line-height: 1.45; }
    .pdf-image { width: 100%; margin: 10px 0 16px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .pdf-image img { display: block; width: auto; height: auto; object-fit: contain; margin: 0 auto; border: 1px solid #D9E2EC; }
    .pdf-image--diagram img { max-width: 100%; max-height: 520px; }
    .pdf-image--document-page { text-align: center; break-before: auto; page-break-before: auto; }
    .pdf-image--document-page img { max-width: 92%; max-height: 900px; }
    .pdf-image--photo img { max-width: 88%; max-height: 560px; }
    .image-caption { color: #667085; font-size: 9.5pt; text-align: center; margin-top: 5px; }
    .image-warning { margin: 10px 0 12px; padding: 8px 10px; border: 1px solid #FEC84B; background: #FFFAEB; color: #A15C07; font-weight: 700; break-inside: avoid; page-break-inside: avoid; }
    .note { border-left: 4px solid #0B5CAD; background: #F8FAFC; padding: 8px 10px; margin: 8px 0 12px; }
    .manual-table-text { white-space: pre-wrap; border: 1px solid #CBD5E1; padding: 8px; background: #F8FAFC; font-family: Arial, Helvetica, sans-serif; font-size: 9.8pt; }
    .graph-block { margin-top: 4px; }
    .graph-image { display: block; max-width: 100%; max-height: 430px; margin: 8px auto 0; object-fit: contain; }
    .graph-values-block { margin-top: 10px; }
    .signoff-block { break-inside: avoid; page-break-inside: avoid; margin-top: 20px; }
    .signoff { display: flex; justify-content: space-between; gap: 24px; margin-top: 28px; }
    .line { border-top: 1px solid #172033; padding-top: 7px; width: 42%; font-size: 10pt; }
  </style></head><body>
    <section class="cover"><h1>Akademika Learning</h1><h2 class="report-heading">Complete Experiment Report</h2><table class="report-table report-meta-table"><tbody>${coverRows.map(([label, value]) => `<tr><th class="label-column">${escapeHtml(label)}</th><td class="value-column">${escapeHtml(value)}</td></tr>`).join('')}</tbody></table></section>
    <section class="report-section"><div class="section-opening"><h2 class="report-heading">Student Details</h2>${userDetailsHtml(user)}</div></section>
    ${completionHtml(completionDetails)}
    ${warningHtml}
    ${preTechnicalSections}
    ${technicalHtml}
    ${postTechnicalSections}
    ${studentRecordHtml(studentRecord)}
    ${capturedSignalsHtml(resolvedImages.captured)}
    ${studentTableHtml(studentRecord.table)}
    ${graphSvgHtml(studentRecord.table, studentRecord.graph)}
    ${completionDetails?.percentage === 100 ? '<section class="report-section signoff-block"><h2 class="report-heading">Sign-off</h2><div class="signoff"><div class="line">Student Signature</div><div class="line">Faculty Signature</div></div></section>' : ''}
  </body></html>`;
}

async function cleanupTemporaryImages(uris = []) {
  for (const uri of uris) {
    if (!uri || !String(uri).startsWith(FileSystem.cacheDirectory)) continue;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      if (__DEV__) console.warn(`PDF temporary image cleanup failed: ${error?.message || error}`);
    }
  }
}

export async function generateCompleteExperimentPdf({ user, product, manual, experiment, manualContent, studentRecord = {}, completionDetails }) {
  const selectedManual = manual || manualContent || getMappedManual(studentRecord.manualId || product?.manualId);
  const selectedExperiment = experiment || getMappedExperiment(selectedManual?.manualId, studentRecord.experimentId) || getExperimentById(studentRecord.experimentId);
  const selectedCompletion = completionDetails || calculateExperimentProgress({ productId: product?.id || studentRecord.productId, manualId: selectedManual?.manualId || studentRecord.manualId, experimentId: selectedExperiment?.id || studentRecord.experimentId, draft: studentRecord });
  const sections = selectedExperiment?.sections || {};
  const resolvedImages = await prepareReportImages({ manualId: selectedManual?.manualId || studentRecord.manualId || product?.manualId, sections, capturedImages: studentRecord.capturedImages || [] });
  const html = buildCompleteExperimentHtml({ user, product, manual: selectedManual, experiment: selectedExperiment, studentRecord, completionDetails: selectedCompletion, resolvedImages });
  try {
    const result = await Print.printToFileAsync({ html });
    return {
      uri: result.uri,
      filename: `Akademika_${safeFilePart(product?.id || studentRecord.productId)}_${safeFilePart(selectedExperiment?.experimentNumber || selectedExperiment?.id || studentRecord.experimentId)}_${safeFilePart(user?.fullName || 'student')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      warnings: resolvedImages.warnings || [],
    };
  } finally {
    await cleanupTemporaryImages(resolvedImages.temporaryUris);
  }
}

export const generateWorkbookPdf = async (payload) => {
  const result = await generateCompleteExperimentPdf({
    user: payload.user,
    product: payload.product,
    manual: payload.manual,
    experiment: payload.experiment,
    studentRecord: payload.draft || payload.studentRecord || {},
    completionDetails: payload.completionDetails,
  });
  return result.uri;
};

export const sharePdf = async (uri) => {
  if (uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
};
