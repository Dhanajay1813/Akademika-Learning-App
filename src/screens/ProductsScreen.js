import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { productCategories } from '../data/products';

export default function ProductsScreen({ navigation }) {
  return (
    <ScreenContainer title="Products">
      {productCategories.map((category) => (
        <AppCard key={category.id} title={category.name}>
          <AppButton title="Open" onPress={() => navigation.navigate('ProductList', { categoryId: category.id })} />
        </AppCard>
      ))}
      <AutoSaveStatus />
    </ScreenContainer>
  );
}
