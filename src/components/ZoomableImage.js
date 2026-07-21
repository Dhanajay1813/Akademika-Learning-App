import { View } from 'react-native';
import { colors } from '../constants/colors';
import ZoomableContentImage from './ZoomableContentImage';
import OptimizedContentImage from './OptimizedContentImage';

function safeAspectRatio(width, height, fallback) {
  const parsedWidth = Number(width);
  const parsedHeight = Number(height);
  if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight) && parsedWidth > 0 && parsedHeight > 0) {
    return parsedWidth / parsedHeight;
  }
  return fallback || 4 / 3;
}

export default function ZoomableImage({
  source,
  label,
  width,
  height,
  imageStyle,
  placeholderText = 'Image not found.',
  onError,
  recyclingKey,
  cacheKey,
  imageKey,
  aspectRatio,
  style,
  onZoomStateChange,
  resetSignal,
  enableInlineZoom = true,
  enableFullscreen = true,
}) {
  const resolvedKey = imageKey || recyclingKey || cacheKey || label || 'zoomable-image';

  if (!source) {
    return (
      <View style={[{ width, height, backgroundColor: colors.surface, borderRadius: 6 }, imageStyle]}>
        <OptimizedContentImage
          source={null}
          width={width}
          height={height}
          style={imageStyle}
          placeholderText={placeholderText}
        />
      </View>
    );
  }

  return (
    <ZoomableContentImage
      source={source}
      imageKey={resolvedKey}
      cacheKey={cacheKey}
      aspectRatio={aspectRatio || safeAspectRatio(width, height)}
      fullscreenCaption={label}
      accessibilityLabel={label || 'Content image'}
      enableInlineZoom={enableInlineZoom}
      enableFullscreen={enableFullscreen}
      onZoomStateChange={onZoomStateChange}
      resetSignal={resetSignal}
      style={[{ width }, style]}
      imageStyle={imageStyle}
      placeholderText={placeholderText}
      onError={onError}
    />
  );
}
