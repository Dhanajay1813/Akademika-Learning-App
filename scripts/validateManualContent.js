const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

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

const collectImageItems = (manual) => {
  const imageItems = [];
  const seen = new Set();
  const addItem = (item) => {
    const imageFile = typeof item === 'string' ? item : item?.imageFile;
    if (!imageFile || seen.has(imageFile)) return;
    seen.add(imageFile);
    imageItems.push(typeof item === 'string' ? { imageFile } : item);
  };
  const visitBlock = (block) => {
    if (!block || typeof block !== 'object') return;
    if (Array.isArray(block.imageFiles) && block.imageFiles.length) {
      block.imageFiles.forEach(addItem);
      return;
    }
    addItem(block.imageFile);
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
  return imageItems.sort((a, b) => a.imageFile.localeCompare(b.imageFile));
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
  collectImageItems(manual).forEach((item) => {
    const imageFile = item.imageFile;
    if (isUnsafe(imageFile)) errors.push(`Unsafe imageFile in ${entry.manualId}: ${imageFile}`);
    if (item.width !== undefined && Number(item.width) <= 0) errors.push(`Invalid width for ${entry.manualId}: ${imageFile}`);
    if (item.height !== undefined && Number(item.height) <= 0) errors.push(`Invalid height for ${entry.manualId}: ${imageFile}`);
    if (item.byteSize !== undefined && Number(item.byteSize) <= 0) errors.push(`Invalid byteSize for ${entry.manualId}: ${imageFile}`);
    const imagePath = findAssetPath(manualDir, imageFile);
    const relativeImagePath = toPosix(path.relative(root, imagePath));
    if (!relativeImagePath.startsWith('src/content/manuals/')) errors.push(`Manual image outside permanent content folder: ${imageFile}`);
    if (!fs.existsSync(imagePath)) {
      errors.push(`Missing manual image: ${relativeImagePath}`);
    } else {
      if (stripImageExtension(toPosix(path.relative(manualDir, imagePath))) !== stripImageExtension(imageFile)) {
        errors.push(`Manual image extension fallback points to an unexpected file: ${imageFile}`);
      }
      if (item.sha256 && sha256(imagePath) !== item.sha256) errors.push(`SHA-256 mismatch for ${entry.manualId}: ${imageFile}`);
      if (item.byteSize && fs.statSync(imagePath).size !== Number(item.byteSize)) errors.push(`byteSize mismatch for ${entry.manualId}: ${imageFile}`);
    }
  });
});

fail(errors);
console.log('Manual content validation passed.');
