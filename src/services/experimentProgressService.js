import { getDraftOwnerId } from '../auth/userRole';
import { getExperimentById } from '../data/experiments';
import { getMappedExperiment } from '../data/manualData';
import { getCurrentUser, getDrafts, setDrafts } from '../storage/storage';
import { hasFilledTable } from '../utils/graphUtils';
import { makeId } from '../utils/ids';

export const PROGRESS_SCHEMA_VERSION = 2;

const SECTION_LABELS = {
  objective: 'Objective',
  theory: 'Theory',
  functionalBlock: 'Functional Block',
  procedure: 'Procedure',
  observation: 'Observation',
  equipments: 'Equipments',
  result: 'Result',
  conclusion: 'Conclusion',
  datasheet: 'Datasheet',
  blockDiagram: 'Block Diagram',
  circuitDiagram: 'Circuit Diagram',
  referenceSignal: 'Reference Signal',
};

const STANDARD_SECTIONS = ['objective', 'theory', 'functionalBlock', 'procedure', 'observation', 'equipments', 'result', 'conclusion'];
const TECHNICAL_SECTIONS = ['datasheet', 'blockDiagram', 'circuitDiagram', 'referenceSignal'];

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

function hasValidTableRows(rows) {
  return Array.isArray(rows) && rows.some((row) => Array.isArray(row) && row.some((cell) => hasText(String(cell || ''))));
}

export function hasValidContent(value) {
  if (!value) return false;
  if (hasText(value)) return true;
  if (Array.isArray(value)) return value.some(hasValidContent);
  if (typeof value !== 'object') return false;
  if (Array.isArray(value.pages) && value.pages.some((page) => Number(page) > 0)) return true;
  if (Array.isArray(value.blocks) && value.blocks.some(hasValidContent)) return true;
  if (hasText(value.text) || hasText(value.tableData) || hasText(value.imageFile)) return true;
  if (Array.isArray(value.imageFiles) && value.imageFiles.some((item) => (typeof item === 'string' ? hasText(item) : hasText(item?.imageFile)))) return true;
  if (hasValidTableRows(value.rows)) return true;
  if (value.type === 'note' && hasText(value.note)) return true;
  return false;
}

export function getProgressExperiment(manualId, experimentId) {
  return getMappedExperiment(manualId, experimentId) || getExperimentById(experimentId) || null;
}

function makeSectionItem(sectionKey, value, technical = false) {
  if (!hasValidContent(value)) return null;
  return {
    key: technical ? `section:technical:${sectionKey}` : `section:${sectionKey}`,
    type: 'section',
    sectionKey,
    technical,
    label: SECTION_LABELS[sectionKey] || sectionKey,
    completeLabel: `${SECTION_LABELS[sectionKey] || sectionKey} reviewed`,
    pendingLabel: `${SECTION_LABELS[sectionKey] || sectionKey} not marked complete`,
  };
}

function hasProcedureContent(sections) {
  return hasValidContent(sections?.procedure);
}

export function getExperimentCompletionItems({ manualId, experimentId, draft } = {}) {
  const experiment = getProgressExperiment(manualId, experimentId);
  const sections = experiment?.sections || {};
  const items = [];

  STANDARD_SECTIONS.forEach((sectionKey) => {
    const item = makeSectionItem(sectionKey, sections[sectionKey], false);
    if (item) items.push(item);
  });

  TECHNICAL_SECTIONS.forEach((sectionKey) => {
    const item = makeSectionItem(sectionKey, sections.technicalData?.[sectionKey], true);
    if (item) items.push(item);
  });

  return items.map((item) => ({ ...item, completed: isCompletionItemComplete(item, draft) }));
}

export function isCompletionItemComplete(item, draft = {}) {
  if (!item) return false;
  if (item.type === 'section') return Boolean(draft?.progressState?.completedItems?.[item.key]);
  if (item.key === 'activity:capture') return Boolean(draft?.capturedImages?.some((image) => hasText(image?.uri)));
  if (item.key === 'activity:table') return hasFilledTable(draft?.table);
  if (item.key === 'activity:graph') return Boolean(draft?.graph?.generated);
  return false;
}

export function calculateExperimentProgress({ productId, manualId, experimentId, draft } = {}) {
  const items = getExperimentCompletionItems({ manualId, experimentId, draft });
  const totalCount = items.length;
  const completedCount = items.filter((item) => item.completed).length;
  const calculated = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const percentage = Math.max(0, Math.min(100, calculated));
  const pendingItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    productId,
    manualId,
    experimentId,
    percentage,
    completedCount,
    totalCount,
    items,
    completedItems,
    pendingItems,
    statusText: totalCount === 0
      ? 'No completion requirements are available'
      : percentage === 100
        ? 'Experiment Completed'
        : `${totalCount - completedCount} ${totalCount - completedCount === 1 ? 'item' : 'items'} remaining`,
  };
}

export function getIncompleteExperimentItems(args) {
  return calculateExperimentProgress(args).pendingItems;
}

function buildProgressState(existing = {}, completedItems = {}) {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    completedItems,
    updatedAt: new Date().toISOString(),
    previousProgress: Number.isFinite(existing?.legacyProgress) ? existing.legacyProgress : existing?.previousProgress,
  };
}

