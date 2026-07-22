import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../storage/storage';
import BottomNav, { getBottomNavHeight } from './BottomNav';

function Inner({ title, children, keyboard = false, scroll = true, bottomNav = true, refreshing = false, onRefresh }) {
  const [currentUser, setCurrentUser] = useState(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (active) setCurrentUser(user);
    })();
    return () => { active = false; };
  }, []));

  const showBottomNav = bottomNav && Boolean(currentUser);
  const navHeight = showBottomNav ? getBottomNavHeight(insets) : 0;
  const contentPaddingBottom = keyboard ? insets.bottom + 32 : Math.max(insets.bottom + 24, 34);
  const finalPaddingBottom = showBottomNav ? navHeight + 12 : contentPaddingBottom;

  const body = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.content, { paddingBottom: finalPaddingBottom }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, { paddingBottom: finalPaddingBottom }]}> 
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );

  const wrappedBody = keyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {body}
    </KeyboardAvoidingView>
  ) : body;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {wrappedBody}
      {showBottomNav ? <BottomNav currentUser={currentUser} /> : null}
    </SafeAreaView>
  );
}

export default function ScreenContainer(props) { return <Inner {...props} />; }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: { flexGrow: 1, padding: 18 },
  staticContent: { flex: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 18 },
});
