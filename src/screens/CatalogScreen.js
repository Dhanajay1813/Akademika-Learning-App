import { Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { getProductById } from '../data/products';
export default function CatalogScreen({ route }) { const product = getProductById(route.params.productId); return <ScreenContainer title="Catalog">{product.catalogs.map((catalog) => <AppCard key={catalog.id} title={catalog.title} subtitle={product.name}><AppButton title="View Catalog" onPress={() => Alert.alert('Catalog', 'Catalog PDF placeholder for MVP.')} /></AppCard>)}</ScreenContainer>; }
