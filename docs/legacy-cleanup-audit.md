# Legacy Cleanup Audit

Date: 2026-07-21

## Protected Permanent Content

- Manual index: `src/content/manualIndex.json`
- Manual content root: `src/content/manuals/`
- Catalog index: `src/content/catalogIndex.json`
- Catalog content root: `src/content/catalogs/`
- Manual registry: `src/content/contentRegistry.js`
- Catalog registry: `src/content/catalogAssets.generated.js`
- Manual preparation: `scripts/validateManualContent.js`, `scripts/generateManualAssetRegistry.js`
- Catalog preparation: `scripts/validateCatalogContent.js`, `scripts/generateCatalogAssetRegistry.js`

## ADA Protection

- ADA product ID: `bel-ada`
- Basic Electronics category ID: `basic-electronics`
- ADA catalog ID: `bel-ada`
- Preserved catalog files: `src/content/catalogs/bel-ada/catalogContent.json`, `src/content/catalogs/bel-ada/pages/page_001.webp`
- Preserved catalog index entry: `src/content/catalogIndex.json`
- Preserved catalog registry entry: `src/content/catalogAssets.generated.js`
- Preserved product data entry: `src/data/products.js`

## Deleted Legacy Items

| Path | Purpose | Referenced before cleanup | Old method | Safe to delete | Replacement |
| --- | --- | --- | --- | --- | --- |
| `src/config/manualConfig.js` | PC-hosted manual image URL and port 5055 config | Only by old `src/data/manualData.js` fallback | Local manual image server | Yes | `src/content/manuals/{manualId}/images/` via generated registry |
| `src/data/bundledManualPages.js` | Static requires for old scanned OCR pages under `assets/02_processed_manuals` | Only by old `src/data/manualData.js` fallback | Manually bundled scanned pages | Yes | `src/content/contentRegistry.js` |
| `src/data/json/manuals.json` | Old manual page folder metadata and absolute processing paths | Only by old `src/data/manualData.js` fallback | OCR/manual page mapping | Yes | `src/content/manualIndex.json` |
| `src/data/json/experimentMapping.json` | Old PDF page-to-section mapping | Only by old `src/data/manualData.js` fallback | OCR/manual page mapping | Yes | `src/content/manuals/{manualId}/manualContent.json` |
| `src/data/json/manual_link_report.json` | Old product-to-manual link report | Only by old `src/data/products.js` legacy mapping | OCR/manual page mapping | Yes | `src/content/manualIndex.json` |
| `src/data/json/mapping_quality_summary_v2.json` | Old processing quality report | Not used at runtime | OCR processing artifact | Yes | Streamlit/GitHub review workflow |
| `src/data/json/products_from_manuals.json` | Old generated product metadata | Not used at runtime | OCR processing artifact | Yes | `src/data/products.js` plus content indexes |
| `assets/02_processed_manuals/` | Old scanned manual page images | Only through removed `bundledManualPages` and PC URL fallback | Manually bundled scanned pages | Yes | `src/content/manuals/{manualId}/images/` |
| `src/config/contentEditorConfig.js` | Temporary mobile ACS editor feature flag | Only by removed mobile editor storage/screen | Mobile admin editor | Yes | Streamlit Content Creator |
| `src/storage/contentEditorStorage.js` | Temporary ACS draft/export storage | Only by removed mobile editor screen/buttons | Mobile admin editor | Yes | Streamlit -> GitHub branch -> PR workflow |
| `src/screens/ContentEditorScreen.js` | Temporary mobile content editor UI | Only by removed route/buttons | Mobile admin editor | Yes | Streamlit Content Creator |

## Kept Because Referenced Or Permanent

- `Akademika-json-creater/`: retained as the Streamlit/GitHub content creator workflow.
- `src/content/manuals/acs/`: retained because it is referenced by `src/content/manualIndex.json`.
- `src/content/manuals/bel-ada/`: retained as permanent merged ADA manual content.
- PNG originals inside `src/content/manuals/bel-ada/`: retained because they are genuine content files referenced by JSON keys, even though generated requires prefer `.webp` assets.
- App branding assets in `assets/`: retained.

## Validation

- `npm install`: passed with Node engine warnings under Node 18.
- `npm run content:prepare`: passed.
- `npm run export:android`: passed.
- `npx expo export --platform ios --output-dir /tmp/akademika-sdk54-export-ios`: passed.
- `npm run start:tunnel`: not run per instruction to not run the app.
