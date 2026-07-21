import { useMemo, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

const isRemoteSource = (source) => Boolean(source?.uri);

export const resolveImageSize = (source, fallbackWidth = 1, fallbackHeight = 1) => {
  const resolved = source ? RNImage.resolveAssetSource(source) : null;
  return {
    width: resolved?.width || fallbackWidth,
    height: resolved?.height || fallbackHeight,
    uri: resolved?.uri || source?.uri || '',
  };
};

export default function OptimizedContentImage({
  source,
  width,
  height,
  style,
  contentFit = 'contain',
  placeholderText = 'Image not found.',
  accessibilityLabel,
  recyclingKey,
  cacheKey,
  onError,
}) {
  const [failed, setFailed] = useState(false);
  const cachePolicy = useMemo(() => (isRemoteSource(source) ? 'memory-disk' : 'none'), [source]);
  const resolvedSource = useMemo(() => (isRemoteSource(source) && (cacheKey || recyclingKey) ? { ...source, cacheKey: cacheKey || recyclingKey } : source), [cacheKey, recyclingKey, source]);

  if (!source || failed) {
    return (
      <View style={[styles.placeholder, { width, height }, style]}>
        <Text style={styles.placeholderText}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <ExpoImage
      source={resolvedSource}
      style={[styles.image, { width, height }, style]}
      contentFit={contentFit}
      allowDownscaling
      transition={150}
      cachePolicy={cachePolicy}
      recyclingKey={recyclingKey}
      accessibilityLabel={accessibilityLabel}
      onError={(event) => {
        if (__DEV__) console.warn('Image render failed', recyclingKey || accessibilityLabel || 'content-image');
        setFailed(true);
        if (onError) onError(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface, borderRadius: 6 },
  placeholder: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 18,
  },
  placeholderText: { color: colors.muted, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
