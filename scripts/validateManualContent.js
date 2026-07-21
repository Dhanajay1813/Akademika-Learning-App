const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'src/content/manualIndex.json');
const productsPath = path.join(root, 'src/data/products.js');
const toPosix = (value) => value.split(path.sep).join('/');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const isUnsafe = (value) => path.isAbsolute(value || '') || (value || '').split('/').includes('..') || (value || '').startsWith('data:') || (value || '').includes('base64,');
const stripImageExtension = (value) => value.replace(/\.[^.]+$/, '');
const assetExtensions = ['.webp', '.png', '.jpg', '.jpeg'];

const fail = (errors) => {
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exit(1);
  }
};

const findAssetPath = (manualDir, imageFile) => {
  const directPath = path.join(manualDir, imageFile);
  if (fs.existsSync(directPath)) return directPath;

  const parsed = path.parse(imageFile);
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

const errors = [];
if (!fs.existsSync(indexPath)) {
  errors.push('src/content/manualIndex.json is missing.');
  fail(errors);
}

const productsSource = fs.readFileSync(productsPath, 'utf8');
const categoryMatches = [...productsSource.matchAll(/\{ id: '([^']+)', name: '([^']+)' \}/g)].map((match) => ({ id: match[1], name: match[2] }));
const productMatches = [...productsSource.matchAll(/makeProduct\('([^']+)', '([^']+)', '([^']+)'/g)].map((match) => ({ id: match[1], categoryId: match[2], name: match[3] }));
const categories = new Map(categoryMatches.map((item) => [item.id, item]));
const products = new Map(productMatches.map((item) => [item.id, item]));
const index = readJson(indexPath);
const seenManualIds = new Set();

(index.manuals || []).forEach((entry) => {
  if (seenManualIds.has(entry.manualId)) errors.push(`Duplicate manualId: ${entry.manualId}`);
  seenManualIds.add(entry.manualId);
  if (isUnsafe(entry.path)) errors.push(`Unsafe manual path: ${entry.path}`);
  const contentPath = path.join(root, entry.path || '');
  const relativeContentPath = toPosix(path.relative(root, contentPath));
  if (!relativeContentPath.startsWith('src/content/manuals/')) errors.push(`Manual path outside permanent content folder: ${entry.path}`);
  if (!fs.existsSync(contentPath)) {
    errors.push(`Missing manual content file: ${entry.path}`);
    return;
  }

  const product = products.get(entry.productId);
  if (!product) errors.push(`Unknown productId: ${entry.productId}`);
  if (!categories.has(entry.categoryId)) errors.push(`Unknown categoryId: ${entry.categoryId}`);
  if (product && product.categoryId !== entry.categoryId) errors.push(`Product ${entry.productId} does not belong to category ${entry.categoryId}.`);

  const content = readJson(contentPath);
  const manual = content.manuals?.[entry.manualId];
  if (!manual) {
    errors.push(`Manual content missing manualId ${entry.manualId}: ${entry.path}`);
    return;
  }
  if (manual.manualId !== entry.manualId) errors.push(`manualId mismatch for ${entry.manualId}.`);
  if (manual.productId !== entry.productId) errors.push(`productId mismatch for ${entry.manualId}.`);
  if (manual.categoryId !== entry.categoryId) errors.push(`categoryId mismatch for ${entry.manualId}.`);
  if (entry.experimentCount !== (manual.experiments || []).length) errors.push(`Experiment count mismatch for ${entry.manualId}.`);

  const manualDir = path.dirname(contentPath);
  collectImageFiles(manual).forEach((imageFile) => {
    if (isUnsafe(imageFile)) errors.push(`Unsafe imageFile in ${entry.manualId}: ${imageFile}`);
    const imagePath = findAssetPath(manualDir, imageFile);
    const relativeImagePath = toPosix(path.relative(root, imagePath));
    if (!relativeImagePath.startsWith('src/content/manuals/')) errors.push(`Manual image outside permanent content folder: ${imageFile}`);
    if (!fs.existsSync(imagePath)) {
      errors.push(`Missing manual image: ${relativeImagePath}`);
    } else if (stripImageExtension(toPosix(path.relative(manualDir, imagePath))) !== stripImageExtension(imageFile)) {
      errors.push(`Manual image extension fallback points to an unexpected file: ${imageFile}`);
    }
  });
});

fail(errors);
console.log('Manual content validation passed.');
