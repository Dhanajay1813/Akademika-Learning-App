import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
      <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 },
  logo: { width: 168, height: 168 },
});
