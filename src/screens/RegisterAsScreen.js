import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';

export default function RegisterAsScreen({ navigation }) {
  return (
    <ScreenContainer title="Register As">
      <AppButton title="Student" onPress={() => navigation.navigate('StudentRegistration')} />
      <AppButton title="Guest" onPress={() => navigation.navigate('GuestRegistration')} variant="secondary" />
    </ScreenContainer>
  );
}
