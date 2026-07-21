import { getCurrentUser, getDrafts, setDrafts } from './storage';
import { makeId } from '../utils/ids';
import { applyProgressToDraft } from '../services/experimentProgressService';
import { getDraftOwnerId } from '../auth/userRole';

export const saveDraftPatch = async ({ productId, experimentId, manualId, patch = {}, openedSection }) => {
  const user = await getCurrentUser();
  if (!productId || !experimentId) return null;

  const userId = getDraftOwnerId(user);
  const drafts = await getDrafts();
  const index = drafts.findIndex((draft) => {
    const sameExperiment = draft.productId === productId && draft.experimentId === experimentId;
    const sameManual = manualId ? (!draft.manualId || draft.manualId === manualId) : true;
    return sameExperiment && sameManual && (!draft.userId || draft.userId === userId);
  });

  const existing = index >= 0 ? drafts[index] : {
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

  const openedSections = openedSection ? Array.from(new Set([...(existing.openedSections || []), openedSection])) : existing.openedSections || [];
  const nextDraft = applyProgressToDraft({
    ...existing,
    ...patch,
    manualId: patch.manualId || existing.manualId || manualId,
    userId: existing.userId || userId,
    openedSections,
    lastSavedAt: new Date().toISOString(),
  });

  if (index >= 0) drafts[index] = nextDraft;
  else drafts.push(nextDraft);

  await setDrafts(drafts);
  return nextDraft;
};
