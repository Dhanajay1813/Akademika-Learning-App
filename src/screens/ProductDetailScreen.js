import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { getProductById } from '../data/products';
export default function ProductDetailScreen({ route, navigation }) { const product = getProductById(route.params.productId); return <ScreenContainer title={product.name}><AppButton title="Catalog" onPress={() => navigation.navigate('Catalog', { productId: product.id })} /><AppButton title="Experiments" onPress={() => navigation.navigate('Experiments', { productId: product.id })} variant="secondary" /><AutoSaveStatus /></ScreenContainer>; }
