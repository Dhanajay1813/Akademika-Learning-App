import { useMemo, useRef, useState } from 'react';
import { Image as RNImage, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import OptimizedContentImage from './OptimizedContentImage';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const touchDistance = (touches) => {
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  const dx = first.pageX - second.pageX;
  const dy = first.pageY - second.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

function ZoomSurface({ source, label }) {
  const { height, width } = useWindowDimensions();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef({ distance: 0, scale: 1, pan: { x: 0, y: 0 } });

  const imageSize = useMemo(() => {
    const resolved = source ? RNImage.resolveAssetSource(source) : null;
    const sourceWidth = resolved?.width || width;
    const sourceHeight = resolved?.height || height;
    const ratio = sourceHeight / sourceWidth;
    const fittedWidth = width;
    const fittedHeight = Math.min(height * 0.82, fittedWidth * ratio);
    return { width: fittedWidth, height: fittedHeight };
  }, [height, source, width]);

  const reset = () => {
    gesture.current = { distance: 0, scale: 1, pan: { x: 0, y: 0 } };
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1 || scale > 1,
    onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1 || scale > 1,
    onPanResponderGrant: (event) => {
      const touches = event.nativeEvent.touches;
      gesture.current = {
        distance: touchDistance(touches),
        scale,
        pan,
      };
    },
    onPanResponderMove: (event, gestureState) => {
      const touches = event.nativeEvent.touches;
      if (touches.length > 1 && gesture.current.distance > 0) {
        const nextScale = clamp(gesture.current.scale * (touchDistance(touches) / gesture.current.distance), 1, 4);
        setScale(nextScale);
        if (nextScale === 1) setPan({ x: 0, y: 0 });
        return;
      }
      if (scale > 1) {
        setPan({
          x: gesture.current.pan.x + gestureState.dx,
          y: gesture.current.pan.y + gestureState.dy,
        });
      }
    },
    onPanResponderRelease: () => {
      if (scale <= 1.02) reset();
      else gesture.current = { ...gesture.current, scale, pan };
    },
    onPanResponderTerminate: () => {
      if (scale <= 1.02) reset();
    },
  }), [pan, scale]);

  return (
    <View style={styles.zoomBody} {...panResponder.panHandlers}>
      <OptimizedContentImage
        source={source}
        width={imageSize.width}
        height={imageSize.height}
        style={[styles.zoomImage, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }]}
        accessibilityLabel={label || 'Zoomed content image'}
        recyclingKey={`zoom:${label || 'image'}`}
      />
      {label ? <Text style={styles.zoomLabel}>{label}</Text> : null}
      <Pressable style={styles.resetButton} onPress={reset} accessibilityRole="button">
        <Text style={styles.actionText}>Reset</Text>
      </Pressable>
    </View>
  );
}

export default function ZoomableImage({ source, label, width, height, imageStyle, placeholderText = 'Image not found.', onError, recyclingKey, cacheKey }) {
  const [visible, setVisible] = useState(false);

  if (!source) {
    return (
      <View style={[styles.image, styles.placeholder, { width, height }, imageStyle]}>
        <Text style={styles.placeholderText}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setVisible(true)} accessibilityRole="imagebutton">
        <OptimizedContentImage
          source={source}
          width={width}
          height={height}
          style={imageStyle}
          placeholderText={placeholderText}
          accessibilityLabel={label || 'Content image'}
          recyclingKey={recyclingKey || label}
          cacheKey={cacheKey}
          onError={onError}
        />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modal}>
          <Pressable style={styles.closeButton} onPress={() => setVisible(false)} accessibilityRole="button">
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
          <ZoomSurface source={source} label={label} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface, borderRadius: 6 },
  placeholder: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  placeholderText: { color: colors.muted, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  modal: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: { backgroundColor: '#000000' },
  zoomLabel: { color: '#FFFFFF', fontSize: 13, marginTop: 10, paddingHorizontal: 18, textAlign: 'center' },
  closeButton: { position: 'absolute', top: 46, right: 16, zIndex: 2, paddingHorizontal: 14, paddingVertical: 10 },
  resetButton: { position: 'absolute', bottom: 38, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
