import { catalogAssets } from '../content/catalogAssets.generated';

export const getCatalogImageSource = (productId, imageFile) => {
  const source = catalogAssets[productId]?.[imageFile] || null;
  if (!source && __DEV__) {
    console.warn(`Missing catalog image asset for ${productId}: ${imageFile}`);
  }
  return source;
};
