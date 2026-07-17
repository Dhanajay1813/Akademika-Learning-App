import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
function Inner({ title, children, keyboard = false, scroll = true }) {
  const content = <SafeAreaView style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{title ? <Text style={styles.title}>{title}</Text> : null}{children}</ScrollView> : <View style={styles.content}>{title ? <Text style={styles.title}>{title}</Text> : null}{children}</View>}</SafeAreaView>;
  if (!keyboard) return content;
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView>;
}
export default function ScreenContainer(props) { return <Inner {...props} />; }
export function AppSafeAreaProvider({ children }) { return <SafeAreaProvider>{children}</SafeAreaProvider>; }
const styles = StyleSheet.create({ flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 18, paddingBottom: 34 }, title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 18 } });
