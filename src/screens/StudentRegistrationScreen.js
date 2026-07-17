import { useState } from 'react';
import { Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { registerStudent } from '../authService';
import { saveProfile } from '../storage/storage';
import { validateProfileCompletion } from '../utils/validation';

export default function StudentRegistrationScreen({ navigation }) {
  const [submitting, setSubmitting] = useState(false);
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
      Alert.alert(
        'Registration failed',
        `Tried email: ${email}\n\n${registrationError.message || 'Unable to register student.'}`
      );
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
      <AppInput label="Password" value={values.password} onChangeText={set('password')} secureTextEntry />
      <AppInput label="Confirm Password" value={values.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry />
      <AppButton title={submitting ? 'Registering...' : 'Register'} onPress={submit} disabled={submitting} />
    </ScreenContainer>
  );
}
