import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
export default function AppButton({ title, onPress, variant = 'primary', disabled = false, accessibilityLabel }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 52, width: '100%', borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginVertical: 6 }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.85 }, text: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' }, secondaryText: { color: colors.primary } });
