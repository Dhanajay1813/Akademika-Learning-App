import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AutoSaveStatus from '../components/AutoSaveStatus';
import ManualPageList from '../components/ManualPageList';
import { colors } from '../constants/colors';
import { getMappedSectionPages } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';

export default function ReferenceSignalScreen({ route, navigation }) {
  const { productId, experimentId, manualId, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const pageFiles = manualId
    ? getMappedSectionPages(manualId, experimentId, 'referenceSignal', true)
    : [];

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (!active) return;
      setGuestBlocked(isGuestUser(user) && !allowGuestWorkbookAccess);
      setLoadedUser(true);
    })();
    return () => { active = false; };
  }, [allowGuestWorkbookAccess]));

  useEffect(() => {
    if (loadedUser && !guestBlocked) saveDraftPatch({ productId, experimentId, patch: { manualId }, openedSection: 'referenceSignal' });
  }, [experimentId, guestBlocked, loadedUser, manualId, productId]);

  if (!loadedUser) return <ScreenContainer title="Reference Signal" scroll={false} />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Reference Signal">
        <Text style={styles.locked}>Reference signal content is not available in guest mode from Products.</Text>
      </ScreenContainer>
    );
  }

  if (manualId) {
    return (
      <ScreenContainer title="Reference Signal" scroll={false}>
        <ManualPageList manualId={manualId} pageFiles={pageFiles} />
        <AutoSaveStatus />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Reference Signal">
      <View style={styles.box}><Text style={styles.text}>Manual content not added yet.</Text></View>
      <AutoSaveStatus />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { height: 240, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 18 },
  text: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
