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

const FLOW_SECTION_ORDER = [
  ['objective', 'Objective'],
  ['theory', 'Theory'],
  ['functionalBlock', 'Functional Block'],
  ['procedure', 'Procedure'],
  ['observation', 'Observation Instructions'],
  ['equipments', 'Equipments'],
  ['result', 'Result Guidance'],
  ['conclusion', 'Conclusion Guidance'],
];

const PRINTABLE_PAGE_HEIGHT_MM = 268;
const ESTIMATED_PAGE_HEIGHT = PRINTABLE_PAGE_HEIGHT_MM * 3.78;


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

function numericDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function imageDimensions(item = {}, block = {}) {
  const width = numericDimension(item.width || item.imageWidth || block.width || block.imageWidth);
  const height = numericDimension(item.height || item.imageHeight || block.height || block.imageHeight);
  return { width, height, ratio: width && height ? width / height : 0 };
}

function classifyImage({ sectionKey = '', item = {}, block = {}, role = '' } = {}) {
  const { ratio } = imageDimensions(item, block);
  const technical = ['functionalBlock', 'datasheet', 'blockDiagram', 'circuitDiagram', 'referenceSignal'].includes(sectionKey);
  const signal = role === 'signal' || sectionKey === 'capturedSignal';
  if (role === 'graph') return 'graph';
  if (signal) return ratio > 1.35 ? 'signal-wide' : 'signal';
  if (sectionKey === 'observation' && (!ratio || ratio < 0.78)) return 'document-page';
  if (ratio && ratio < 0.78 && !technical) return 'document-page';
  if (technical && ratio > 1.35) return 'wide-diagram';
  if (technical) return 'diagram';
  if (ratio > 1.35) return 'wide-photo';
  return 'photo';
}

function imageVariantForSection(sectionKey, item = {}, block = {}) {
  return classifyImage({ sectionKey, item, block });
}

function reportImageHtml(dataUri, caption, alt, variant = 'photo') {
  if (!dataUri) return imageWarning(alt || caption || 'Image');
  const captionHtml = hasText(caption) ? `<div class="image-caption">${escapeHtml(caption)}</div>` : '';
  return `<div class="content-block pdf-image pdf-image--${variant} keep-together"><img src="${dataUri}" alt="${escapeHtml(alt || caption || 'Experiment image')}"/>${captionHtml}</div>`;
}

function imageItemsFromBlock(block) {
  const files = Array.isArray(block?.imageFiles) && block.imageFiles.length
    ? block.imageFiles
    : block?.imageFile
      ? [block.imageFile]
      : [];
  return files
    .map((item) => (typeof item === 'string'
      ? { imageFile: item, caption: block?.caption || '', width: block?.width, height: block?.height }
      : { ...item, caption: item?.caption || block?.caption || '', width: item?.width || block?.width, height: item?.height || block?.height }))
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

function estimateTextBlockHeight(text = '') {
  const length = String(text || '').length;
  return Math.max(20, Math.ceil(length / 92) * 15 + 8);
}

function estimateImageBlockHeight(variant = 'photo', dimensions = {}) {
  const ratio = dimensions.ratio || 1.25;
  if (variant === 'document-page') return 930;
  if (variant === 'wide-diagram') return 360;
  if (variant === 'diagram') return 470;
  if (variant === 'signal-wide') return 380;
  if (variant === 'signal') return 440;
  if (variant === 'graph') return 370;
  return ratio > 1.35 ? 330 : 440;
}

function estimateTableHeight(columns = [], rows = []) {
  const rowCount = Array.isArray(rows) ? rows.filter((row) => Array.isArray(row) && row.some((cell) => hasText(String(cell || '')))).length : 0;
  const columnCount = Array.isArray(columns) ? columns.length : 0;
  const rowHeight = columnCount > 5 ? 28 : 23;
  return 34 + Math.min(rowCount, 24) * rowHeight;
}

function estimateSectionOpeningHeight(firstItem) {
  return 42 + (firstItem?.estimate || 35);
}

function shouldStartNewPage({ sectionKey, firstItem, remainingHeight }) {
  if (!firstItem) return false;
  const openingHeight = estimateSectionOpeningHeight(firstItem);
  if (sectionKey === 'observation' && firstItem.classification === 'document-page') return true;
  if (firstItem.type === 'image' && openingHeight > ESTIMATED_PAGE_HEIGHT * 0.58) return remainingHeight < openingHeight + 40;
  if (firstItem.type === 'graph') return remainingHeight < 420;
  return remainingHeight < Math.min(openingHeight + 30, 220);
}

function isContentLabel(line) {
  return /^([A-Z][A-Z0-9 /()&+.-]{2,}|[A-Z][A-Za-z0-9 /()&+.-]{2,})\s*:-?$/.test(line)
    || /^(THEORY|RESOLUTION|CALCULATIONS?|OBSERVATION|PROCEDURE|RESULT|CONCLUSION)\s*:-?$/i.test(line);
}

function isFormulaLine(line) {
  return /(=|\bV(?:OUT|IN)?\b|\bResolution\b|\bLSB\b|\bCALCULATIONS?\b|\bFormula\b|\d+\s*[xX*/+-]\s*\d+)/i.test(line)
    && !/^\d+[.)]\s+/.test(line);
}

