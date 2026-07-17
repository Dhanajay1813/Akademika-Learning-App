import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { loginUser } from '../authService';
import { setCurrentUser } from '../storage/storage';
import { colors } from '../constants/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Check details', 'Enter your email ID and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginUser(normalizedEmail, password);
      await setCurrentUser(result.profile);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (loginError) {
      Alert.alert('Login failed', 'Invalid credentials, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title="Login" keyboard>
      <AppInput label="Email ID" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <AppButton title={submitting ? 'Logging in...' : 'Login'} onPress={submit} disabled={submitting} />
      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10}>
          <Text style={styles.link}>Forgot Password?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('RegisterAs')} hitSlop={10}>
          <Text style={styles.link}>New user? Register</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  links: { gap: 14, marginTop: 10, alignItems: 'center' },
  link: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
