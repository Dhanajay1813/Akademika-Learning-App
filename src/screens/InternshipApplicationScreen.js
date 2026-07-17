import { Alert, Linking } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { internships } from '../data/internships';

const INTERNSHIP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSenlfEGh_IsOihKSfyG0KqHor1DKsstrkBoVoqNjRmHI_6p3A/viewform?usp=header';

export default function InternshipApplicationScreen({ route }) {
  const internship = internships.find((item) => item.id === route.params?.internshipId);

  const openApplicationForm = async () => {
    const supported = await Linking.canOpenURL(INTERNSHIP_FORM_URL);
    if (!supported) {
      return Alert.alert('Application Form', 'Unable to open the application form on this device.');
    }
    return Linking.openURL(INTERNSHIP_FORM_URL);
  };

  return (
    <ScreenContainer title="Internship Application" keyboard>
      <AppInput label="Internship" value={internship?.title || 'Internship'} editable={false} />
      <AppButton title="Open Application Form" onPress={openApplicationForm} />
    </ScreenContainer>
  );
}
