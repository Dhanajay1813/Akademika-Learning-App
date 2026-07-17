import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import { getManualPageSource } from '../data/manualData';

function ManualPage({ manualId, pageFile, width }) {
  const [failed, setFailed] = useState(false);
  const source = getManualPageSource(manualId, pageFile);

  return (
    <View style={styles.page}>
      {failed || !source ? (
        <View style={[styles.image, styles.messageBox, { width, height: width * 1.414 }]}>
          <Text style={styles.message}>Manual page not found.</Text>
        </View>
      ) : (
        <Image
          source={source}
          style={[styles.image, { width, height: width * 1.414 }]}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
      <Text style={styles.pageLabel}>{pageFile}</Text>
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
      keyExtractor={(item, index) => `${item}-${index}`}
      renderItem={({ item }) => (
        <ManualPage manualId={manualId} pageFile={item} width={imageWidth} />
      )}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
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
  pageLabel: { color: colors.muted, fontSize: 12, marginTop: 6 },
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
