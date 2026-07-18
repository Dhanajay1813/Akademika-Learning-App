import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import { parseStructuredText } from '../utils/manualTextParser';

const androidTextProps = Platform.OS === 'android'
  ? { android_hyphenationFrequency: 'normal', textBreakStrategy: 'highQuality' }
  : {};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const useResponsiveManualTypography = () => {
  const { width } = useWindowDimensions();
  const screenPadding = clamp(width * 0.045, 16, 28);
  const cardPadding = clamp(width * 0.04, 16, 26);
  const bodyFontSize = clamp(width * 0.043, 16, 19);
  const bodyLineHeight = Math.round(bodyFontSize * 1.55);
  const markerWidth = clamp(bodyFontSize * 2.2, 30, 42);
  const bulletWidth = clamp(bodyFontSize * 1.25, 20, 28);
  const markerGap = clamp(width * 0.018, 7, 12);
  const availableContentWidth = Math.max(0, width - (screenPadding * 2) - (cardPadding * 2));
  const availableListBodyWidth = Math.max(0, availableContentWidth - markerWidth - markerGap);
  const bodyTextAlign = availableContentWidth >= 600 ? 'justify' : 'left';
  const listBodyTextAlign = availableListBodyWidth >= 600 ? 'justify' : 'left';

  return {
    availableContentWidth,
    availableListBodyWidth,
    bodyFontSize,
    bodyLineHeight,
    bodyTextAlign,
    bulletWidth,
    listBodyTextAlign,
    cardPadding,
    markerGap,
    markerWidth,
    paragraphSpacing: Math.round(bodyFontSize * 0.7),
    rowSpacing: Math.round(bodyFontSize * 0.45),
  };
};

function ManualParagraph({ text, typography }) {
  return (
    <Text
      {...androidTextProps}
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      style={[
        styles.paragraph,
        {
          fontSize: typography.bodyFontSize,
          lineHeight: typography.bodyLineHeight,
          marginBottom: typography.paragraphSpacing,
          textAlign: typography.bodyTextAlign,
        },
      ]}
    >
      {text}
    </Text>
  );
}

function ManualList({ block, typography }) {
  const isNumbered = block.type === 'numbered';
  const markerWidth = isNumbered ? typography.markerWidth : typography.bulletWidth;

  return (
    <View style={styles.list}>
      {block.items.map((item, index) => (
        <View key={item.marker + '-' + index} style={[styles.listRow, { marginBottom: typography.rowSpacing }]}>
          <Text
            {...androidTextProps}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
            style={[
              styles.listMarker,
              {
                fontSize: typography.bodyFontSize,
                lineHeight: typography.bodyLineHeight,
                marginRight: typography.markerGap,
                width: markerWidth,
              },
            ]}
          >
            {isNumbered ? item.marker : '•'}
          </Text>
          <Text
            {...androidTextProps}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
            style={[
              styles.listBody,
              {
                fontSize: typography.bodyFontSize,
                lineHeight: typography.bodyLineHeight,
                textAlign: typography.listBodyTextAlign,
              },
            ]}
          >
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ManualTextRenderer({ text }) {
  const typography = useResponsiveManualTypography();
  const blocks = parseStructuredText(text);

  return (
    <View style={styles.textWrap}>
      {blocks.map((block, index) => (
        block.type === 'paragraph'
          ? <ManualParagraph key={'paragraph-' + index} text={block.text} typography={typography} />
          : <ManualList key={block.type + '-' + index} block={block} typography={typography} />
      ))}
    </View>
  );
}

export default function ContentBlockRenderer({ block }) {
  return <ManualTextRenderer text={block?.text || 'No text added.'} />;
}

const styles = StyleSheet.create({
  textWrap: { width: '100%', alignSelf: 'stretch' },
  paragraph: {
    color: colors.text,
    flexShrink: 1,
    letterSpacing: 0,
    width: '100%',
  },
  list: { width: '100%', marginBottom: 8 },
  listRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    width: '100%',
  },
  listMarker: {
    color: colors.text,
    flexShrink: 0,
    textAlign: 'right',
  },
  listBody: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    letterSpacing: 0,
    minWidth: 0,
  },
});
