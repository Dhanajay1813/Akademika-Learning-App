import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image as RNImage, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import { getManualBlockImageSource, getManualPageSource } from '../data/manualData';
import ContentBlockRenderer, { useResponsiveManualTypography } from './ContentBlockRenderer';
import ZoomableImage from './ZoomableImage';
import { prefetchRemoteImages } from '../services/imageCacheService';

function isContentBlock(item) {
  return item && typeof item === 'object' && item.type;
}

function ManualImage({ source, label, width, maxHeight, fallbackHeightRatio = 1.414, metadata, cacheKey, onZoomStateChange, resetSignal }) {
  const [failed, setFailed] = useState(false);
  const fittedHeight = useMemo(() => {
    const resolved = source ? RNImage.resolveAssetSource(source) : null;
    const sourceWidth = metadata?.width || resolved?.width || 0;
    const sourceHeight = metadata?.height || resolved?.height || 0;
    const ratio = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : fallbackHeightRatio;
    return Math.min(Math.max(width * ratio, 160), maxHeight);
  }, [fallbackHeightRatio, maxHeight, metadata?.height, metadata?.width, source, width]);

  return (
    <View style={styles.page}>
      {failed || !source ? (
        <View style={[styles.image, styles.messageBox, { width, height: fittedHeight }]}> 
          <Text style={styles.message}>Image not found.</Text>
        </View>
      ) : (
        <ZoomableImage
          source={source}
          label={label}
          width={width}
          height={fittedHeight}
          imageStyle={styles.image}
          onError={() => setFailed(true)}
          recyclingKey={cacheKey || label}
          cacheKey={metadata?.sha256 ? `${cacheKey || label}:${metadata.sha256}` : cacheKey}
          onZoomStateChange={onZoomStateChange}
          resetSignal={resetSignal}
        />
      )}
      {label ? <Text style={styles.pageLabel}>{label}</Text> : null}
    </View>
  );
}

function ManualPage({ manualId, pageFile, width, maxHeight, activeZoomKey, setActiveZoomKey }) {
  const imageKey = `${manualId}:${pageFile}`;
  return (
    <ManualImage
      source={getManualPageSource(manualId, pageFile)}
      label={pageFile}
      width={width}
      maxHeight={maxHeight}
      cacheKey={imageKey}
      onZoomStateChange={(zoomed) => setActiveZoomKey(zoomed ? imageKey : null)}
      resetSignal={activeZoomKey && activeZoomKey !== imageKey ? activeZoomKey : null}
    />
  );
}

function getBlockImageItems(block) {
  const imageFiles = Array.isArray(block.imageFiles) ? block.imageFiles : [];
  const normalizedItems = imageFiles
    .map((item) => {
      if (typeof item === 'string') {
        return { imageFile: item, caption: block.caption || '' };
      }
      if (item && typeof item === 'object' && item.imageFile) {
        return { ...item, caption: item.caption || block.caption || '' };
      }
      return null;
    })
    .filter(Boolean);

  if (normalizedItems.length) {
    return normalizedItems;
  }

  return block.imageFile ? [{ imageFile: block.imageFile, caption: block.caption || '' }] : [];
}

export function ManualBlock({ manualId, block, width, maxHeight, activeZoomKey, setActiveZoomKey }) {
  const typography = useResponsiveManualTypography();
  const contentBlockStyle = [styles.block, styles.contentBlock, { padding: typography.cardPadding }];
  if (block.type === 'image') {
    const imageItems = getBlockImageItems(block);
    return (
      <View style={styles.imageGroup}>
        {imageItems.length ? imageItems.map((item, index) => {
          const imageKey = `${manualId}:${item.imageFile}:${index}`;
          return (
            <ManualImage
              key={imageKey}
              source={getManualBlockImageSource(manualId, item.imageFile)}
              label={item.caption || item.imageFile}
              width={width}
              maxHeight={maxHeight}
              fallbackHeightRatio={0.75}
              metadata={item}
              cacheKey={imageKey}
              onZoomStateChange={(zoomed) => setActiveZoomKey(zoomed ? imageKey : null)}
              resetSignal={activeZoomKey && activeZoomKey !== imageKey ? activeZoomKey : null}
            />
          );
        }) : (
          <ManualImage
            source={null}
            label={block.caption || ''}
            width={width}
            maxHeight={maxHeight}
            fallbackHeightRatio={0.75}
          />
        )}
      </View>
    );
  }

  if (block.type === 'table') {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Table</Text>
        <Text style={styles.blockText}>{block.tableData || 'No table data added.'}</Text>
      </View>
    );
  }

  if (block.type === 'note') {
    return (
      <View style={[contentBlockStyle, styles.noteBlock]}>
        <Text style={styles.blockTitle}>Note</Text>
        <ContentBlockRenderer block={{ ...block, text: block.text || 'No note added.' }} />
      </View>
    );
  }

  return (
    <View style={contentBlockStyle}>
      <ContentBlockRenderer block={block} />
    </View>
  );
}


