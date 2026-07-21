import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { colors } from '../constants/colors';
import { getProductCategoryById, getProductsByCategory } from '../data/products';
import OptimizedContentImage from '../components/OptimizedContentImage';

export default function ProductListScreen({ route, navigation }) {
  const category = getProductCategoryById(route.params.categoryId);
  const categoryProducts = getProductsByCategory(route.params.categoryId);

  return (
    <ScreenContainer title={category?.name || 'Products'}>
      {categoryProducts.map((product) => (
        <AppCard key={product.id} title={product.name}>
          {product.image ? (
            <OptimizedContentImage source={product.image} width="100%" height={180} style={styles.image} accessibilityLabel={product.name} recyclingKey={`product:${product.id}`} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Product image coming soon</Text>
            </View>
          )}
          <AppButton title="Know More / Open" onPress={() => navigation.navigate('ProductDetail', { productId: product.id })} />
        </AppCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 180, borderRadius: 8, marginVertical: 12 },
  placeholder: {
    width: '100%', height: 150, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, marginVertical: 12,
  },
  placeholderText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
