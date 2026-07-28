import ScreenContainer from '../components/ScreenContainer';
import ManualPdfSectionViewer from '../components/ManualPdfSectionViewer';
import { getMappedManual } from '../data/manualData';
import { getProductById } from '../data/products';
import { getCompleteManualPages } from '../services/manualPdfAssetService';

export default function CompleteManualScreen({ route }) {
  const { productId, manualId } = route.params;
  const product = getProductById(productId);
  const selectedManualId = manualId || product?.manualId;
  const manual = getMappedManual(selectedManualId);
  const pages = getCompleteManualPages(selectedManualId);

  return (
    <ScreenContainer title="Complete Manual" scroll={false}>
      <ManualPdfSectionViewer manualId={selectedManualId} pages={pages} title={manual?.productName || product?.name || 'Complete Manual'} isCompleteManual />
    </ScreenContainer>
  );
}
