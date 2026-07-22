import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OptimizedContentImage from './OptimizedContentImage';
import { colors } from '../constants/colors';

const DEFAULT_MIN_SCALE = 1;
const DEFAULT_MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function ZoomSurface({
  source,
  imageKey,
  cacheKey,
  width,
  height,
  caption,
  accessibilityLabel,
  minimumScale = DEFAULT_MIN_SCALE,
  maximumScale = DEFAULT_MAX_SCALE,
  onSingleTap,
  onZoomStateChange,
  onImageError,
  resetSignal,
  showScale = false,
  showReset = false,
  imageStyle,
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const viewportWidth = useSharedValue(safeNumber(width, 1));
  const viewportHeight = useSharedValue(safeNumber(height, 1));
  const [isZoomed, setIsZoomed] = useState(false);
  const [scaleLabel, setScaleLabel] = useState('1.0x');

  useEffect(() => {
    viewportWidth.value = safeNumber(width, 1);
    viewportHeight.value = safeNumber(height, 1);
  }, [height, viewportHeight, viewportWidth, width]);

  const updateScaleLabel = useCallback((nextScale) => {
    setScaleLabel(`${nextScale.toFixed(1)}x`);
  }, []);

  const updateZoomState = useCallback((nextZoomed) => {
    setIsZoomed(nextZoomed);
    onZoomStateChange?.(nextZoomed);
  }, [onZoomStateChange]);

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    updateZoomState(false);
    setScaleLabel('1.0x');
  }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, updateZoomState]);

  useEffect(() => {
    if (resetSignal !== undefined && resetSignal !== null) resetZoom();
  }, [resetSignal, resetZoom]);

  useEffect(() => resetZoom, [resetZoom]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = clamp(savedScale.value * event.scale, minimumScale, maximumScale);
      const originX = event.focalX - viewportWidth.value / 2;
      const originY = event.focalY - viewportHeight.value / 2;
      const maxX = Math.max(0, (viewportWidth.value * nextScale - viewportWidth.value) / 2);
      const maxY = Math.max(0, (viewportHeight.value * nextScale - viewportHeight.value) / 2);
      scale.value = nextScale;
      translateX.value = clamp(savedTranslateX.value - originX * (nextScale - savedScale.value) * 0.18, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value - originY * (nextScale - savedScale.value) * 0.18, -maxY, maxY);
      runOnJS(updateScaleLabel)(nextScale);
    })
    .onEnd(() => {
      const finalScale = clamp(scale.value, minimumScale, maximumScale);
      if (finalScale <= minimumScale + 0.02) {
        scale.value = withTiming(minimumScale);
        savedScale.value = minimumScale;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
        runOnJS(updateScaleLabel)(minimumScale);
        return;
      }
      const maxX = Math.max(0, (viewportWidth.value * finalScale - viewportWidth.value) / 2);
      const maxY = Math.max(0, (viewportHeight.value * finalScale - viewportHeight.value) / 2);
      const clampedX = clamp(translateX.value, -maxX, maxX);
      const clampedY = clamp(translateY.value, -maxY, maxY);
      scale.value = finalScale;
      savedScale.value = finalScale;
      translateX.value = withTiming(clampedX);
      translateY.value = withTiming(clampedY);
      savedTranslateX.value = clampedX;
      savedTranslateY.value = clampedY;
      runOnJS(updateZoomState)(true);
      runOnJS(updateScaleLabel)(finalScale);
    })
    .onFinalize(() => {
      runOnJS(updateZoomState)(scale.value > minimumScale + 0.02);
    }), [maximumScale, minimumScale, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, updateScaleLabel, updateZoomState, viewportHeight, viewportWidth]);

  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(isZoomed)
    .minDistance(4)
    .onUpdate((event) => {
      if (scale.value <= minimumScale + 0.02) return;
      const maxX = Math.max(0, (viewportWidth.value * scale.value - viewportWidth.value) / 2);
      const maxY = Math.max(0, (viewportHeight.value * scale.value - viewportHeight.value) / 2);
      translateX.value = clamp(savedTranslateX.value + event.translationX, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      if (scale.value <= minimumScale + 0.02) {
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        runOnJS(updateZoomState)(false);
        return;
      }
      const maxX = Math.max(0, (viewportWidth.value * scale.value - viewportWidth.value) / 2);
      const maxY = Math.max(0, (viewportHeight.value * scale.value - viewportHeight.value) / 2);
      savedTranslateX.value = clamp(translateX.value, -maxX, maxX);
      savedTranslateY.value = clamp(translateY.value, -maxY, maxY);
      runOnJS(updateZoomState)(true);
    })
    .onFinalize(() => {
      runOnJS(updateZoomState)(scale.value > minimumScale + 0.02);
    }), [isZoomed, minimumScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, updateZoomState, viewportHeight, viewportWidth]);

  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((event) => {
      if (scale.value > minimumScale + 0.02) {
        scale.value = withTiming(minimumScale);
        savedScale.value = minimumScale;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
        runOnJS(updateScaleLabel)(minimumScale);
        return;
      }
      const nextScale = clamp(DOUBLE_TAP_SCALE, minimumScale, maximumScale);
      const originX = event.x - viewportWidth.value / 2;
      const originY = event.y - viewportHeight.value / 2;
      const maxX = Math.max(0, (viewportWidth.value * nextScale - viewportWidth.value) / 2);
      const maxY = Math.max(0, (viewportHeight.value * nextScale - viewportHeight.value) / 2);
      const nextX = clamp(-originX * (nextScale - 1), -maxX, maxX);
      const nextY = clamp(-originY * (nextScale - 1), -maxY, maxY);
      scale.value = withTiming(nextScale);
      savedScale.value = nextScale;
      translateX.value = withTiming(nextX);
      translateY.value = withTiming(nextY);
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
      runOnJS(updateZoomState)(true);
      runOnJS(updateScaleLabel)(nextScale);
    }), [maximumScale, minimumScale, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, updateScaleLabel, updateZoomState, viewportHeight, viewportWidth]);

  const singleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .onEnd(() => {
      if (scale.value <= minimumScale + 0.02 && onSingleTap) runOnJS(onSingleTap)();
    }), [minimumScale, onSingleTap, scale]);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture, Gesture.Exclusive(doubleTapGesture, singleTapGesture)),
    [doubleTapGesture, panGesture, pinchGesture, singleTapGesture],
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Number.isFinite(translateX.value) ? translateX.value : 0 },
      { translateY: Number.isFinite(translateY.value) ? translateY.value : 0 },
      { scale: Number.isFinite(scale.value) ? scale.value : 1 },
    ],
  }));

  return (
    <View style={[styles.surfaceWrap, { width, height }]}> 
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageLayer, animatedImageStyle]}>
          <OptimizedContentImage
            source={source}
            imageKey={imageKey}
            cacheKey={cacheKey}
            width={width}
            height={height}
            style={imageStyle}
            contentFit="contain"
            accessibilityLabel={accessibilityLabel || caption || 'Content image'}
            recyclingKey={imageKey}
            onError={onImageError}
          />
        </Animated.View>
      </GestureDetector>
      {showScale && isZoomed ? <Text style={styles.scaleBadge}>{scaleLabel}</Text> : null}
      {showReset && isZoomed ? (
        <Pressable style={styles.resetButton} onPress={resetZoom} accessibilityRole="button" accessibilityLabel="Reset image zoom">
          <Text style={styles.resetText}>Reset Zoom</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FullscreenZoomImage({
  visible,
  source,
  imageKey,
  cacheKey,
  aspectRatio,
  caption,
  accessibilityLabel,
  onClose,
  minimumScale = DEFAULT_MIN_SCALE,
  maximumScale = DEFAULT_MAX_SCALE,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeAspectRatio = safeNumber(aspectRatio, 4 / 3);
  const horizontalPadding = 12;
  const topPadding = Math.max(insets.top, 24) + 56;
  const bottomPadding = Math.max(insets.bottom, 16) + 54;
  const usableWidth = Math.max(1, width - horizontalPadding * 2);
  const usableHeight = Math.max(1, height - topPadding - bottomPadding);
  const fittedHeight = Math.min(usableHeight, usableWidth / safeAspectRatio);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.modalGestureRoot}>
        <View style={[styles.modalRoot, { paddingTop: topPadding, paddingBottom: bottomPadding, paddingHorizontal: horizontalPadding }]}>
        <Pressable style={[styles.closeButton, { top: Math.max(insets.top, 24) }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close image">
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <ZoomSurface
          source={source}
          imageKey={`${imageKey}:fullscreen`}
          cacheKey={cacheKey}
          width={usableWidth}
          height={fittedHeight}
          caption={caption}
          accessibilityLabel={accessibilityLabel}
          minimumScale={minimumScale}
          maximumScale={maximumScale}
          showScale
          showReset
        />
        {caption ? <Text style={styles.fullscreenCaption}>{caption}</Text> : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default function ZoomableContentImage({
  source,
  imageKey,
  cacheKey,
  aspectRatio,
  caption,
  fullscreenCaption,
  accessibilityLabel,
  enableInlineZoom = true,
  enableFullscreen = true,
  minimumScale = DEFAULT_MIN_SCALE,
  maximumScale = DEFAULT_MAX_SCALE,
  onZoomStateChange,
  onError,
  resetSignal,
  style,
  imageStyle,
  placeholderText = 'Image not found.',
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const safeAspectRatio = safeNumber(aspectRatio, 4 / 3);
  const viewportWidth = safeNumber(layoutWidth, Math.max(1, windowWidth - 32));
  const viewportHeight = Math.max(120, viewportWidth / safeAspectRatio);

  const handleImageError = useCallback((event) => {
    setLoadFailed(true);
    onZoomStateChange?.(false);
    onError?.(event);
  }, [onError, onZoomStateChange]);

  const openFullscreen = useCallback(() => {
    if (!enableFullscreen || loadFailed || !source) return;
    setFullscreenVisible(true);
  }, [enableFullscreen, loadFailed, source]);

  const closeFullscreen = useCallback(() => {
    setFullscreenVisible(false);
    onZoomStateChange?.(false);
  }, [onZoomStateChange]);

  useEffect(() => () => onZoomStateChange?.(false), [onZoomStateChange]);

  if (!source || loadFailed) {
    return (
      <View style={[styles.container, style]} onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}>
        <OptimizedContentImage
          source={null}
          width={viewportWidth}
          height={viewportHeight}
          style={imageStyle}
          placeholderText={placeholderText}
          accessibilityLabel={accessibilityLabel || caption || 'Content image'}
        />
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.zoomViewport, { height: viewportHeight }]}> 
        {enableInlineZoom ? (
          <ZoomSurface
            source={source}
            imageKey={imageKey}
            cacheKey={cacheKey}
            width={viewportWidth}
            height={viewportHeight}
            accessibilityLabel={accessibilityLabel}
            minimumScale={minimumScale}
            maximumScale={maximumScale}
            onSingleTap={openFullscreen}
            onZoomStateChange={onZoomStateChange}
            onImageError={handleImageError}
            resetSignal={resetSignal}
            imageStyle={imageStyle}
          />
        ) : (
          <Pressable onPress={openFullscreen} accessibilityRole="imagebutton" accessibilityLabel="Open image full screen">
            <OptimizedContentImage
              source={source}
              imageKey={imageKey}
              cacheKey={cacheKey}
              width={viewportWidth}
              height={viewportHeight}
              style={imageStyle}
              contentFit="contain"
              accessibilityLabel={accessibilityLabel || caption || 'Content image'}
              recyclingKey={imageKey}
              onError={handleImageError}
            />
          </Pressable>
        )}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      <FullscreenZoomImage
        visible={fullscreenVisible}
        source={source}
        imageKey={imageKey}
        cacheKey={cacheKey}
        aspectRatio={safeAspectRatio}
        caption={fullscreenCaption || caption}
        accessibilityLabel={accessibilityLabel}
        onClose={closeFullscreen}
        minimumScale={minimumScale}
        maximumScale={maximumScale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  zoomViewport: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  surfaceWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  imageLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalGestureRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',

  },
  closeButton: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 2,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
  resetButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  resetText: {
    color: '#fff',
    fontWeight: '700',
  },
  scaleBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    color: '#fff',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fullscreenCaption: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
});
