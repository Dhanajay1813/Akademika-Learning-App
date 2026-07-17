export const calculateProgress = (draft = {}) => {
  let score = 0;
  if (draft.openedSections?.length) score += Math.min(draft.openedSections.length * 8, 40);
  if (draft.capturedImages?.length) score += 10;
  if (draft.table?.rows?.some((row) => row.some((cell) => String(cell).trim()))) score += 15;
  if (draft.graph?.generated) score += 10;
  if (draft.observation?.trim()) score += 10;
  if (draft.result?.trim()) score += 10;
  if (draft.pdfGenerated) score = 100;
  return Math.min(score, 100);
};
