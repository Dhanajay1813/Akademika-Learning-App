import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import ManualPageList from '../components/ManualPageList';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getMappedSectionPages } from '../data/manualData';
import { getDrafts } from '../storage/storage';
import { hasPlottableTable } from '../utils/graphUtils';
import { canEditContentForProduct } from '../storage/contentEditorStorage';

export default function ExperimentContentScreen({ route, navigation }) {
  const { productId, experimentId, manualId, sectionKey, title, technical } = route.params;
  const legacyExperiment = manualId ? null : getExperimentById(experimentId);
  const legacyText = technical
    ? legacyExperiment?.sections.technicalData[sectionKey]
    : legacyExperiment?.sections[sectionKey];
  const pageFiles = manualId
    ? getMappedSectionPages(manualId, experimentId, sectionKey, technical)
    : [];
  const isProcedure = sectionKey === 'procedure' && !technical;
  const canEditContent = canEditContentForProduct(productId);
  const editContentButton = canEditContent ? (
    <AppButton
      title="Edit Content"
      onPress={() => navigation.navigate('ContentEditor', { productId, experimentId, manualId, sectionKey, title, technical })}
      variant="secondary"
    />
  ) : null;

  const openGraph = async () => {
    const drafts = await getDrafts();
    const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId);
    if (!hasPlottableTable(draft?.table)) {
      Alert.alert('Table data required', 'Please fill table data first.');
      return;
    }
    navigation.navigate('Graph', { productId, experimentId });
  };

  const recordTools = isProcedure ? (
    <View style={styles.recordSection}>
      <Text style={styles.recordTitle}>Experiment Record</Text>
      <AppButton title="Capture Signal / Your Signal" onPress={() => navigation.navigate('CaptureImage', { productId, experimentId })} />
      <AppButton title="Table" onPress={() => navigation.navigate('Table', { productId, experimentId })} variant="secondary" />
      <AppButton title="Graph" onPress={openGraph} variant="secondary" />
    </View>
  ) : null;

  if (manualId) {
    return (
      <ScreenContainer title={title} scroll={false}>
        <ManualPageList manualId={manualId} pageFiles={pageFiles} />
        {editContentButton}
        <AutoSaveStatus />
        {recordTools}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={title}>
      <View style={styles.placeholder}><Text style={styles.content}>{legacyText || 'Manual content not added yet.'}</Text></View>
      {editContentButton}
      <AutoSaveStatus />
      {recordTools}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: { minHeight: 220, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, justifyContent: 'center', marginBottom: 12 },
  content: { color: colors.text, fontSize: 16, lineHeight: 24 },
  recordSection: { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  recordTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
});
