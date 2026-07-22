import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../constants/colors';
import { isGuestUser, getDraftOwnerId } from '../../auth/userRole';
import { markTutorialDismissed, shouldShowTutorial } from '../../services/tutorialService';

export default function FirstTimeTutorialPrompt({ user }) {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const sessionClosedRef = useRef(false);
  const userId = getDraftOwnerId(user);
  const guest = isGuestUser(user);

  useEffect(() => {
    let active = true;
    if (!user || sessionClosedRef.current) return () => { active = false; };
    (async () => {
      try {
        const shouldShow = await shouldShowTutorial(userId, guest);
        if (active && shouldShow && !sessionClosedRef.current) setVisible(true);
      } catch (error) {
        if (active) setVisible(false);
      }
    })();
    return () => { active = false; };
  }, [guest, user, userId]);

  const closeForSession = useCallback(() => {
    sessionClosedRef.current = true;
    setVisible(false);
  }, []);

  const startTutorial = useCallback(() => {
    closeForSession();
    navigation.navigate('AppTutorial', { mode: 'automatic', returnTo: 'Home' });
  }, [closeForSession, navigation]);

  const dismissPermanently = useCallback(async () => {
    try {
      await markTutorialDismissed(userId, guest);
    } finally {
      closeForSession();
    }
  }, [closeForSession, guest, userId]);

  if (!user) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={closeForSession}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Akademika Learning</Text>
          <Text style={styles.description}>Take a quick tour to learn where to find products, catalogs, experiments, saved work and reports.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Start Tutorial" onPress={startTutorial} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Start Tutorial</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Later" onPress={closeForSession} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Don't Show Automatically Again" onPress={dismissPermanently} style={styles.textButton}>
            <Text style={styles.textButtonText}>Don't Show Automatically Again</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(21, 34, 56, 0.32)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 18 },
  title: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 16 },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  textButtonText: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