function structuredTextItems(text) {
  if (!hasText(text)) return [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const items = [];
  let list = [];
  let listType = null;
  let paragraph = [];
  let formula = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const className = paragraph.join(' ').length > 520 ? 'report-paragraph content-block content-block--long' : 'report-paragraph content-block content-block--short';
    items.push({ type: 'text', classification: className.includes('long') ? 'long-paragraph' : 'short-paragraph', html: `<p class="${className}">${paragraph.map(escapeHtml).join('<br/>')}</p>`, estimate: estimateTextBlockHeight(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushFormula = () => {
    if (!formula.length) return;
    items.push({ type: 'formula', classification: formula.length > 3 ? 'long-formula' : 'formula', html: `<div class="formula-block content-block">${formula.map(escapeHtml).join('<br/>')}</div>`, estimate: 34 + formula.length * 16 });
    formula = [];
  };
  const flushList = () => {
    if (!list.length) return;
    if (listType === 'numbered') {
      items.push({ type: 'numbered-list', classification: list.length > 8 ? 'long-list' : 'short-list', html: `<div class="report-numbered-list content-block">${list.map((item) => `<div class="report-numbered-item"><div class="report-numbered-marker">${escapeHtml(item.marker)}.</div><div class="report-numbered-body">${escapeHtml(item.body)}</div></div>`).join('')}</div>`, estimate: 16 + list.length * 20 });
    } else {
      items.push({ type: 'bullet-list', classification: list.length > 8 ? 'long-list' : 'short-list', html: `<ul class="report-list content-block">${list.map((item) => `<li>${escapeHtml(item.body)}</li>`).join('')}</ul>`, estimate: 16 + list.length * 18 });
    }
    list = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushFormula();
      flushList();
      return;
    }
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    const bulleted = trimmed.match(/^[-•*]\s+(.*)$/);
    if (numbered || bulleted) {
      flushParagraph();
      flushFormula();
      const nextType = numbered ? 'numbered' : 'bullet';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push(numbered ? { marker: numbered[1], body: numbered[2] } : { body: bulleted[1] });
      return;
    }
    if (isContentLabel(trimmed)) {
      flushParagraph();
      flushFormula();
      flushList();
      items.push({ type: 'label', classification: 'content-label', html: `<div class="content-label content-block">${escapeHtml(trimmed)}</div>`, estimate: 22 });
      return;
    }
    if (isFormulaLine(trimmed)) {
      flushParagraph();
      flushList();
      formula.push(trimmed);
      return;
    }
    flushFormula();
    flushList();
    paragraph.push(trimmed);
  });
  flushParagraph();
  flushFormula();
  flushList();
  return items;
}

function structuredTextHtml(text) {
  return structuredTextItems(text).map((item) => item.html || item).join('');
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

function renderItem(item) {
  if (!item) return '';
  return typeof item === 'string' ? item : item.html || '';
}

function blockHtmlItems(block, manualImages = {}, sectionKey = '') {
  if (!block) return [];
  if (block.type === 'image') {
    return imageItemsFromBlock(block).map((item) => {
      const dimensions = imageDimensions(item, block);
      const variant = imageVariantForSection(sectionKey, item, block);
      const label = item.caption || block.caption || 'Manual image';
      return {
        type: 'image',
        classification: variant,
        html: manualImages[item.imageFile]
          ? reportImageHtml(manualImages[item.imageFile], item.caption || block.caption || '', label, variant)
          : imageWarning(label),
        estimate: estimateImageBlockHeight(variant, dimensions),
      };
    });
  }
  if (block.type === 'table') {
    const rows = Array.isArray(block?.rows) ? block.rows : [];
    const columns = Array.isArray(block?.columns) ? block.columns : [];
    const table = manualTableHtml(block);
    if (!table) return [];
    const rowCount = rows.filter((row) => Array.isArray(row) && row.some((cell) => hasText(String(cell || '')))).length;
    const classification = rowCount > 18 ? 'long-table' : rowCount > 8 ? 'medium-table' : 'small-table';
    return [{ type: 'table', classification, html: `<div class="table-block table--${classification.replace('-table', '')}">${table}</div>`, estimate: estimateTableHeight(columns, rows) }];
  }
  if (block.type === 'note') {
    const html = `<div class="note keep-together content-block"><strong>Note:</strong>${structuredTextHtml(block.text || block.note || '')}</div>`;
    return [{ type: 'note', classification: 'note', html, estimate: estimateTextBlockHeight(block.text || block.note || '') + 18 }];
  }
  return structuredTextItems(block.text || block.tableData || '');
}

function blockHtml(block, manualImages = {}, sectionKey = '') {
  return blockHtmlItems(block, manualImages, sectionKey).map(renderItem).join('');
}

function blockItemsHtml(blocks, manualImages = {}, sectionKey = '') {
  if (!Array.isArray(blocks)) return structuredTextItems(blocks);
  return blocks.flatMap((block) => blockHtmlItems(block, manualImages, sectionKey)).filter((item) => renderItem(item));
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

function sectionHtml(title, blocks, manualImages, extra = '', sectionKey = '', options = {}) {
  const items = blockItemsHtml(blocks, manualImages, sectionKey);
  if (!items.length && !extra) return '';
  const first = items.shift() || null;
  const headingTag = options.subsection ? 'h3' : 'h2';
  const headingClass = options.subsection ? 'report-subsection-title' : 'report-section-title';
  const sectionClasses = ['report-section', 'allow-break'];
  const remainingEstimate = options.remainingHeight || ESTIMATED_PAGE_HEIGHT;
  if (options.forcePageBefore || shouldStartNewPage({ sectionKey, firstItem: first, remainingHeight: remainingEstimate })) sectionClasses.push('force-page-before');
  if (sectionKey === 'observation' && first?.classification === 'document-page') sectionClasses.push('observation-section');
  const firstHtml = renderItem(first);
  return `<section class="${sectionClasses.join(' ')}"><div class="section-opening ${sectionKey === 'observation' ? 'observation-opening' : ''}"><${headingTag} class="${headingClass}">${escapeHtml(title)}</${headingTag}>${firstHtml}</div>${items.map(renderItem).join('')}${extra}</section>`;
}

function buildAdaptiveReportModel(sections = {}) {
  const model = [];
  const pushSection = (key, title) => {
    if (hasRenderableBlocks(sections[key])) model.push({ type: 'section', key, title, blocks: sections[key] });
  };

  pushSection('objective', 'Objective');
  pushSection('theory', 'Theory');
  pushSection('functionalBlock', 'Functional Block');
  pushSection('procedure', 'Procedure');

  const subsections = TECHNICAL_ORDER
    .map(([key, title]) => ({ type: 'section', key, title, blocks: sections.technicalData?.[key], subsection: true }))
    .filter((section) => hasRenderableBlocks(section.blocks));
  if (subsections.length) model.push({ type: 'technicalData', key: 'technicalData', title: 'Technical Data', subsections });

  pushSection('observation', 'Observation Instructions');
  pushSection('equipments', 'Equipments');
  pushSection('result', 'Result Guidance');
  pushSection('conclusion', 'Conclusion Guidance');
  return model;
}

function estimateSectionHeightFromBlocks(blocks, manualImages, sectionKey) {
  return blockItemsHtml(blocks, manualImages, sectionKey).reduce((sum, item) => sum + (item.estimate || 35), 42);
}

function buildAdaptiveReportLayout(model, manualImages = {}) {
  let remainingHeight = ESTIMATED_PAGE_HEIGHT;
  return model.map((section) => {
    if (section.type === 'technicalData') {
      const subsectionEstimate = section.subsections.reduce((sum, subsection) => sum + estimateSectionHeightFromBlocks(subsection.blocks, manualImages, subsection.key), 48);
      const forcePageBefore = shouldStartNewPage({ sectionKey: section.key, firstItem: { type: 'section', estimate: Math.min(subsectionEstimate, 520) }, remainingHeight });
      remainingHeight = forcePageBefore ? ESTIMATED_PAGE_HEIGHT - Math.min(subsectionEstimate, ESTIMATED_PAGE_HEIGHT) : remainingHeight - Math.min(subsectionEstimate, remainingHeight);
      return { ...section, forcePageBefore };
    }
    const items = blockItemsHtml(section.blocks, manualImages, section.key);
    const firstItem = items[0];
    const estimated = items.reduce((sum, item) => sum + (item.estimate || 35), 48);
    const forcePageBefore = section.key !== 'objective' && shouldStartNewPage({ sectionKey: section.key, firstItem, remainingHeight });
    remainingHeight = forcePageBefore ? ESTIMATED_PAGE_HEIGHT - Math.min(estimated, ESTIMATED_PAGE_HEIGHT) : remainingHeight - Math.min(estimated, remainingHeight);
    if (remainingHeight < 80) remainingHeight = ESTIMATED_PAGE_HEIGHT;
    return { ...section, forcePageBefore };
  });
}

function renderReportModel(layout, manualImages = {}, extras = {}) {
  return layout.map((section) => {
    if (section.type === 'technicalData') {
      const [firstSubsection, ...remainingSubsections] = section.subsections;
      if (!firstSubsection) return '';
      const firstHtml = sectionHtml(firstSubsection.title, firstSubsection.blocks, manualImages, '', firstSubsection.key, { subsection: true });
      const remainingHtml = remainingSubsections.map((subsection) => sectionHtml(subsection.title, subsection.blocks, manualImages, '', subsection.key, { subsection: true })).join('');
      return `<section class="report-section technical-section allow-break${section.forcePageBefore ? ' force-page-before' : ''}"><div class="section-opening"><h2 class="report-section-title">Technical Data</h2>${firstHtml}</div>${remainingHtml}</section>`;
    }
    const extra = section.key === 'observation' ? extras.studentObservation || '' : section.key === 'result' ? extras.studentResult || '' : '';
    return sectionHtml(section.title, section.blocks, manualImages, extra, section.key, { forcePageBefore: section.forcePageBefore });
  }).join('');
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
  const completedItems = details.completedItems || [];
  const midpoint = Math.ceil(completedItems.length / 2);
  const columns = [completedItems.slice(0, midpoint), completedItems.slice(midpoint)];
  const columnHtml = columns.map((column) => `<div class="completion-column">${column.map((item) => `<div class="completion-item"><span class="completion-check">✓</span><span>${escapeHtml(item.completeLabel || item.label)}</span></div>`).join('')}</div>`).join('');
  return `<section class="completion-summary-block"><h2 class="report-section-title">Completion Summary</h2><p class="report-paragraph"><strong>Experiment Status:</strong> ${details.percentage === 100 ? 'Completed' : 'Incomplete'}</p><p class="report-paragraph"><strong>Progress:</strong> ${details.percentage || 0}%</p><p class="report-paragraph"><strong>Completed Requirements:</strong> ${details.completedCount || 0} of ${details.totalCount || 0}</p><div class="completion-columns">${columnHtml}</div></section>`;
}

function capturedSignalsHtml(resolvedImages = []) {
  if (!resolvedImages.length) return '';
  return resolvedImages.map(({ record, dataUri, failed }) => {
    const caption = record?.caption || record?.title || 'Captured signal';
    const imageHtml = failed || !dataUri ? `${imageWarning('Captured signal image')}<div class="image-caption">${escapeHtml(caption)}</div>` : reportImageHtml(dataUri, caption, 'Captured signal', 'signal');
    return `<section class="report-section signal-section keep-together"><h2 class="report-section-title">Captured Signal / Your Signal</h2>${imageHtml}</section>`;
  }).join('');
}

function studentTableHtml(table) {
  if (!hasFilledTable(table)) return '';
  return `<section class="report-section table-section"><div class="section-opening"><h2 class="report-section-title">Observation Tables</h2><h3 class="report-subsection-title">${escapeHtml(table.tableName || 'Observation Table')}</h3>${reportTableHtml({ columns: table.columns || [], rows: table.rows || [], className: 'student-table' })}</div></section>`;
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
  return `<section class="report-section graph-section"><div class="graph-block"><h2 class="report-section-title">Graphs</h2><p class="report-paragraph"><strong>Type:</strong> ${escapeHtml(graph.graphType || 'line')} | <strong>X-Axis:</strong> ${escapeHtml(graph.xAxis)} | <strong>Y-Axis:</strong> ${escapeHtml(graph.yAxis)}</p><svg class="graph-image" viewBox="0 0 ${width} ${height}" width="100%" height="300" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#F8FAFC" stroke="#D9E2EC"/><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#65758B"/><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#65758B"/><text x="${padding}" y="24" font-size="13" fill="#65758B">${escapeHtml(graph.yAxis || 'Y')}</text><text x="${width - padding - 80}" y="${height - 14}" font-size="13" fill="#65758B">${escapeHtml(graph.xAxis || 'X')}</text>${graph.graphType === 'line' && scaled.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#0B5CAD" stroke-width="3"/>` : ''}${scaled.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0B5CAD"/>`).join('')}</svg></div><div class="graph-values-block"><h3 class="report-subsection-title">Graph Values</h3>${reportTableHtml({ columns: [graph.xAxis || 'X', graph.yAxis || 'Y'], rows: points.map((point) => [point.x, point.y]), className: 'graph-values-table' })}</div></section>`;
}


function getStudentGraphs(studentRecord = {}) {
  if (Array.isArray(studentRecord.graphs)) return studentRecord.graphs.filter((graph) => graph?.generated);
  return studentRecord.graph?.generated ? [studentRecord.graph] : [];
}

function graphsHtml(table, studentRecord = {}) {
  return getStudentGraphs(studentRecord).map((graph) => graphSvgHtml(table, graph)).join('');
}

function studentRecordHtml(draft = {}) {
  const entries = [
    draft.capturedImages?.some((image) => hasText(getSignalImageSource(image))) ? 'Captured Signal / Your Signal saved' : null,
    hasFilledTable(draft.table) ? 'Observation Table saved' : null,
    getStudentGraphs(draft).length ? `${getStudentGraphs(draft).length === 1 ? 'Graph' : 'Graphs'} generated` : null,
    hasText(draft.observation) ? 'Student Observation Record included above' : null,
    hasText(draft.result) ? 'Student Result / Conclusion included above' : null,
  ].filter(Boolean);
  return entries.length ? `<section class="report-section"><div class="section-opening"><h2 class="report-section-title">Student Experiment Record</h2><div class="record-checklist">${entries.map((entry) => `<div class="record-check-item"><span class="completion-check">✓</span><span>${escapeHtml(entry)}</span></div>`).join('')}</div></div></section>` : '';
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
  if (getStudentGraphs(draft).length) items.push(getStudentGraphs(draft).length === 1 ? 'Graph' : `${getStudentGraphs(draft).length} graphs`);
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

  const studentObservation = studentRecord.observation ? `<div class="section-opening"><h3 class="report-subsection-title">Student Observation Record</h3>${structuredTextHtml(studentRecord.observation)}</div>` : '';
  const studentResult = studentRecord.result ? `<div class="section-opening"><h3 class="report-subsection-title">Student Result</h3>${structuredTextHtml(studentRecord.result)}</div>` : '';
  const reportModel = buildAdaptiveReportModel(sections);
  const adaptiveLayout = buildAdaptiveReportLayout(reportModel, resolvedImages.manualImages);
  const reportContentHtml = renderReportModel(adaptiveLayout, resolvedImages.manualImages, { studentObservation, studentResult });
  const warningHtml = resolvedImages.warnings?.length ? `<section class="report-section"><div class="section-opening"><h2 class="report-section-title">Image Preparation Warnings</h2><ul class="report-list">${resolvedImages.warnings.map((warning) => `<li>${escapeHtml(warning.label)} could not be included.</li>`).join('')}</ul></div></section>` : '';

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
    @page { size: A4; margin: 14mm 13mm 15mm 13mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #172033; font-size: 10.5pt; line-height: 1.45; text-align: left; }
    h1, h2, h3, p, ul, ol, figure, table { margin: 0; }
    h1 { color: #0B5CAD; font-size: 19.5pt; line-height: 1.18; margin-bottom: 5px; }
    .report-heading { color: #172033; font-size: 14pt; font-weight: 700; line-height: 1.25; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #CBD5E1; break-after: avoid; page-break-after: avoid; }
    .report-section-title { color: #172033; font-size: 14pt; font-weight: 700; line-height: 1.25; margin: 16px 0 7px; padding-bottom: 4px; border-bottom: 1px solid #CBD5E1; break-after: avoid; page-break-after: avoid; }
    .report-subsection-title { color: #172033; font-size: 12pt; font-weight: 700; line-height: 1.3; margin: 12px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #E2E8F0; break-after: avoid; page-break-after: avoid; }
    .report-paragraph { margin: 0 0 7px; line-height: 1.45; white-space: normal; orphans: 3; widows: 3; }
    .report-section { margin: 0 0 12px; break-inside: auto; page-break-inside: auto; }
    .section-opening, .observation-opening, .keep-together, .table--small, .graph-block, .graph-values-block, .signoff-block, .completion-summary-block { break-inside: avoid; page-break-inside: avoid; }
    .keep-with-next { break-after: avoid; page-break-after: avoid; }
    .allow-break { break-inside: auto; page-break-inside: auto; }
    .force-page-before { break-before: page; page-break-before: always; }
    .page-break-before { break-before: page; page-break-before: always; }
    .page-break-after { break-after: page; page-break-after: always; }
    .report-details-page { break-after: page; page-break-after: always; }
    .cover { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px 12px; border-radius: 5px; break-inside: avoid; page-break-inside: avoid; }
    .report-details-page .report-heading, .report-details-page .report-section-title { margin-top: 11px; margin-bottom: 5px; }
    .report-meta-table, .student-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 7px 0 14px; break-inside: auto; page-break-inside: auto; }
    .report-table th, .report-table td { border: 1px solid #CBD5E1; padding: 6px 7px; text-align: left; vertical-align: top; font-size: 9.8pt; line-height: 1.3; overflow-wrap: anywhere; word-break: normal; }
    .report-table th { background: #F1F5F9; font-weight: 700; }
    .report-table thead { display: table-header-group; }
    .report-meta-table .label-column { width: 32%; background: #F8FAFC; }
    .report-meta-table .value-column { width: 68%; }
    .report-details-page .report-table { margin: 5px 0 9px; }
    .report-details-page .report-table th, .report-details-page .report-table td { padding: 5px 7px; line-height: 1.3; font-size: 9.6pt; }
    .completion-summary-block { margin-top: 9px; }
    .completion-columns { display: flex; gap: 18px; align-items: flex-start; margin-top: 5px; }
    .completion-column { width: 50%; }
    .completion-item, .record-check-item { display: flex; align-items: flex-start; margin: 3px 0; line-height: 1.3; break-inside: avoid; page-break-inside: avoid; }
    .completion-check { flex: 0 0 16px; color: #16865C; font-weight: 700; }
    .record-checklist { margin-top: 4px; }
    .report-list { margin: 6px 0 10px; padding-left: 20px; }
    .report-list li { margin-bottom: 4px; padding-left: 3px; line-height: 1.4; break-inside: avoid; page-break-inside: avoid; }
    .report-numbered-list { margin: 6px 0 11px; }
    .report-numbered-item { display: flex; align-items: flex-start; margin: 0 0 5px; break-inside: avoid; page-break-inside: avoid; }
    .report-numbered-marker { flex: 0 0 26px; text-align: right; margin-right: 8px; font-weight: 600; }
    .report-numbered-body { flex: 1; min-width: 0; line-height: 1.4; }
    .content-label { font-weight: 700; margin: 8px 0 5px; text-transform: none; break-after: avoid; page-break-after: avoid; }
    .formula-block { background: #F8FAFC; border-left: 3px solid #2563A8; padding: 7px 10px; margin: 7px 0 10px; line-height: 1.45; overflow-wrap: anywhere; break-inside: avoid; page-break-inside: avoid; }
    .pdf-image { width: 100%; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .pdf-image img { display: block; width: auto; height: auto; object-fit: contain; margin: 0 auto; border: 1px solid #E2E8F0; }
    .pdf-image--diagram { margin: 7px 0 12px; }
    .pdf-image--diagram img { max-width: 100%; max-height: 125mm; }
    .pdf-image--wide-diagram { margin: 7px 0 12px; }
    .pdf-image--wide-diagram img { max-width: 100%; max-height: 100mm; }
    .pdf-image--document-page { text-align: center; margin: 6px 0 10px; break-inside: avoid; page-break-inside: avoid; }
    .pdf-image--document-page img { display: block; max-width: 94%; max-height: 245mm; width: auto; height: auto; object-fit: contain; margin: 0 auto; }
    .observation-section { break-before: page; page-break-before: always; }
    .observation-section > .pdf-image--document-page { break-before: page; page-break-before: always; }
    .observation-section .pdf-image--document-page + .pdf-image--document-page { break-before: page; page-break-before: always; }
    .pdf-image--photo, .pdf-image--signal, .pdf-image--signal-wide, .pdf-image--wide-photo { text-align: center; margin: 8px 0 14px; break-inside: avoid; page-break-inside: avoid; }
    .pdf-image--photo img { max-width: 78%; max-height: 125mm; }
    .pdf-image--wide-photo img { max-width: 88%; max-height: 110mm; }
    .pdf-image--signal img { max-width: 72%; max-height: 125mm; }
    .pdf-image--signal-wide img { max-width: 88%; max-height: 105mm; }
    .image-caption { margin-top: 5px; font-size: 8.5pt; line-height: 1.3; color: #64748B; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .image-warning { margin: 10px 0 12px; padding: 8px 10px; border: 1px solid #FEC84B; background: #FFFAEB; color: #A15C07; font-weight: 700; break-inside: avoid; page-break-inside: avoid; }
    .note { border-left: 4px solid #0B5CAD; background: #F8FAFC; padding: 8px 10px; margin: 8px 0 12px; }
    .manual-table-text { white-space: pre-wrap; border: 1px solid #CBD5E1; padding: 8px; background: #F8FAFC; font-family: Arial, Helvetica, sans-serif; font-size: 9.8pt; }
    .table-block { break-inside: auto; page-break-inside: auto; }
    .table--small { break-inside: avoid; page-break-inside: avoid; }
    .table--wide .report-table th, .table--wide .report-table td, .table--long .report-table th, .table--long .report-table td { font-size: 9pt; padding: 5px 6px; }
    .graph-block { margin-top: 8px; break-inside: avoid; page-break-inside: avoid; }
    .graph-image, .graph-container { display: block; max-width: 94%; max-height: 92mm; width: auto; height: auto; margin: 7px auto 0; }
    .graph-values-block { margin-top: 10px; break-inside: avoid; page-break-inside: avoid; }
    .signoff-block { margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
    .signature-row { display: flex; gap: 28px; margin-top: 24px; }
    .signature-column { width: 50%; }
    .signature-line { border-top: 1px solid #172033; padding-top: 5px; font-size: 9.5pt; }
  </style></head><body>
    <div class="report-details-page">
      <section class="cover"><h1>Akademika Learning</h1><h2 class="report-section-title">Complete Experiment Report</h2><table class="report-table report-meta-table"><tbody>${coverRows.map(([label, value]) => `<tr><th class="label-column">${escapeHtml(label)}</th><td class="value-column">${escapeHtml(value)}</td></tr>`).join('')}</tbody></table></section>
      <section class="report-section"><div class="section-opening"><h2 class="report-section-title">Student Details</h2>${userDetailsHtml(user)}</div></section>
      ${completionHtml(completionDetails)}
    </div>
    ${reportContentHtml}
    ${warningHtml}
    ${studentRecordHtml(studentRecord)}
    ${capturedSignalsHtml(resolvedImages.captured)}
    ${studentTableHtml(studentRecord.table)}
    ${graphsHtml(studentRecord.table, studentRecord)}
    ${completionDetails?.percentage === 100 ? '<section class="report-section signoff-block"><h2 class="report-section-title">Sign-off</h2><div class="signature-row"><div class="signature-column"><div class="signature-line">Student Signature</div></div><div class="signature-column"><div class="signature-line">Faculty Signature</div></div></div></section>' : ''}
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
