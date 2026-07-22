import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { isGuestUser } from '../auth/userRole';
import { clearImageCache } from '../services/imageCacheService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAREERS_URL = 'https://akademika.in/careers';
const BASE_BOTTOM_NAV_HEIGHT = 58;

export function getBottomNavInset(insets) {
  return Math.max(0, insets?.bottom || 0);
}

export function getBottomNavHeight(insets) {
  return BASE_BOTTOM_NAV_HEIGHT + getBottomNavInset(insets);
}

export default function BottomNav({ currentUser }) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const bottomInset = getBottomNavInset(insets);
  const barHeight = getBottomNavHeight(insets);
  const [otherOpen, setOtherOpen] = useState(false);
  const [clearingImageCache, setClearingImageCache] = useState(false);
  const guest = isGuestUser(currentUser);

  const go = (screen) => {
    setOtherOpen(false);
    if (route.name !== screen) navigation.navigate(screen);
  };

  const openCareers = async () => {
    setOtherOpen(false);
    await Linking.openURL(CAREERS_URL);
  };

  const confirmClearImageCache = () => {
    Alert.alert(
      'Clear Image Cache',
      'This clears only temporary image cache. Login, profiles, workbook data, autosave records, manuals, and catalogs are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Image Cache',
          style: 'destructive',
          onPress: async () => {
            setClearingImageCache(true);
            const result = await clearImageCache();
            setClearingImageCache(false);
            if (result.ok) {
              Alert.alert('Image cache cleared', 'Temporary image cache was cleared. Bundled manuals and catalogs were not deleted.');
            } else {
              const failures = [
                result.memory.ok ? null : `memory: ${result.memory.error || 'failed'}`,
                result.disk.ok ? null : `disk: ${result.disk.error || 'failed'}`,
              ].filter(Boolean).join('\\n');
              Alert.alert('Could not clear all image cache', failures || 'Unknown cache clearing error.');
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <View style={[styles.bar, { height: barHeight, paddingBottom: bottomInset }]}>
        <View style={styles.itemRow}>
          <NavItem label="Home" active={route.name === 'Home'} onPress={() => go('Home')} />
          <NavItem label="Products" active={route.name === 'Products'} onPress={() => go('Products')} />
          {!guest ? <NavItem label="Workbook" active={route.name === 'Workbook'} onPress={() => go('Workbook')} /> : null}
          <NavItem label="Other" active={otherOpen} onPress={() => setOtherOpen(true)} />
        </View>
      </View>
      <Modal transparent visible={otherOpen} animationType="fade" onRequestClose={() => setOtherOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOtherOpen(false)}>
          <Pressable style={[styles.menu, { paddingBottom: barHeight + 12 }]} onPress={() => {}}>
            <Text style={styles.menuTitle}>About</Text>
            <Text style={styles.aboutText}>Akademika Learning helps students access product catalogs, experiment material, and workbook records in one app.</Text>
            <Pressable style={styles.menuItem} onPress={() => go('Internships')}>
              <Text style={styles.menuItemText}>Internships</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={openCareers}>
              <Text style={styles.menuItemText}>Careers</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={confirmClearImageCache} disabled={clearingImageCache}>
              <Text style={styles.menuItemText}>Clear Image Cache</Text>
              {clearingImageCache ? <ActivityIndicator color={colors.primary} /> : null}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function NavItem({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, active && styles.activeItem, pressed && styles.pressed]}>
      <Text style={[styles.itemText, active && styles.activeText]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemRow: { height: BASE_BOTTOM_NAV_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  item: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 4 },
  activeItem: { backgroundColor: '#EAF3FC' },
  pressed: { opacity: 0.75 },
  itemText: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  activeText: { color: colors.primary },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 34, 56, 0.28)' },
  menu: { backgroundColor: colors.surface, padding: 18, paddingBottom: 88, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  menuTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  aboutText: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  menuItem: { minHeight: 46, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  menuItemText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
});
