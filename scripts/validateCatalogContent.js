const fs = require('fs');
const path = require('path');

const root = process.cwd();
const toPosix = (value) => value.split(path.sep).join('/');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const fail = (errors) => {
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exit(1);
  }
};
const isUnsafe = (value) => path.isAbsolute(value || '') || (value || '').split('/').includes('..') || (value || '').startsWith('data:') || (value || '').includes('base64,');

const productsSource = fs.readFileSync(path.join(root, 'src/data/products.js'), 'utf8');
const categoryMatches = [...productsSource.matchAll(/\{ id: '([^']+)', name: '([^']+)' \}/g)].map((match) => ({ id: match[1], name: match[2] }));
const productMatches = [...productsSource.matchAll(/makeProduct\('([^']+)', '([^']+)', '([^']+)'\)/g)].map((match) => ({ id: match[1], categoryId: match[2], name: match[3] }));
const categories = new Map(categoryMatches.map((item) => [item.id, item]));
const products = new Map(productMatches.map((item) => [item.id, item]));
const errors = [];
const indexPath = path.join(root, 'src/content/catalogIndex.json');

if (!fs.existsSync(indexPath)) {
  errors.push('src/content/catalogIndex.json is missing.');
  fail(errors);
}

const index = readJson(indexPath);
const catalogs = index.catalogs || {};
const seenCatalogIds = new Set();

Object.entries(catalogs).forEach(([catalogId, entry]) => {
  if (seenCatalogIds.has(catalogId)) errors.push(`Duplicate catalogId: ${catalogId}`);
  seenCatalogIds.add(catalogId);
  if (isUnsafe(entry.contentFile)) errors.push(`Unsafe contentFile path: ${entry.contentFile}`);
  const contentPath = path.join(root, entry.contentFile || '');
  if (!toPosix(path.relative(root, contentPath)).startsWith('src/content/catalogs/')) errors.push(`contentFile outside catalog content folder: ${entry.contentFile}`);
  if (!fs.existsSync(contentPath)) {
    errors.push(`Missing contentFile: ${entry.contentFile}`);
    return;
  }
  const product = products.get(entry.productId);
  if (!product) errors.push(`Unknown productId: ${entry.productId}`);
  if (!categories.has(entry.categoryId)) errors.push(`Unknown categoryId: ${entry.categoryId}`);
  if (product && product.categoryId !== entry.categoryId) errors.push(`Product ${entry.productId} does not belong to category ${entry.categoryId}.`);
  const content = readJson(contentPath);
  if (content.productId !== entry.productId) errors.push(`Catalog content productId mismatch for ${catalogId}.`);
  if (content.categoryId !== entry.categoryId) errors.push(`Catalog content categoryId mismatch for ${catalogId}.`);
  if (content.pageCount !== (content.pages || []).length) errors.push(`Page count mismatch for ${catalogId}.`);
  const pageNumbers = new Set();
  (content.pages || []).forEach((page, index) => {
    if (page.pageNumber !== index + 1) errors.push(`Invalid page order in ${catalogId}.`);
    if (pageNumbers.has(page.pageNumber)) errors.push(`Duplicate page number ${page.pageNumber} in ${catalogId}.`);
    pageNumbers.add(page.pageNumber);
    if (isUnsafe(page.imageFile)) errors.push(`Unsafe imageFile in ${catalogId}: ${page.imageFile}`);
    const imagePath = path.join(path.dirname(contentPath), page.imageFile || '');
    if (!toPosix(path.relative(root, imagePath)).startsWith('src/content/catalogs/')) errors.push(`Image outside catalog folder: ${page.imageFile}`);
    if (!fs.existsSync(imagePath)) errors.push(`Missing page image: ${toPosix(path.relative(root, imagePath))}`);
  });
  if (content.coverImage) {
    if (isUnsafe(content.coverImage)) errors.push(`Unsafe cover image path in ${catalogId}.`);
    const coverPath = path.join(path.dirname(contentPath), content.coverImage);
    if (!fs.existsSync(coverPath)) errors.push(`Missing cover image: ${toPosix(path.relative(root, coverPath))}`);
  }
});

fail(errors);
console.log('Catalog content validation passed.');
