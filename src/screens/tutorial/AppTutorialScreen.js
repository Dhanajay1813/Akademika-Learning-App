import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../constants/colors';
import TutorialSlide from '../../components/tutorial/TutorialSlide';
import TutorialProgressDots from '../../components/tutorial/TutorialProgressDots';
import { getCurrentUser } from '../../storage/storage';
import { getDraftOwnerId, isGuestUser } from '../../auth/userRole';
import { markTutorialCompleted, markTutorialSkipped } from '../../services/tutorialService';

const SLIDES = [
  {
    icon: 'school-outline',
    title: 'Welcome to Akademika Learning',
    description: 'Explore laboratory products, study experiment manuals, save practical work and generate complete experiment reports.',
  },
  {
    icon: 'menu-outline',
    title: 'Find Everything from the Bottom Menu',
    description: 'Use Home, Products, Workbook and Other to move through the app.',
    points: [
      { label: 'Home', text: 'main shortcuts' },
      { label: 'Products', text: 'catalogs and experiments' },
      { label: 'Workbook', text: 'saved records and PDFs' },
      { label: 'Other', text: 'internships, help and account options' },
    ],
  },
  {
    icon: 'grid-outline',
    title: 'Browse Products by Category',
    description: 'Open Products, choose a laboratory category and select the required trainer or system.',
  },
  {
    icon: 'images-outline',
    title: 'Catalogs and Experiments',
    description: 'Each product can provide a product catalog and a list of practical experiments.',
    instruction: 'Catalog pages can be opened, pinched and zoomed.',
  },
  {
    icon: 'document-text-outline',
    title: 'Study the Complete Experiment',
    description: 'Open Objective, Theory, Functional Block, Procedure, Technical Data, Observation, Equipments, Result, Conclusion and References when available.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Track Your Experiment Progress',
    description: 'Use Mark Section Complete after reviewing an available section.',
    instruction: 'Open View Pending Items to see exactly what remains before reaching 100%.',
  },
  {
    icon: 'analytics-outline',
    title: 'Create Your Experiment Record',
    description: 'Inside Procedure, you can optionally save Capture Signal / Your Signal, Observation Tables and Graphs.',
    instruction: 'These tools do not prevent the experiment from reaching 100%.',
  },
  {
    icon: 'document-attach-outline',
    title: 'Generate Your Complete Report',
    description: 'At 100% completion, generate a Complete Experiment PDF containing the manual content and your saved work.',
    instruction: 'The report can be opened, shared or saved.',
  },
  {
    icon: 'book-outline',
    title: 'Find Saved Work in Workbook',
    description: 'Workbook contains experiment journals, drafts and generated PDF reports.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Explore Internships',
    description: 'Open Internships to view available training and internship information.',
  },
  {
    icon: 'refresh-outline',
    title: 'Refresh or Replay the Tour',
    description: 'Use Refresh to reload saved app information without deleting your work.',
    instruction: 'You can replay this tutorial anytime from Other -> Help & App Tour.',
  },
];

export default function AppTutorialScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [user, setUser] = useState(null);
  const mode = route.params?.mode || 'manual';
  const returnTo = route.params?.returnTo || (mode === 'manual' ? 'HelpAndAppTour' : 'Home');
  const automatic = mode === 'automatic';

  useEffect(() => {
    let active = true;
    (async () => {
      const currentUser = await getCurrentUser();
      if (active) setUser(currentUser);
    })();
    return () => { active = false; };
  }, []);

  const finish = useCallback(async (status = 'completed') => {
    if (automatic && user) {
      const userId = getDraftOwnerId(user);
      const guest = isGuestUser(user);
      if (status === 'completed') await markTutorialCompleted(userId, guest);
      if (status === 'skipped') await markTutorialSkipped(userId, guest);
    }
    navigation.navigate(returnTo);
  }, [automatic, navigation, returnTo, user]);

  const confirmExit = useCallback(() => {
    Alert.alert('Exit the tutorial?', '', [
      { text: 'Continue Tutorial', style: 'cancel' },
      { text: 'Exit', onPress: () => finish('skipped') },
    ]);
  }, [finish]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmExit();
      return true;
    });
    return () => subscription.remove();
  }, [confirmExit]));

  const goTo = useCallback((nextIndex) => {
    const clamped = Math.max(0, Math.min(nextIndex, SLIDES.length - 1));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  }, []);

  const next = useCallback(() => {
    if (index >= SLIDES.length - 1) finish('completed');
    else goTo(index + 1);
  }, [finish, goTo, index]);

  const onMomentumScrollEnd = useCallback((event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setIndex(Math.max(0, Math.min(nextIndex, SLIDES.length - 1)));
  }, [width]);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}> 
      <View style={styles.header}>
        <Text style={styles.counter} accessibilityLabel={`Tutorial step ${index + 1} of ${SLIDES.length}`}>{index + 1} / {SLIDES.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip tutorial" onPress={() => finish('skipped')} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <TutorialSlide slide={item} width={width} />}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        extraData={width}
      />
      <TutorialProgressDots total={SLIDES.length} index={index} />
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous tutorial step" onPress={() => goTo(index - 1)} disabled={index === 0} style={[styles.secondaryButton, index === 0 && styles.disabled]}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={index === SLIDES.length - 1 ? 'Start using Akademika Learning' : 'Next tutorial step'} onPress={next} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{index === SLIDES.length - 1 ? 'Start Exploring' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  counter: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  skipButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  skipText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingBottom: 4 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.surface },
  secondaryText: { color: colors.primary, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
