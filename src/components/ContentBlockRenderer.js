import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { parseStructuredText } from '../utils/manualTextParser';

const androidTextProps = Platform.OS === 'android'
  ? { android_hyphenationFrequency: 'normal', textBreakStrategy: 'highQuality' }
  : {};

function ManualParagraph({ text }) {
  return (
    <Text {...androidTextProps} style={styles.paragraph}>
      {text}
    </Text>
  );
}

function ManualList({ block }) {
  const isNumbered = block.type === 'numbered';

  return (
    <View style={styles.list}>
      {block.items.map((item, index) => (
        <View key={`${item.marker}-${index}`} style={styles.listRow}>
          <Text {...androidTextProps} style={[styles.listMarker, !isNumbered && styles.bulletMarker]}>
            {isNumbered ? item.marker : '•'}
          </Text>
          <Text {...androidTextProps} style={styles.listBody}>
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ManualTextRenderer({ text }) {
  const blocks = parseStructuredText(text);

  return (
    <View style={styles.textWrap}>
      {blocks.map((block, index) => (
        block.type === 'paragraph'
          ? <ManualParagraph key={`paragraph-${index}`} text={block.text} />
          : <ManualList key={`${block.type}-${index}`} block={block} />
      ))}
    </View>
  );
}

export default function ContentBlockRenderer({ block }) {
  return <ManualTextRenderer text={block?.text || 'No text added.'} />;
}

const styles = StyleSheet.create({
  textWrap: { width: '100%' },
  paragraph: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 27,
    textAlign: 'justify',
    flexShrink: 1,
    marginBottom: 12,
  },
  list: { width: '100%', marginBottom: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 8,
  },
  listMarker: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 27,
    minWidth: 38,
    textAlign: 'right',
    marginRight: 10,
  },
  bulletMarker: { minWidth: 22 },
  listBody: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 27,
    textAlign: 'justify',
    flex: 1,
    flexShrink: 1,
  },
});
