import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../storage/storage';
import BottomNav from './BottomNav';

function Inner({ title, children, keyboard = false, scroll = true, bottomNav = true }) {
  const [currentUser, setCurrentUser] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (active) setCurrentUser(user);
    })();
    return () => { active = false; };
  }, []));

  const showBottomNav = bottomNav && Boolean(currentUser);
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, showBottomNav && styles.contentWithNav]} keyboardShouldPersistTaps="handled">
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, showBottomNav && styles.contentWithNav]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
  const content = <SafeAreaView style={styles.safe}>{body}{showBottomNav ? <BottomNav currentUser={currentUser} /> : null}</SafeAreaView>;
  if (!keyboard) return content;
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView>;
}

export default function ScreenContainer(props) { return <Inner {...props} />; }
export function AppSafeAreaProvider({ children }) { return <SafeAreaProvider>{children}</SafeAreaProvider>; }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 18, paddingBottom: 34 },
  staticContent: { flex: 1 },
  contentWithNav: { paddingBottom: 96 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 18 },
});
