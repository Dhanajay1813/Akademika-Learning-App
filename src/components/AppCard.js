import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
export default function AppCard({ title, subtitle, children, onPress }) {
  const content = <><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}{children}</>;
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>{content}</Pressable>;
  return <View style={styles.card}>{content}</View>;
}
const styles = StyleSheet.create({ card: { width: '100%', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }, pressed: { opacity: 0.9 }, title: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 } });
