import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

export default function TutorialSlide({ slide, width }) {
  const cardWidth = Math.min(Math.max(width - 36, 280), 620);
  return (
    <View style={[styles.page, { width }]}> 
      <ScrollView contentContainerStyle={[styles.content, { width: cardWidth }]} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name={slide.icon || 'school-outline'} size={34} color={colors.primary} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
        {slide.instruction ? <Text style={styles.instruction}>{slide.instruction}</Text> : null}
        {slide.points?.length ? (
          <View style={styles.points}>
            {slide.points.map((point) => (
              <View key={point.label} style={styles.pointRow}>
                <Text style={styles.pointLabel}>{point.label}</Text>
                <Text style={styles.pointText}>{point.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 18 },
  iconCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#EAF3FC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  title: { color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  description: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  instruction: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  points: { marginTop: 18, gap: 10 },
  pointRow: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12 },
  pointLabel: { color: colors.primary, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  pointText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
