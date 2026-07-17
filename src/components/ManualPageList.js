import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import { getManualBlockImageSource, getManualPageSource } from '../data/manualData';

function isContentBlock(item) {
  return item && typeof item === 'object' && item.type;
}

function ManualImage({ source, label, width, aspectRatio = 1.414 }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.page}>
      {failed || !source ? (
        <View style={[styles.image, styles.messageBox, { width, minHeight: width * 0.6 }]}>
          <Text style={styles.message}>Image not found.</Text>
        </View>
      ) : (
        <Image
          source={source}
          style={[styles.image, { width, minHeight: width * 0.6, aspectRatio }]}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
      {label ? <Text style={styles.pageLabel}>{label}</Text> : null}
    </View>
  );
}

function ManualPage({ manualId, pageFile, width }) {
  return <ManualImage source={getManualPageSource(manualId, pageFile)} label={pageFile} width={width} />;
}

function ManualBlock({ manualId, block, width }) {
  if (block.type === 'image') {
    return (
      <ManualImage
        source={getManualBlockImageSource(manualId, block.imageFile)}
        label={block.caption || block.imageFile}
        width={width}
        aspectRatio={1.5}
      />
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
      <View style={[styles.block, styles.noteBlock]}>
        <Text style={styles.blockTitle}>Note</Text>
        <Text style={styles.blockText}>{block.text || 'No note added.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.blockText}>{block.text || 'No text added.'}</Text>
    </View>
  );
}

export default function ManualPageList({ manualId, pageFiles }) {
  const { width: windowWidth } = useWindowDimensions();
  const imageWidth = Math.max(260, windowWidth - 36);

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
          ? <ManualBlock manualId={manualId} block={item} width={imageWidth} />
          : <ManualPage manualId={manualId} pageFile={item} width={imageWidth} />
      )}
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { paddingBottom: 12 },
  page: { alignItems: 'center', marginBottom: 18 },
  image: { backgroundColor: colors.surface, borderRadius: 6 },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
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
