import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import { colors } from '../constants/colors';
import { clearCurrentUser, getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';
import { Ionicons } from '@expo/vector-icons';
import { useAppRefresh } from '../context/AppRefreshContext';
import FirstTimeTutorialPrompt from '../components/tutorial/FirstTimeTutorialPrompt';
import WhatsNewPrompt from '../components/tutorial/WhatsNewPrompt';

export default function HomeScreen({ navigation }) {
  const [guest, setGuest] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { refreshVersion, isRefreshing, refreshAppData } = useAppRefresh();

  const applyUser = useCallback((user) => {
    setCurrentUser(user);
    setGuest(isGuestUser(user));
  }, []);

  const loadProfile = useCallback(async () => {
    const user = await getCurrentUser();
    applyUser(user);
  }, [applyUser]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (active) applyUser(user);
    })();
    return () => { active = false; };
  }, [applyUser]));

  useEffect(() => {
    if (refreshVersion > 0) loadProfile();
  }, [loadProfile, refreshVersion]);

  const refreshFromHeader = useCallback(async () => {
    try {
      await refreshAppData();
      Alert.alert('Refresh', 'App data refreshed');
    } catch (error) {
      Alert.alert('Refresh failed', 'Unable to refresh app data. Please try again.');
    }
  }, [refreshAppData]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={refreshFromHeader}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh app data"
            accessibilityHint="Reloads the latest saved app information"
            hitSlop={10}
            style={({ pressed }) => [styles.refreshButton, pressed && !isRefreshing && styles.pressed]}
          >
            {isRefreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh" size={21} color={colors.primary} />}
          </Pressable>
          <Pressable
            onPress={async () => {
              await clearCurrentUser();
              navigation.reset({ index: 0, routes: [{ name: 'Entry' }] });
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      ),
    });
  }, [isRefreshing, navigation, refreshFromHeader]);

  return (
    <ScreenContainer title="Home" refreshing={isRefreshing} onRefresh={refreshAppData}>
      <AppCard title="Products" subtitle="Open trainer products and experiments." onPress={() => navigation.navigate('Products')} />
      {!guest ? <AppCard title="Workbook" subtitle="Resume drafts and completed PDFs." onPress={() => navigation.navigate('Workbook')} /> : null}
      <AppCard title="Internships" subtitle="View internship options." onPress={() => navigation.navigate('Internships')} />
      <FirstTimeTutorialPrompt user={currentUser} />
      <WhatsNewPrompt user={currentUser} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: { width: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  logoutButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 6 },
  pressed: { opacity: 0.7 },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
});
