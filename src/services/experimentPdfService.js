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

function reportImageHtml(dataUri, caption, alt) {
  if (!dataUri) return imageWarning(alt || caption || 'Image');
  return `<div class="report-image"><img src="${dataUri}" alt="${escapeHtml(alt || caption || 'Experiment image')}"/><div class="image-caption">${escapeHtml(caption || '')}</div></div>`;
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

function structuredTextHtml(text) {
  if (!hasText(text)) return '';
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let list = [];
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html += `<p>${paragraph.map(escapeHtml).join('<br/>')}</p>`;
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const tag = listType === 'numbered' ? 'ol' : 'ul';
    html += `<${tag}>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
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
      list.push(numbered ? numbered[2] : bulleted[1]);
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });
  flushParagraph();
  flushList();
  return html;
}

function manualTableHtml(block) {
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  if (!columns.length && !rows.length && !hasText(block?.tableData)) return '';
  if (hasText(block?.tableData)) return `<pre class="manual-table-text">${escapeHtml(block.tableData)}</pre>`;
  const header = columns.length ? `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>` : '';
  const body = rows
    .filter((row) => Array.isArray(row) && row.some((cell) => hasText(String(cell || ''))))
    .map((row) => `<tr>${(columns.length ? columns : row).map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>`)
    .join('');
  return body ? `<table>${header}<tbody>${body}</tbody></table>` : '';
}

function blockHtml(block, manualImages = {}) {
  if (!block) return '';
  if (block.type === 'image') {
    return imageItemsFromBlock(block).map((item) => (
      manualImages[item.imageFile]
        ? reportImageHtml(manualImages[item.imageFile], item.caption || block.caption || '', item.caption || 'Manual image')
        : imageWarning(item.caption || block.caption || 'Manual image')
    )).join('');
  }
  if (block.type === 'table') return manualTableHtml(block);
  if (block.type === 'note') return `<div class="note"><strong>Note:</strong>${structuredTextHtml(block.text || block.note || '')}</div>`;
  return structuredTextHtml(block.text || block.tableData || '');
}

function blocksHtml(blocks, manualImages = {}) {
  if (!Array.isArray(blocks)) return structuredTextHtml(blocks);
  return blocks.map((block) => blockHtml(block, manualImages)).filter(Boolean).join('');
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

function sectionHtml(title, blocks, manualImages, extra = '') {
  const body = blocksHtml(blocks, manualImages);
  if (!body && !extra) return '';
  return `<section><h2>${escapeHtml(title)}</h2>${body}${extra}</section>`;
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
  return rows.length ? `<table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table>` : '<p>No student details available.</p>';
}

function completionHtml(completionDetails) {
  const details = completionDetails || { percentage: 0, completedCount: 0, totalCount: 0, completedItems: [] };
  return `<section><h2>Completion Summary</h2><p><strong>Experiment Status:</strong> ${details.percentage === 100 ? 'Completed' : 'Incomplete'}</p><p><strong>Progress:</strong> ${details.percentage || 0}%</p><p><strong>Completed Requirements:</strong> ${details.completedCount || 0} of ${details.totalCount || 0}</p><ul>${(details.completedItems || []).map((item) => `<li>✓ ${escapeHtml(item.completeLabel || item.label)}</li>`).join('')}</ul></section>`;
}

function capturedSignalsHtml(resolvedImages = []) {
  if (!resolvedImages.length) return '';
  return `<section><h2>Captured Signal / Your Signal</h2>${resolvedImages.map(({ record, dataUri, failed }) => {
    const caption = record?.caption || record?.title || 'Captured signal';
    return failed || !dataUri ? `${imageWarning('Captured signal image')}<div class="image-caption">${escapeHtml(caption)}</div>` : reportImageHtml(dataUri, caption, 'Captured signal');
  }).join('')}</section>`;
}

function studentTableHtml(table) {
  if (!hasFilledTable(table)) return '';
  const header = (table.columns || []).map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = (table.rows || [])
    .filter((row) => row.some((cell) => hasText(String(cell || ''))))
    .map((row) => `<tr>${(table.columns || []).map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>`)
    .join('');
  return `<section><h2>Observation Tables</h2><h3>${escapeHtml(table.tableName || 'Observation Table')}</h3><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></section>`;
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
  return `<section><h2>Graphs</h2><p><strong>Type:</strong> ${escapeHtml(graph.graphType || 'line')} | <strong>X-Axis:</strong> ${escapeHtml(graph.xAxis)} | <strong>Y-Axis:</strong> ${escapeHtml(graph.yAxis)}</p><svg viewBox="0 0 ${width} ${height}" width="100%" height="300" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#F8FAFC" stroke="#D9E2EC"/><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#65758B"/><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#65758B"/><text x="${padding}" y="24" font-size="13" fill="#65758B">${escapeHtml(graph.yAxis || 'Y')}</text><text x="${width - padding - 80}" y="${height - 14}" font-size="13" fill="#65758B">${escapeHtml(graph.xAxis || 'X')}</text>${graph.graphType === 'line' && scaled.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#0B5CAD" stroke-width="3"/>` : ''}${scaled.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0B5CAD"/>`).join('')}</svg><h3>Graph Values</h3><table><thead><tr><th>${escapeHtml(graph.xAxis || 'X')}</th><th>${escapeHtml(graph.yAxis || 'Y')}</th></tr></thead><tbody>${points.map((point) => `<tr><td>${escapeHtml(point.x)}</td><td>${escapeHtml(point.y)}</td></tr>`).join('')}</tbody></table></section>`;
}

function studentRecordHtml(draft = {}) {
  const entries = [
    draft.capturedImages?.some((image) => hasText(getSignalImageSource(image))) ? 'Captured Signal / Your Signal saved' : null,
    hasFilledTable(draft.table) ? 'Observation Table saved' : null,
    draft.graph?.generated ? 'Graph generated' : null,
    hasText(draft.observation) ? 'Student Observation Record included above' : null,
    hasText(draft.result) ? 'Student Result / Conclusion included above' : null,
  ].filter(Boolean);
  return entries.length ? `<section><h2>Student Experiment Record</h2><ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></section>` : '';
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

  const preTechnicalSections = PRE_TECHNICAL_SECTION_ORDER.map(([key, label]) => sectionHtml(label, sections[key], resolvedImages.manualImages)).filter(Boolean).join('');
  const postTechnicalSections = POST_TECHNICAL_SECTION_ORDER.map(([key, label]) => {
    if (key === 'observation') return sectionHtml(label, sections[key], resolvedImages.manualImages, studentRecord.observation ? `<h3>Student Observation Record</h3>${structuredTextHtml(studentRecord.observation)}` : '');
    if (key === 'result') return sectionHtml(label, sections[key], resolvedImages.manualImages, studentRecord.result ? `<h3>Student Result</h3>${structuredTextHtml(studentRecord.result)}` : '');
    return sectionHtml(label, sections[key], resolvedImages.manualImages);
  }).filter(Boolean).join('');
  const technicalSections = TECHNICAL_ORDER.map(([key, label]) => sectionHtml(label, sections.technicalData?.[key], resolvedImages.manualImages)).filter(Boolean).join('');
  const technicalHtml = technicalSections ? `<section><h2>Technical Data</h2>${technicalSections}</section>` : '';
  const warningHtml = resolvedImages.warnings?.length ? `<section><h2>Image Preparation Warnings</h2><ul>${resolvedImages.warnings.map((warning) => `<li>${escapeHtml(warning.label)} could not be included.</li>`).join('')}</ul></section>` : '';

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
    body { font-family: Arial, sans-serif; color: #152238; padding: 24px; line-height: 1.45; }
    h1 { color: #0B5CAD; font-size: 28px; margin-bottom: 6px; }
    h2 { color: #152238; font-size: 20px; margin-top: 24px; border-bottom: 1px solid #D9E2EC; padding-bottom: 6px; page-break-after: avoid; }
    h3 { color: #152238; font-size: 16px; margin-top: 16px; page-break-after: avoid; }
    p { white-space: normal; margin: 8px 0; }
    ol, ul { margin-top: 8px; padding-left: 28px; }
    li { margin-bottom: 6px; padding-left: 4px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 10px 0 16px; page-break-inside: auto; }
    th, td { border: 1px solid #D9E2EC; padding: 7px; text-align: left; vertical-align: top; font-size: 12px; word-wrap: break-word; }
    th { background: #EAF2FB; font-weight: 700; }
    thead { display: table-header-group; }
    .report-image, figure { width: 100%; margin: 12px 0 18px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
    .report-image img { display: block; max-width: 100%; max-height: 650px; width: auto; height: auto; margin: 0 auto; object-fit: contain; border: 1px solid #D9E2EC; }
    .image-caption, figcaption { color: #667085; font-size: 11px; text-align: center; margin-top: 6px; }
    .image-warning { margin: 12px 0; padding: 10px 12px; border: 1px solid #FEC84B; background: #FFFAEB; color: #A15C07; font-weight: 700; page-break-inside: avoid; }
    section { page-break-inside: auto; }
    .cover { background: #F8FAFC; border: 1px solid #D9E2EC; padding: 16px; border-radius: 8px; }
    .note { border-left: 4px solid #0B5CAD; background: #F8FAFC; padding: 10px 12px; margin: 10px 0; }
    .manual-table-text { white-space: pre-wrap; border: 1px solid #D9E2EC; padding: 10px; background: #F8FAFC; font-family: Arial, sans-serif; }
    .signoff { margin-top: 36px; display: flex; justify-content: space-between; gap: 24px; }
    .line { border-top: 1px solid #152238; padding-top: 8px; width: 42%; }
  </style></head><body>
    <section class="cover"><h1>Akademika Learning</h1><h2>Complete Experiment Report</h2><table>${coverRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table></section>
    <section><h2>Student Details</h2>${userDetailsHtml(user)}</section>
    ${completionHtml(completionDetails)}
    ${warningHtml}
    ${preTechnicalSections}
    ${technicalHtml}
    ${postTechnicalSections}
    ${studentRecordHtml(studentRecord)}
    ${capturedSignalsHtml(resolvedImages.captured)}
    ${studentTableHtml(studentRecord.table)}
    ${graphSvgHtml(studentRecord.table, studentRecord.graph)}
    ${completionDetails?.percentage === 100 ? '<section><h2>Sign-off</h2><div class="signoff"><div class="line">Student Signature</div><div class="line">Faculty Signature</div></div></section>' : ''}
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
