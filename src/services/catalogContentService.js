import catalogIndex from '../content/catalogIndex.json';
import { catalogContents } from '../content/catalogAssets.generated';

export const getCatalogIndex = () => catalogIndex;

export const getCatalogEntry = (productId) => (
  productId ? catalogIndex.catalogs?.[productId] || null : null
);

export const getCatalogContent = (productId) => {
  const entry = getCatalogEntry(productId);
  if (!entry) return null;
  return catalogContents[entry.productId] || null;
};

export const getCatalogPages = (productId) => (
  getCatalogContent(productId)?.pages || []
);

export const hasCatalog = (productId) => Boolean(getCatalogEntry(productId) && getCatalogContent(productId));
