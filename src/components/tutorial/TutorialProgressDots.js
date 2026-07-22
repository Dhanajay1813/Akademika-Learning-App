import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function TutorialProgressDots({ total = 0, index = 0 }) {
  if (!total) return null;
  return (
    <View style={styles.row} accessibilityLabel={`Tutorial step ${index + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, itemIndex) => (
        <View key={itemIndex} style={[styles.dot, itemIndex === index && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  active: { width: 18, backgroundColor: colors.primary },
});
