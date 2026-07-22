import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../constants/colors';
import { getDraftOwnerId, isGuestUser } from '../../auth/userRole';
import { markWhatsNewCompleted, shouldShowTutorial, shouldShowWhatsNew } from '../../services/tutorialService';
import { WHATS_NEW_ITEMS } from '../../config/whatsNewConfig';

export default function WhatsNewPrompt({ user }) {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const userId = getDraftOwnerId(user);
  const guest = isGuestUser(user);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    (async () => {
      try {
        const tutorialDue = await shouldShowTutorial(userId, guest);
        const whatsNewDue = await shouldShowWhatsNew(userId, guest);
        if (active && !tutorialDue && whatsNewDue) setVisible(true);
      } catch (error) {
        if (active) setVisible(false);
      }
    })();
    return () => { active = false; };
  }, [guest, user, userId]);

  const close = useCallback(async () => {
    try {
      await markWhatsNewCompleted(userId, guest);
    } finally {
      setVisible(false);
    }
  }, [guest, userId]);

  const viewTutorial = useCallback(async () => {
    await close();
    navigation.navigate('AppTutorial', { mode: 'manual', returnTo: 'Home' });
  }, [close, navigation]);

  if (!user) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>What's New</Text>
          {WHATS_NEW_ITEMS.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemText}>{item.description}</Text>
            </View>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="View Full Tutorial" onPress={viewTutorial} style={styles.primaryButton}>
            <Text style={styles.primaryText}>View Full Tutorial</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close What's New" onPress={close} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(21, 34, 56, 0.32)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 440, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 18 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  item: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: 3 },
  itemText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
});
