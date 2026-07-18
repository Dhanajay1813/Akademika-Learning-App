import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import ZoomableImage from '../components/ZoomableImage';
import { ManualTextRenderer } from '../components/ContentBlockRenderer';
import { colors } from '../constants/colors';
import { getProductById } from '../data/products';
import { getCatalogContent } from '../services/catalogContentService';
import { getCatalogImageSource } from '../services/catalogAssetService';

function CatalogImage({ productId, imageFile, label, width, maxHeight }) {
  const [failed, setFailed] = useState(false);
  const source = getCatalogImageSource(productId, imageFile);
  const height = useMemo(() => {
    const resolved = source ? Image.resolveAssetSource(source) : null;
    const sourceWidth = resolved?.width || 0;
    const sourceHeight = resolved?.height || 0;
    const ratio = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : 1.414;
    return Math.min(Math.max(width * ratio, 180), maxHeight);
  }, [maxHeight, source, width]);

  return (
    <View style={styles.pageWrap}>
      {failed || !source ? (
        <View style={[styles.image, styles.placeholder, { width, height }]}>
          <Text style={styles.placeholderText}>Catalog image missing.</Text>
        </View>
      ) : (
        <ZoomableImage
          source={source}
          label={label}
          width={width}
          height={height}
          imageStyle={styles.image}
          placeholderText="Catalog image missing."
          onError={() => setFailed(true)}
        />
      )}
      {label ? <Text style={styles.pageLabel}>{label}</Text> : null}
    </View>
  );
}

export default function CatalogScreen({ route }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const productId = route.params.productId;
  const product = getProductById(productId);
  const catalog = getCatalogContent(productId);
  const imageWidth = Math.max(180, windowWidth - 36);
  const imageMaxHeight = Math.max(240, windowHeight * 0.78);

  if (!catalog) {
    return (
      <ScreenContainer title="Catalog">
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Product catalog will be added soon.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Catalog" scroll={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.product}>{product?.name || catalog.productName}</Text>
        <Text style={styles.title}>{catalog.title}</Text>
        {catalog.version ? <Text style={styles.meta}>Version: {catalog.version}</Text> : null}
        {catalog.revisionDate ? <Text style={styles.meta}>Revision: {catalog.revisionDate}</Text> : null}
        {catalog.description ? (
          <View style={styles.description}>
            <ManualTextRenderer text={catalog.description} />
          </View>
        ) : null}
        <Text style={styles.meta}>Pages: {catalog.pageCount}</Text>
        {catalog.coverImage ? (
          <CatalogImage productId={productId} imageFile={catalog.coverImage} label="Cover" width={imageWidth} maxHeight={imageMaxHeight} />
        ) : null}
        {catalog.pages.map((page) => (
          <CatalogImage
            key={page.imageFile}
            productId={productId}
            imageFile={page.imageFile}
            label={`Page ${page.pageNumber}`}
            width={imageWidth}
            maxHeight={imageMaxHeight}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 18 },
  product: { color: colors.muted, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  meta: { color: colors.muted, fontSize: 14, marginBottom: 4 },
  description: { marginVertical: 10 },
  pageWrap: { alignItems: 'center', marginTop: 14 },
  image: { backgroundColor: colors.surface, borderRadius: 6 },
  pageLabel: { color: colors.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  placeholder: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 18,
  },
  placeholderText: { color: colors.muted, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
