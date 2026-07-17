import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../storage/storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const currentUser = await getCurrentUser();
      navigation.replace(currentUser ? 'Home' : 'Entry');
    }, 900);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>Akademika Learning App</Text>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 24, textAlign: 'center' },
});
