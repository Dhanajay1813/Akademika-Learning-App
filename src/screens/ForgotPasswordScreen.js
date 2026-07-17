import { useState } from 'react';
import { Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { resetPassword } from '../authService';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleResetPress = async () => {
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter your registered email ID.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(normalizedEmail);
      Alert.alert('Check your inbox!', 'We sent you a password reset link.');
    } catch (error) {
      Alert.alert('Password reset failed', error.message || 'Unable to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title="Forgot Password" keyboard>
      <AppInput label="Email ID" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <AppButton title={submitting ? 'Sending...' : 'Send Reset Link'} onPress={handleResetPress} disabled={submitting} />
    </ScreenContainer>
  );
}
