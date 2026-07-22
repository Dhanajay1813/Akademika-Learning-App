import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { registerStudent } from '../authService';
import { saveProfile } from '../storage/storage';
import { validateProfileCompletion } from '../utils/validation';

export default function StudentRegistrationScreen({ navigation }) {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [values, setValues] = useState({
    fullName: '',
    mobile: '',
    email: '',
    collegeName: '',
    course: '',
    rollNumber: '',
    semesterYear: '',
    password: '',
    confirmPassword: '',
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

    const error = validateProfileCompletion(values, 'student');
    if (error) return Alert.alert('Check details', error);

    const email = values.email.trim().toLowerCase();
    const fullName = values.fullName.trim();
    const mobileNumber = values.mobile.trim();
    const collegeName = values.collegeName.trim();
    const course = values.course.trim();
    const rollNumber = values.rollNumber.trim();
    const semesterYear = values.semesterYear.trim();

    setSubmitting(true);

    try {
      const firebaseUser = await registerStudent(
        email,
        values.password,
        fullName,
        mobileNumber,
        collegeName,
        course,
        rollNumber,
        semesterYear
      );
      await saveProfile({
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        userType: 'student',
        fullName,
        mobile: mobileNumber,
        email,
        collegeName,
        course,
        rollNumber,
        semesterYear,
      });

      Alert.alert('Success!', 'Student registered in the cloud.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) },
      ]);
    } catch (registrationError) {
      Alert.alert('Registration failed', 'Unable to register student. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title="Student Registration" keyboard>
      <AppInput label="Full Name" value={values.fullName} onChangeText={set('fullName')} />
      <AppInput label="Mobile Number" value={values.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <AppInput label="Email ID" value={values.email} onChangeText={set('email')} keyboardType="email-address" />
      <AppInput label="College Name" value={values.collegeName} onChangeText={set('collegeName')} />
      <AppInput label="Course" value={values.course} onChangeText={set('course')} />
      <AppInput label="Roll Number" value={values.rollNumber} onChangeText={set('rollNumber')} />
      <AppInput label="Semester / Year" value={values.semesterYear} onChangeText={set('semesterYear')} />
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
});
