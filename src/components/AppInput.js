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
  rightAccessory,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
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
          style={[styles.input, rightAccessory && styles.inputWithAccessory, multiline && styles.multiline, !editable && styles.readOnly]}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 12 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  inputRow: { width: '100%', position: 'relative', justifyContent: 'center' },
  input: { width: '100%', minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  inputWithAccessory: { paddingRight: 54 },
  accessory: { position: 'absolute', right: 3, top: 3, bottom: 3, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  readOnly: { backgroundColor: '#EEF3F8', color: colors.muted },
  multiline: { minHeight: 120, paddingTop: 12, textAlignVertical: 'top' },
});