export function applyProgressToDraft(draft = {}) {
  const summary = calculateExperimentProgress({
    productId: draft.productId,
    manualId: draft.manualId,
    experimentId: draft.experimentId,
    draft,
  });
  const applicableKeys = new Set(summary.items.map((item) => item.key));
  const rawCompleted = draft.progressState?.completedItems || {};
  const completedItems = Object.fromEntries(Object.entries(rawCompleted).filter(([key, value]) => applicableKeys.has(key) && value));
  const cleanedDraft = {
    ...draft,
    progressState: buildProgressState({ ...draft.progressState, legacyProgress: draft.progress }, completedItems),
  };
  const cleanedSummary = calculateExperimentProgress({
    productId: cleanedDraft.productId,
    manualId: cleanedDraft.manualId,
    experimentId: cleanedDraft.experimentId,
    draft: cleanedDraft,
  });
  return {
    ...cleanedDraft,
    progress: cleanedSummary.percentage,
    progressSummary: {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      completedCount: cleanedSummary.completedCount,
      totalCount: cleanedSummary.totalCount,
      statusText: cleanedSummary.statusText,
      updatedAt: cleanedDraft.progressState.updatedAt,
    },
  };
}

async function getProgressDraftIndex({ userId, productId, manualId, experimentId }) {
  const drafts = await getDrafts();
  const index = drafts.findIndex((draft) => {
    const sameExperiment = draft.productId === productId && draft.experimentId === experimentId;
    const sameManual = manualId ? (!draft.manualId || draft.manualId === manualId) : true;
    return sameExperiment && sameManual && (!draft.userId || draft.userId === userId);
  });
  return { drafts, index };
}

function createProgressDraft({ userId, productId, manualId, experimentId }) {
  return {
    id: makeId('draft'),
    userId,
    productId,
    manualId,
    experimentId,
    openedSections: [],
    capturedImages: [],
    table: { tableName: 'Observation Table', columns: ['Voltage', 'Current'], rows: [['', '']] },
    graph: { generated: false, xAxis: '', yAxis: '', graphType: 'line' },
    observation: '',
    result: '',
    pdfGenerated: false,
    pdfUri: null,
  };
}

export async function loadExperimentProgress({ productId, manualId, experimentId }) {
  const user = await getCurrentUser();
  const userId = getDraftOwnerId(user);
  const { drafts, index } = await getProgressDraftIndex({ userId, productId, manualId, experimentId });
  const draft = index >= 0 ? drafts[index] : createProgressDraft({ userId, productId, manualId, experimentId });
  return calculateExperimentProgress({ productId, manualId: draft.manualId || manualId, experimentId, draft });
}

async function setSectionCompletion({ productId, manualId, experimentId, sectionKey, technical = false, complete }) {
  const user = await getCurrentUser();
  const userId = getDraftOwnerId(user);
  const { drafts, index } = await getProgressDraftIndex({ userId, productId, manualId, experimentId });
  const existing = index >= 0 ? drafts[index] : createProgressDraft({ userId, productId, manualId, experimentId });
  const itemKey = technical ? `section:technical:${sectionKey}` : `section:${sectionKey}`;
  const completedItems = { ...(existing.progressState?.completedItems || {}) };
  if (complete) completedItems[itemKey] = true;
  else delete completedItems[itemKey];
  const nextDraft = applyProgressToDraft({
    ...existing,
    userId: existing.userId || userId,
    productId,
    manualId: existing.manualId || manualId,
    experimentId,
    progressState: buildProgressState(existing.progressState, completedItems),
    lastSavedAt: new Date().toISOString(),
  });
  if (index >= 0) drafts[index] = nextDraft;
  else drafts.push(nextDraft);
  await setDrafts(drafts);
  return calculateExperimentProgress({ productId, manualId: nextDraft.manualId || manualId, experimentId, draft: nextDraft });
}

export const markSectionComplete = (args) => setSectionCompletion({ ...args, complete: true });
export const markSectionIncomplete = (args) => setSectionCompletion({ ...args, complete: false });

export async function saveExperimentProgress({ productId, manualId, experimentId, completedItems = {} }) {
  const user = await getCurrentUser();
  const userId = getDraftOwnerId(user);
  const { drafts, index } = await getProgressDraftIndex({ userId, productId, manualId, experimentId });
  const existing = index >= 0 ? drafts[index] : createProgressDraft({ userId, productId, manualId, experimentId });
  const nextDraft = applyProgressToDraft({
    ...existing,
    userId: existing.userId || userId,
    productId,
    manualId: existing.manualId || manualId,
    experimentId,
    progressState: buildProgressState(existing.progressState, completedItems),
    lastSavedAt: new Date().toISOString(),
  });
  if (index >= 0) drafts[index] = nextDraft;
  else drafts.push(nextDraft);
  await setDrafts(drafts);
  return calculateExperimentProgress({ productId, manualId: nextDraft.manualId || manualId, experimentId, draft: nextDraft });
}

export async function resetExperimentProgress({ productId, manualId, experimentId }) {
  return saveExperimentProgress({ productId, manualId, experimentId, completedItems: {} });
}
