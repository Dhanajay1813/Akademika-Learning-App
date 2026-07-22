import { useEffect, useState } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { productCategories } from '../data/products';
import { useAppRefresh } from '../context/AppRefreshContext';

export default function ProductsScreen({ navigation }) {
  const { refreshVersion, isRefreshing, refreshAppData } = useAppRefresh();
  const [categories, setCategories] = useState(productCategories);

  useEffect(() => {
    setCategories([...productCategories]);
  }, [refreshVersion]);

  return (
    <ScreenContainer title="Products" refreshing={isRefreshing} onRefresh={refreshAppData}>
      {categories.map((category) => (
        <AppCard key={category.id} title={category.name}>
          <AppButton title="Open" onPress={() => navigation.navigate('ProductList', { categoryId: category.id })} />
        </AppCard>
      ))}
      <AutoSaveStatus />
    </ScreenContainer>
  );
}
