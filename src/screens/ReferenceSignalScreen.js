import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import ManualPageList from '../components/ManualPageList';
import { colors } from '../constants/colors';
import { getMappedSectionPages } from '../data/manualData';
import { saveDraftPatch } from '../storage/autosave';
import { canEditContentForProduct } from '../storage/contentEditorStorage';

export default function ReferenceSignalScreen({ route, navigation }) {
  const { productId, experimentId, manualId } = route.params;
  const canEditContent = canEditContentForProduct(productId);
  const pageFiles = manualId
    ? getMappedSectionPages(manualId, experimentId, 'referenceSignal', true)
    : [];

  useEffect(() => {
    saveDraftPatch({ productId, experimentId, openedSection: 'referenceSignal' });
  }, [experimentId, productId]);

  const editContentButton = canEditContent ? (
    <AppButton
      title="Edit Content"
      onPress={() => navigation.navigate('ContentEditor', {
        productId,
        experimentId,
        manualId,
        sectionKey: 'referenceSignal',
        title: 'Reference Signal',
        technical: true,
      })}
      variant="secondary"
    />
  ) : null;

  if (manualId) {
    return (
      <ScreenContainer title="Reference Signal" scroll={false}>
        <ManualPageList manualId={manualId} pageFiles={pageFiles} />
        {editContentButton}
        <AutoSaveStatus />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Reference Signal">
      <View style={styles.box}><Text style={styles.text}>Manual content not added yet.</Text></View>
      {editContentButton}
      <AutoSaveStatus />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { height: 240, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 18 },
  text: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
});
