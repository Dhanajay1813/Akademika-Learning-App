const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'src/content/manualIndex.json');
const outputPath = path.join(root, 'src/content/contentRegistry.js');
const pdfOutputPath = path.join(root, 'src/content/manualPdfAssets.generated.js');

const toPosix = (value) => value.split(path.sep).join('/');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const toVarName = (value) => `${value.replace(/[^A-Za-z0-9_$]/g, '_')}ManualContent`;
const stripImageExtension = (value) => value.replace(/\.[^.]+$/, '');
const assetExtensions = ['.webp', '.png', '.jpg', '.jpeg'];

const findAssetPath = (manualDir, imageFile) => {
  const parsed = path.parse(imageFile);
  const webpPath = path.join(manualDir, parsed.dir, `${parsed.name}.webp`);
  if (parsed.ext.toLowerCase() !== '.webp' && fs.existsSync(webpPath)) return webpPath;

  const directPath = path.join(manualDir, imageFile);
  if (fs.existsSync(directPath)) return directPath;

  for (const extension of assetExtensions) {
    const candidate = path.join(manualDir, parsed.dir, `${parsed.name}${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return directPath;
};

const collectImageFiles = (manual) => {
  const imageFiles = new Set();
  const addImage = (value) => {
    if (typeof value === 'string' && value.trim()) imageFiles.add(value);
  };
  const visitBlock = (block) => {
    if (!block || typeof block !== 'object') return;
    addImage(block.imageFile);
    if (Array.isArray(block.imageFiles)) {
      block.imageFiles.forEach((item) => {
        if (typeof item === 'string') addImage(item);
        else if (item && typeof item === 'object') addImage(item.imageFile);
      });
    }
  };

  (manual.experiments || []).forEach((experiment) => {
    const sections = experiment.sections || {};
    Object.entries(sections).forEach(([key, value]) => {
      if (key === 'technicalData' && value && typeof value === 'object') {
        Object.values(value).forEach((blocks) => (blocks || []).forEach(visitBlock));
      } else {
        (value || []).forEach(visitBlock);
      }
    });
  });
  return [...imageFiles].sort();
};

const index = fs.existsSync(indexPath) ? readJson(indexPath) : { manuals: [] };
const manuals = index.manuals || [];
const contentImports = [];
const manualEntries = [];
const assetEntries = [];

manuals.slice().sort((a, b) => a.manualId.localeCompare(b.manualId)).forEach((entry) => {
  const contentPath = path.join(root, entry.contentFile || entry.path);
  if (!fs.existsSync(contentPath)) {
    throw new Error(`Missing manual content file: ${entry.path}`);
  }

  const content = readJson(contentPath);
  const manual = content.manuals?.[entry.manualId];
  if (!manual) {
    throw new Error(`Manual content missing manualId ${entry.manualId}: ${entry.path}`);
  }

  const varName = toVarName(entry.manualId);
  const contentImportPath = `./${toPosix(path.relative(path.join(root, 'src/content'), contentPath))}`;
  contentImports.push(`import ${varName} from '${contentImportPath}';`);
  manualEntries.push(`  '${entry.manualId}': ${varName}.manuals['${entry.manualId}'],`);

  if (entry.contentMode === 'pdfPageMapping' || manual.contentMode === 'pdfPageMapping') return;

  const manualDir = path.dirname(contentPath);
  const lines = collectImageFiles(manual).map((imageFile) => {
    const assetPath = findAssetPath(manualDir, imageFile);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Missing manual image: ${toPosix(path.relative(root, assetPath))}`);
    }
    const requirePath = `./${toPosix(path.relative(path.join(root, 'src/content'), assetPath))}`;
    const key = `${entry.manualId}/${imageFile}`;
    const resolvedImageFile = toPosix(path.relative(manualDir, assetPath));
    const aliases = new Set([key]);
    if (resolvedImageFile !== imageFile && stripImageExtension(resolvedImageFile) === stripImageExtension(imageFile)) {
      aliases.add(`${entry.manualId}/${resolvedImageFile}`);
    }
    return [...aliases].sort().map((alias) => `  '${alias}': require('${requirePath}'),`).join('\n');
  });
  assetEntries.push(...lines.filter(Boolean));
});

const lines = [];
lines.push(...contentImports);
if (contentImports.length) lines.push('');
lines.push("import manualIndex from './manualIndex.json';");
lines.push('');
lines.push('export const submittedManualIndex = manualIndex;');
lines.push('');
lines.push('export const submittedManuals = {');
lines.push(...manualEntries);
lines.push('};');
lines.push('');
lines.push('export const submittedManualAssets = {');
lines.push(...assetEntries);
lines.push('};');
lines.push('');
lines.push('export const getSubmittedManualImageSource = (manualId, imageFile) => (');
lines.push('  submittedManualAssets[`${manualId}/${imageFile}`] || null');
lines.push(');');
lines.push('');
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);

const pdfLines = [];
pdfLines.push('export const manualPdfAssets = {');
manuals.slice().sort((a, b) => a.manualId.localeCompare(b.manualId)).forEach((entry) => {
  const contentPath = path.join(root, entry.contentFile || entry.path);
  if (!fs.existsSync(contentPath)) return;
  const content = readJson(contentPath);
  const manual = content.manuals?.[entry.manualId];
  if (entry.contentMode !== 'pdfPageMapping' && manual?.contentMode !== 'pdfPageMapping') return;
  const pdfFile = entry.pdfFile || `src/content/manuals/${entry.manualId}/${manual?.pdfFile || 'manual.pdf'}`;
  const pdfPath = path.join(root, pdfFile);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Missing manual PDF: ${pdfFile}`);
  }
  const requirePath = `./${toPosix(path.relative(path.join(root, 'src/content'), pdfPath))}`;
  pdfLines.push(`  '${entry.manualId}': require('${requirePath}'),`);
});
pdfLines.push('};');
pdfLines.push('');
fs.writeFileSync(pdfOutputPath, `${pdfLines.join('\n')}\n`);
console.log(`Generated ${toPosix(path.relative(root, outputPath))}`);
console.log(`Generated ${toPosix(path.relative(root, pdfOutputPath))}`);
