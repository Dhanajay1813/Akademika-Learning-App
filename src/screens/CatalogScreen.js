import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image as RNImage, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import ZoomableImage from '../components/ZoomableImage';
import { ManualTextRenderer } from '../components/ContentBlockRenderer';
import { colors } from '../constants/colors';
import { getProductById } from '../data/products';
import { getCatalogContent } from '../services/catalogContentService';
import { getCatalogImageSource } from '../services/catalogAssetService';

function CatalogImage({ productId, imageFile, label, width, maxHeight, metadata, activeZoomKey, setActiveZoomKey }) {
  const [failed, setFailed] = useState(false);
  const source = getCatalogImageSource(productId, imageFile);
  const height = useMemo(() => {
    const resolved = source ? RNImage.resolveAssetSource(source) : null;
    const sourceWidth = metadata?.width || resolved?.width || 0;
    const sourceHeight = metadata?.height || resolved?.height || 0;
    const ratio = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : 1.414;
    return Math.min(Math.max(width * ratio, 180), maxHeight);
  }, [maxHeight, metadata?.height, metadata?.width, source, width]);
  const imageKey = `${productId}:${imageFile}`;
  const cacheKey = metadata?.sha256 ? `${imageKey}:${metadata.sha256}` : imageKey;

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
          recyclingKey={imageKey}
          cacheKey={cacheKey}
          onZoomStateChange={(zoomed) => setActiveZoomKey(zoomed ? imageKey : null)}
          resetSignal={activeZoomKey && activeZoomKey !== imageKey ? activeZoomKey : null}
        />
      )}
      {label ? <Text style={styles.pageLabel}>{label}</Text> : null}
    </View>
  );
}

export default function CatalogScreen({ route }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [activeZoomKey, setActiveZoomKey] = useState(null);
  const productId = route.params.productId;
  const product = getProductById(productId);
  const catalog = getCatalogContent(productId);
  const imageWidth = Math.max(180, windowWidth - 36);
  const imageMaxHeight = Math.max(240, windowHeight * 0.78);

  useEffect(() => () => setActiveZoomKey(null), []);

  const pageItems = useMemo(() => {
    if (!catalog) return [];
    const items = [];
    if (catalog.coverImage) {
      items.push({ key: 'cover', imageFile: catalog.coverImage, label: 'Cover', width: catalog.coverWidth, height: catalog.coverHeight, sha256: catalog.coverSha256 });
    }
    (catalog.pages || []).forEach((page) => {
      items.push({ ...page, key: page.imageFile, label: `Page ${page.pageNumber}` });
    });
    return items;
  }, [catalog]);

  if (!catalog) {
    return (
      <ScreenContainer title="Catalog">
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Product catalog will be added soon.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const header = (
    <View style={styles.header}>
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
    </View>
  );

  return (
    <ScreenContainer title="Catalog" scroll={false}>
      <FlatList
        data={pageItems}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <CatalogImage
            productId={productId}
            imageFile={item.imageFile}
            label={item.label}
            width={imageWidth}
            maxHeight={imageMaxHeight}
            metadata={item}
            activeZoomKey={activeZoomKey}
            setActiveZoomKey={setActiveZoomKey}
          />
        )}
        scrollEnabled={!activeZoomKey}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={80}
        windowSize={5}
        removeClippedSubviews={false}
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 18 },
  header: { paddingBottom: 4 },
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
