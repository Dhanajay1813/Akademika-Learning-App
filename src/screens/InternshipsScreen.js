import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { internships } from '../data/internships';
export default function InternshipsScreen({ navigation }) { return <ScreenContainer title="Internships">{internships.map((item) => <AppCard key={item.id} title={item.title} subtitle={item.description}><AppButton title="Apply" onPress={() => navigation.navigate('InternshipApplication', { internshipId: item.id })} /></AppCard>)}</ScreenContainer>; }
