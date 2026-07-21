import { Image as RNImage } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getSubmittedManualImageSource } from '../content/contentRegistry';
import { getMappedExperiment, getMappedManual } from '../data/manualData';
import { getExperimentById } from '../data/experiments';
import { getProductCategoryById } from '../data/products';
import { calculateExperimentProgress } from './experimentProgressService';
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

function resolveManualImageUri(manualId, imageFile) {
  const source = getSubmittedManualImageSource(manualId, imageFile);
  const resolved = source ? RNImage.resolveAssetSource(source) : null;
  return resolved?.uri || null;
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

function blockHtml(block, manualId) {
  if (!block) return '';
  if (block.type === 'image') {
    return imageItemsFromBlock(block).map((item) => {
      const uri = resolveManualImageUri(manualId, item.imageFile);
      if (!uri) return '';
      return `<figure><img src="${escapeHtml(uri)}"/><figcaption>${escapeHtml(item.caption || block.caption || '')}</figcaption></figure>`;
    }).join('');
  }
  if (block.type === 'table') return manualTableHtml(block);
  if (block.type === 'note') return `<div class="note"><strong>Note:</strong>${structuredTextHtml(block.text || block.note || '')}</div>`;
  return structuredTextHtml(block.text || block.tableData || '');
}

function blocksHtml(blocks, manualId) {
  if (!Array.isArray(blocks)) return structuredTextHtml(blocks);
  return blocks.map((block) => blockHtml(block, manualId)).filter(Boolean).join('');
}

function sectionHtml(title, blocks, manualId, extra = '') {
  const body = blocksHtml(blocks, manualId);
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

function capturedSignalsHtml(images = []) {
  const valid = images.filter((image) => hasText(image?.uri));
  if (!valid.length) return '';
  return `<section><h2>Captured Signal / Your Signal</h2>${valid.map((image) => `<figure><img src="${escapeHtml(image.uri)}"/><figcaption>${escapeHtml(image.caption || image.title || 'Captured signal')}</figcaption></figure>`).join('')}</section>`;
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
  const scaled = points.map((point) => ({
    x: padding + ((point.x - minX) / xRange) * (width - padding * 2),
    y: height - padding - ((point.y - minY) / yRange) * (height - padding * 2),
  }));
  const polyline = scaled.map((point) => `${point.x},${point.y}`).join(' ');
  return `<section><h2>Graphs</h2><p><strong>Type:</strong> ${escapeHtml(graph.graphType || 'line')} | <strong>X-Axis:</strong> ${escapeHtml(graph.xAxis)} | <strong>Y-Axis:</strong> ${escapeHtml(graph.yAxis)}</p><svg viewBox="0 0 ${width} ${height}" width="100%" height="300" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#F8FAFC" stroke="#D9E2EC"/><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#65758B"/><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#65758B"/><text x="${padding}" y="24" font-size="13" fill="#65758B">${escapeHtml(graph.yAxis || 'Y')}</text><text x="${width - padding - 80}" y="${height - 14}" font-size="13" fill="#65758B">${escapeHtml(graph.xAxis || 'X')}</text>${graph.graphType === 'line' && scaled.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#0B5CAD" stroke-width="3"/>` : ''}${scaled.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0B5CAD"/>`).join('')}</svg><h3>Graph Values</h3><table><thead><tr><th>${escapeHtml(graph.xAxis || 'X')}</th><th>${escapeHtml(graph.yAxis || 'Y')}</th></tr></thead><tbody>${points.map((point) => `<tr><td>${escapeHtml(point.x)}</td><td>${escapeHtml(point.y)}</td></tr>`).join('')}</tbody></table></section>`;
}

function studentRecordHtml(draft = {}) {
  const entries = [
    draft.capturedImages?.some((image) => hasText(image?.uri)) ? 'Captured Signal / Your Signal saved' : null,
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
    if (blocksHtml(sections[key], manualId)) items.push(label);
  });
  const technical = TECHNICAL_ORDER.filter(([key]) => blocksHtml(sections.technicalData?.[key], manualId)).map(([, label]) => label);
  if (technical.length) items.push(`Technical Data: ${technical.join(', ')}`);
  POST_TECHNICAL_SECTION_ORDER.forEach(([key, label]) => {
    if (blocksHtml(sections[key], manualId)) items.push(label.replace(' Instructions', '').replace(' Guidance', ''));
  });
  if (hasText(draft.observation)) items.push('Student Observation Record');
  if (draft.capturedImages?.some((image) => hasText(image?.uri))) items.push(`${draft.capturedImages.length} captured signal image${draft.capturedImages.length === 1 ? '' : 's'}`);
  if (hasFilledTable(draft.table)) items.push('Observation Table');
  if (draft.graph?.generated) items.push('Graph');
  if (hasText(draft.result)) items.push('Student Result / Conclusion');
  if (completionDetails?.percentage === 100) items.push('Completion sign-off');
  return items;
}

export function buildCompleteExperimentHtml({ user, product, manual, experiment, studentRecord = {}, completionDetails }) {
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

  const preTechnicalSections = PRE_TECHNICAL_SECTION_ORDER.map(([key, label]) => {
    if (key === 'observation') return sectionHtml(label, sections[key], manualId, studentRecord.observation ? `<h3>Student Observation Record</h3>${structuredTextHtml(studentRecord.observation)}` : '');
    if (key === 'result') return sectionHtml(label, sections[key], manualId, studentRecord.result ? `<h3>Student Result</h3>${structuredTextHtml(studentRecord.result)}` : '');
    if (key === 'conclusion') return sectionHtml(label, sections[key], manualId, studentRecord.result ? `<h3>Student Conclusion</h3>${structuredTextHtml(studentRecord.result)}` : '');
    return sectionHtml(label, sections[key], manualId);
  }).filter(Boolean).join('');

  const postTechnicalSections = POST_TECHNICAL_SECTION_ORDER.map(([key, label]) => {
    if (key === 'observation') return sectionHtml(label, sections[key], manualId, studentRecord.observation ? `<h3>Student Observation Record</h3>${structuredTextHtml(studentRecord.observation)}` : '');
    if (key === 'result') return sectionHtml(label, sections[key], manualId, studentRecord.result ? `<h3>Student Result</h3>${structuredTextHtml(studentRecord.result)}` : '');
    if (key === 'conclusion') return sectionHtml(label, sections[key], manualId);
    return sectionHtml(label, sections[key], manualId);
  }).filter(Boolean).join('');

  const technicalSections = TECHNICAL_ORDER.map(([key, label]) => sectionHtml(label, sections.technicalData?.[key], manualId)).filter(Boolean).join('');
  const technicalHtml = technicalSections ? `<section><h2>Technical Data</h2>${technicalSections}</section>` : '';

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
    img { display: block; max-width: 100%; max-height: 720px; object-fit: contain; margin: 8px auto; border: 1px solid #D9E2EC; }
    figure { margin: 14px 0; page-break-inside: avoid; }
    figcaption { color: #65758B; font-size: 12px; text-align: center; margin-top: 4px; }
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
    ${preTechnicalSections}
    ${technicalHtml}
    ${postTechnicalSections}
    ${studentRecordHtml(studentRecord)}
    ${capturedSignalsHtml(studentRecord.capturedImages)}
    ${studentTableHtml(studentRecord.table)}
    ${graphSvgHtml(studentRecord.table, studentRecord.graph)}
    ${completionDetails?.percentage === 100 ? '<section><h2>Sign-off</h2><div class="signoff"><div class="line">Student Signature</div><div class="line">Faculty Signature</div></div></section>' : ''}
  </body></html>`;
}

export async function generateCompleteExperimentPdf({ user, product, manual, experiment, manualContent, studentRecord = {}, completionDetails }) {
  const selectedManual = manual || manualContent || getMappedManual(studentRecord.manualId || product?.manualId);
  const selectedExperiment = experiment || getMappedExperiment(selectedManual?.manualId, studentRecord.experimentId) || getExperimentById(studentRecord.experimentId);
  const selectedCompletion = completionDetails || calculateExperimentProgress({ productId: product?.id || studentRecord.productId, manualId: selectedManual?.manualId || studentRecord.manualId, experimentId: selectedExperiment?.id || studentRecord.experimentId, draft: studentRecord });
  const html = buildCompleteExperimentHtml({ user, product, manual: selectedManual, experiment: selectedExperiment, studentRecord, completionDetails: selectedCompletion });
  const result = await Print.printToFileAsync({ html });
  return {
    uri: result.uri,
    filename: `Akademika_${safeFilePart(product?.id || studentRecord.productId)}_${safeFilePart(selectedExperiment?.experimentNumber || selectedExperiment?.id || studentRecord.experimentId)}_${safeFilePart(user?.fullName || 'student')}_${new Date().toISOString().slice(0, 10)}.pdf`,
    warnings: [],
  };
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
