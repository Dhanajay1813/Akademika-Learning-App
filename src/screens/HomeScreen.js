import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import { colors } from '../constants/colors';
import { clearCurrentUser, getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';

export default function HomeScreen({ navigation }) {
  const [guest, setGuest] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (active) setGuest(isGuestUser(user));
    })();
    return () => { active = false; };
  }, []));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
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
      ),
    });
  }, [navigation]);

  return (
    <ScreenContainer title="Home">
      <AppCard title="Products" subtitle="Open trainer products and experiments." onPress={() => navigation.navigate('Products')} />
      {!guest ? <AppCard title="Workbook" subtitle="Resume drafts and completed PDFs." onPress={() => navigation.navigate('Workbook')} /> : null}
      <AppCard title="Internships" subtitle="View internship options." onPress={() => navigation.navigate('Internships')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoutButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
  pressed: { opacity: 0.7 },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
});
