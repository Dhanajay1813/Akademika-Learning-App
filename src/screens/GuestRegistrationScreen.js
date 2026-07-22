import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { registerGuest } from '../authService';
import { saveProfile } from '../storage/storage';
import { validateProfileCompletion } from '../utils/validation';
import { colors } from '../constants/colors';

export default function GuestRegistrationScreen({ navigation }) {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [values, setValues] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: true,
  });

  const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

  const passwordVisibilityButton = (visible, toggleVisible, showLabel, hideLabel) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? hideLabel : showLabel}
      onPress={toggleVisible}
      focusable={false}
      hitSlop={4}
      style={styles.visibilityButton}
    >
      <Ionicons name={visible ? 'eye-off' : 'eye'} size={22} color={colors.muted} />
    </Pressable>
  );

  const submit = async () => {
    if (submitting) return;

    const error = validateProfileCompletion(values, 'guest');
    if (error) return Alert.alert('Check details', error);
    if (!values.termsAccepted) {
      return Alert.alert('Terms required', 'Please accept the guest terms and conditions to continue.');
    }

    const email = values.email.trim().toLowerCase();
    const fullName = values.fullName.trim();
    const mobileNumber = values.mobile.trim();

    setSubmitting(true);

    try {
      const firebaseUser = await registerGuest(
        email,
        values.password,
        fullName,
        mobileNumber,
        values.termsAccepted
      );
      await saveProfile({
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        userType: 'guest',
        fullName,
        mobile: mobileNumber,
        email,
        collegeName: '',
        course: '',
        rollNumber: '',
        semesterYear: '',
        termsAccepted: values.termsAccepted,
      });

      Alert.alert('Success!', 'Guest registered in the cloud.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) },
      ]);
    } catch (registrationError) {
      Alert.alert('Registration failed', 'Unable to register guest. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title="Guest Registration" keyboard>
      <AppInput label="Full Name" value={values.fullName} onChangeText={set('fullName')} />
      <AppInput label="Mobile Number" value={values.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <AppInput label="Email ID" value={values.email} onChangeText={set('email')} keyboardType="email-address" />
      <AppInput
        label="Password"
        value={values.password}
        onChangeText={set('password')}
        secureTextEntry={!showPassword}
        rightAccessory={passwordVisibilityButton(showPassword, () => setShowPassword((visible) => !visible), 'Show password', 'Hide password')}
      />
      <AppInput
        label="Confirm Password"
        value={values.confirmPassword}
        onChangeText={set('confirmPassword')}
        secureTextEntry={!showConfirmPassword}
        rightAccessory={passwordVisibilityButton(showConfirmPassword, () => setShowConfirmPassword((visible) => !visible), 'Show confirm password', 'Hide confirm password')}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: values.termsAccepted }}
        onPress={() => setValues((current) => ({ ...current, termsAccepted: !current.termsAccepted }))}
        style={styles.termsRow}
      >
        <View style={[styles.checkbox, values.termsAccepted && styles.checkboxChecked]}>
          {values.termsAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.termsText}>
          I agree to the terms and conditions. Akademika will store and mark my guest information, and guest data will be retained until manually deleted.
        </Text>
      </Pressable>
      <AppButton title={submitting ? 'Registering...' : 'Register'} onPress={submit} disabled={submitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  visibilityButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  termsText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
