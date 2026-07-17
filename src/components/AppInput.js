import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';

export default function AppInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  placeholder,
  editable = true,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={placeholder || label}
        placeholderTextColor={colors.muted}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        editable={editable}
        style={[styles.input, multiline && styles.multiline, !editable && styles.readOnly]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 12 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  input: { width: '100%', minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  readOnly: { backgroundColor: '#EEF3F8', color: colors.muted },
  multiline: { minHeight: 120, paddingTop: 12, textAlignVertical: 'top' },
});
