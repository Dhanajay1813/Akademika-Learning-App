import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { saveDraftPatch } from '../storage/autosave';
import { getCurrentUser } from '../storage/storage';
import { isGuestUser } from '../auth/userRole';

export default function TechnicalDataScreen({ route, navigation }) {
  const { productId, experimentId, manualId, allowGuestWorkbookAccess } = route.params;
  const [loadedUser, setLoadedUser] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);

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

  const open = async (sectionKey, title) => {
    if (guestBlocked) return;
    await saveDraftPatch({ productId, experimentId, patch: { manualId }, openedSection: sectionKey });
    navigation.navigate('ExperimentContent', { productId, experimentId, manualId, sectionKey, title, technical: true, allowGuestWorkbookAccess });
  };

  if (!loadedUser) return <ScreenContainer title="Technical Data" />;

  if (guestBlocked) {
    return (
      <ScreenContainer title="Technical Data">
        <Text style={styles.locked}>Technical experiment content is not available in guest mode from Products.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Technical Data">
      <AppButton title="Datasheet" onPress={() => open('datasheet', 'Datasheet')} />
      <AppButton title="Block Diagram" onPress={() => open('blockDiagram', 'Block Diagram')} />
      <AppButton title="Circuit Diagram" onPress={() => open('circuitDiagram', 'Circuit Diagram')} />
      <AppButton title="Reference Signal" onPress={() => navigation.navigate('ReferenceSignal', { productId, experimentId, manualId, allowGuestWorkbookAccess })} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  locked: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
