import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';

export default function EntryScreen({ navigation }) {
  return (
    <ScreenContainer title="Akademika Learning App" scroll={false}>
      <AppButton title="Register" onPress={() => navigation.navigate('RegisterAs')} />
      <AppButton title="Login" onPress={() => navigation.navigate('Login')} variant="secondary" />
    </ScreenContainer>
  );
}
