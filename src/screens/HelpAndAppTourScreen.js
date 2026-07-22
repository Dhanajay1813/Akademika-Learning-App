import { Pressable, StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import HelpTopicCard, { HelpText } from '../components/tutorial/HelpTopicCard';
import { colors } from '../constants/colors';
import { useAppRefresh } from '../context/AppRefreshContext';

const TOPICS = [
  ['Using Products', 'Open Products, select a category, choose a product, then open Catalog or Experiments when they are available.'],
  ['Catalogs and Image Zoom', 'Scroll catalog pages, pinch inline to zoom, tap a page to open full screen, then pinch, pan or double-tap to zoom and reset. Manual images use the same style of zoom when supported.'],
  ['Using Experiments', 'Choose an experiment and open available sections such as Objective, Theory, Functional Block, Procedure, Technical Data, Observation, Equipments, Result, Conclusion and References. Optional sections may not appear when content is absent.'],
  ['Completing an Experiment', 'After reviewing an available section, use Mark Section Complete. At 100% completion you can generate the Complete Experiment PDF.'],
  ['Capture, Tables and Graphs', 'Capture Signal / Your Signal, Observation Table and Graph tools are optional records. They do not prevent the experiment from reaching 100%, and saved records appear in the complete PDF when available.'],
  ['Progress and Pending Items', 'Completion is based on available manual sections. View Pending Items shows exactly which required sections remain.'],
  ['Complete Experiment PDF', 'The Complete Experiment PDF appears at 100% completion. It includes available manual content and saved student work. Use Open, Share or Save options when available.'],
  ['Workbook', 'Workbook contains experiment journals, drafts and generated PDF reports so students can resume work and find completed records.'],
  ['Internships', 'Open Internships to view available training and internship information.'],
  ['References', 'References may contain books, datasheets, websites or supporting information. Reference Signal remains under Technical Data. References do not affect progress.'],
  ['Refresh App Data', 'Refresh reloads saved app information. It does not clear saved work, does not clear image cache and does not log you out.'],
  ['Navigation Guide', 'Use Home for shortcuts, Products for catalogs and experiments, Workbook for saved records, and Other for internships, help, cache tools and account options.'],
];

export default function HelpAndAppTourScreen({ navigation }) {
  const { isRefreshing, refreshAppData } = useAppRefresh();
  return (
    <ScreenContainer title="Help & App Tour" refreshing={isRefreshing} onRefresh={refreshAppData}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start Full App Tutorial"
        accessibilityHint="Replays the full Akademika Learning tutorial"
        onPress={() => navigation.navigate('AppTutorial', { mode: 'manual', returnTo: 'HelpAndAppTour' })}
        style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
      >
        <Text style={styles.startText}>Start Full App Tutorial</Text>
      </Pressable>
      {TOPICS.map(([title, text], index) => (
        <HelpTopicCard key={title} title={title} defaultOpen={index === 0}>
          <HelpText>{text}</HelpText>
        </HelpTopicCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  startButton: { minHeight: 52, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 14 },
  startText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  pressed: { opacity: 0.8 },
});
