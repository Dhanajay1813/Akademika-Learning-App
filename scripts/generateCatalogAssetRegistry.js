const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'src/content/catalogIndex.json');
const outputPath = path.join(root, 'src/content/catalogAssets.generated.js');

const toPosix = (value) => value.split(path.sep).join('/');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const catalogIndex = fs.existsSync(indexPath) ? readJson(indexPath) : { catalogs: {} };
const catalogs = catalogIndex.catalogs || {};
const lines = [];
const contentImports = [];
const assetBlocks = [];
const contentEntries = [];

Object.keys(catalogs).sort().forEach((catalogId) => {
  const entry = catalogs[catalogId];
  const productId = entry.productId;
  const contentFile = path.join(root, entry.contentFile);
  if (!fs.existsSync(contentFile)) {
    throw new Error(`Missing catalog content file: ${entry.contentFile}`);
  }
  const varName = `${productId.replace(/[^A-Za-z0-9_$]/g, '_')}CatalogContent`;
  const contentImportPath = `./${toPosix(path.relative(path.join(root, 'src/content'), contentFile))}`;
  contentImports.push(`import ${varName} from '${contentImportPath}';`);
  contentEntries.push(`  '${productId}': ${varName},`);

  const content = readJson(contentFile);
  const assetLines = [];
  const addAsset = (imageFile) => {
    if (!imageFile) return;
    const imagePath = path.join(path.dirname(contentFile), imageFile);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing catalog image: ${toPosix(path.relative(root, imagePath))}`);
    }
    const requirePath = `./${toPosix(path.relative(path.join(root, 'src/content'), imagePath))}`;
    assetLines.push(`    '${imageFile}': require('${requirePath}'),`);
  };
  addAsset(content.coverImage);
  (content.pages || []).forEach((page) => addAsset(page.imageFile));
  assetBlocks.push(`  '${productId}': {\n${assetLines.join('\n')}\n  },`);
});

lines.push(...contentImports);
if (contentImports.length) lines.push('');
lines.push('export const catalogContents = {');
lines.push(...contentEntries);
lines.push('};');
lines.push('');
lines.push('export const catalogAssets = {');
lines.push(...assetBlocks);
lines.push('};');
lines.push('');
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`Generated ${toPosix(path.relative(root, outputPath))}`);
