import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { getProductById } from '../data/products';
import { isPdfPageMappedManual } from '../data/manualData';
export default function ProductDetailScreen({ route, navigation }) { const product = getProductById(route.params.productId); const showManual = isPdfPageMappedManual(product.manualId); return <ScreenContainer title={product.name}><AppButton title="Catalog" onPress={() => navigation.navigate('Catalog', { productId: product.id })} /><AppButton title="Experiments" onPress={() => navigation.navigate('Experiments', { productId: product.id })} variant="secondary" />{showManual ? <AppButton title="Open Complete Manual" onPress={() => navigation.navigate('CompleteManual', { productId: product.id, manualId: product.manualId })} variant="secondary" /> : null}<AppButton title="Help & App Tour" accessibilityLabel="Open Help and App Tour" onPress={() => navigation.navigate('HelpAndAppTour')} variant="secondary" /><AutoSaveStatus /></ScreenContainer>; }
