import { getCurrentUser, getDrafts, setDrafts } from './storage';
import { makeId } from '../utils/ids';
import { calculateProgress } from '../utils/progress';

const getDraftOwnerId = (user) => user?.id || user?.firebaseUid || user?.email || 'local-user';

export const saveDraftPatch = async ({ productId, experimentId, patch = {}, openedSection }) => {
  const user = await getCurrentUser();
  if (!productId || !experimentId) return null;

  const userId = getDraftOwnerId(user);
  const drafts = await getDrafts();
  const index = drafts.findIndex((draft) => {
    const sameExperiment = draft.productId === productId && draft.experimentId === experimentId;
    return sameExperiment && (!draft.userId || draft.userId === userId);
  });

  const existing = index >= 0 ? drafts[index] : {
    id: makeId('draft'),
    userId,
    productId,
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

  const openedSections = openedSection ? Array.from(new Set([...(existing.openedSections || []), openedSection])) : existing.openedSections || [];
  const nextDraft = { ...existing, ...patch, userId: existing.userId || userId, openedSections, lastSavedAt: new Date().toISOString() };
  nextDraft.progress = calculateProgress(nextDraft);

  if (index >= 0) drafts[index] = nextDraft;
  else drafts.push(nextDraft);

  await setDrafts(drafts);
  return nextDraft;
};
