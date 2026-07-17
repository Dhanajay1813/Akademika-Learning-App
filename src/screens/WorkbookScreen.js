import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getExperimentById } from '../data/experiments';
import { getProductById } from '../data/products';
import { getCurrentUser, getDrafts } from '../storage/storage';

const getDraftOwnerId = (user) => user?.id || user?.firebaseUid || user?.email || 'local-user';

export default function WorkbookScreen({ navigation }) {
  const [tab, setTab] = useState('progress');
  const [drafts, setDrafts] = useState([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const user = await getCurrentUser();
      const userId = getDraftOwnerId(user);
      const all = await getDrafts();
      const visibleDrafts = all.filter((draft) => !draft.userId || draft.userId === userId);
      setDrafts(visibleDrafts);
    })();
  }, []));

  const shown = drafts.filter((draft) => (tab === 'completed' ? draft.pdfGenerated : !draft.pdfGenerated));

  return (
    <ScreenContainer title="Workbook">
      <View style={styles.tabs}>
        <View style={styles.tab}>
          <AppButton title="In Progress" onPress={() => setTab('progress')} variant={tab === 'progress' ? 'primary' : 'secondary'} />
        </View>
        <View style={styles.tab}>
          <AppButton title="Completed" onPress={() => setTab('completed')} variant={tab === 'completed' ? 'primary' : 'secondary'} />
        </View>
      </View>
      {shown.map((draft) => {
        const product = getProductById(draft.productId);
        const experiment = getExperimentById(draft.experimentId);
        const subtitle = (product?.name || 'Product') + '\nLast saved: ' + (draft.lastSavedAt ? new Date(draft.lastSavedAt).toLocaleString() : 'Not saved') + '\nProgress: ' + (draft.progress || 0) + '%';

        return (
          <AppCard key={draft.id} title={experiment?.title || 'Experiment'} subtitle={subtitle}>
            {tab === 'completed' ? (
              <>
                <Text style={styles.status}>PDF status: Generated</Text>
                <AppButton title="View PDF" onPress={() => navigation.navigate('GeneratePDF', { productId: draft.productId, experimentId: draft.experimentId })} />
                <AppButton title="Share" onPress={() => Alert.alert('Share', 'Open generated PDF screen to share.')} variant="secondary" />
              </>
            ) : (
              <AppButton title="Resume" onPress={() => navigation.navigate('ExperimentMenu', { productId: draft.productId, experimentId: draft.experimentId })} />
            )}
          </AppCard>
        );
      })}
      {shown.length === 0 ? <Text style={styles.empty}>No workbook items yet.</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tab: { flex: 1 },
  status: { color: colors.success, fontWeight: '700', marginBottom: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