export function ManualBlockList({ manualId, blocks = [] }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [activeZoomKey, setActiveZoomKey] = useState(null);
  const imageWidth = Math.max(180, windowWidth - 36);
  const imageMaxHeight = Math.max(220, windowHeight * 0.72);

  if (!blocks.length) return null;

  return (
    <View style={styles.blockList}>
      {blocks.map((block, index) => (
        <ManualBlock
          key={`${block.id || block.type || 'block'}-${index}`}
          manualId={manualId}
          block={block}
          width={imageWidth}
          maxHeight={imageMaxHeight}
          activeZoomKey={activeZoomKey}
          setActiveZoomKey={setActiveZoomKey}
        />
      ))}
    </View>
  );
}

const getPrefetchSources = (manualId, items) => {
  const sources = [];
  for (const item of items || []) {
    if (isContentBlock(item)) {
      if (item.type !== 'image') continue;
      for (const imageItem of getBlockImageItems(item)) {
        sources.push(getManualBlockImageSource(manualId, imageItem.imageFile));
      }
    } else {
      sources.push(getManualPageSource(manualId, item));
    }
  }
  return sources
    .map((source, index) => source?.uri ? { uri: source.uri, cacheKey: `${manualId}:prefetch:${index}` } : null)
    .filter(Boolean);
};

export default function ManualPageList({ manualId, pageFiles, ListFooterComponent }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [activeZoomKey, setActiveZoomKey] = useState(null);
  const imageWidth = Math.max(180, windowWidth - 36);
  const imageMaxHeight = Math.max(220, windowHeight * 0.72);

  useEffect(() => {
    const uris = getPrefetchSources(manualId, pageFiles).slice(0, 2);
    prefetchRemoteImages(uris, 2);
  }, [manualId, pageFiles]);

  useEffect(() => () => setActiveZoomKey(null), []);

  if (!pageFiles?.length) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.message}>Manual content not added yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.flatList}
      data={pageFiles}
      keyExtractor={(item, index) => isContentBlock(item) ? `${item.id}-${index}` : `${item}-${index}`}
      renderItem={({ item }) => (
        isContentBlock(item)
          ? <ManualBlock manualId={manualId} block={item} width={imageWidth} maxHeight={imageMaxHeight} activeZoomKey={activeZoomKey} setActiveZoomKey={setActiveZoomKey} />
          : <ManualPage manualId={manualId} pageFile={item} width={imageWidth} maxHeight={imageMaxHeight} activeZoomKey={activeZoomKey} setActiveZoomKey={setActiveZoomKey} />
      )}
      scrollEnabled={!activeZoomKey}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={80}
      windowSize={3}
      removeClippedSubviews={false}
      ListFooterComponent={ListFooterComponent || null}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { paddingBottom: 12 },
  blockList: { paddingTop: 12 },
  page: { alignItems: 'center', marginBottom: 18 },
  imageGroup: { width: '100%', alignItems: 'center' },
  image: { backgroundColor: colors.surface, borderRadius: 6 },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  contentBlock: { width: '100%', alignSelf: 'stretch' },
  noteBlock: { borderColor: colors.primary },
  blockTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  blockText: { color: colors.text, fontSize: 16, lineHeight: 24 },
  pageLabel: { color: colors.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  messageBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 18,
  },
  message: { color: colors.muted, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
