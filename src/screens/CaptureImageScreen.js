import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AutoSaveStatus from '../components/AutoSaveStatus';
import OptimizedContentImage from '../components/OptimizedContentImage';
import { getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';

const sameDraft = (item, productId, manualId, experimentId) => (
  item.productId === productId && item.experimentId === experimentId && (!manualId || !item.manualId || item.manualId === manualId)
);

export default function CaptureImageScreen({ route }) { const { productId, experimentId, manualId } = route.params; const [images, setImages] = useState([]); const [caption, setCaption] = useState('');
  useEffect(() => { (async () => { const drafts = await getDrafts(); const draft = drafts.find((item) => sameDraft(item, productId, manualId, experimentId)); setImages(draft?.capturedImages || []); })(); }, [experimentId, manualId, productId]);
  const pick = async (camera) => { const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert('Permission needed', 'Please allow access to continue.'); const result = camera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if (!result.canceled) { const next = [...images, { id: String(Date.now()), uri: result.assets[0].uri, caption }]; setImages(next); await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId, capturedImages: next } }); setCaption(''); } };
  return <ScreenContainer title="Capture Image / Your Signal" keyboard><AppButton title="Open Camera" onPress={() => pick(true)} /><AppButton title="Upload from Gallery" onPress={() => pick(false)} variant="secondary" /><AppInput label="Caption" value={caption} onChangeText={setCaption} />{images.map((image) => <View key={image.id} style={styles.preview}><OptimizedContentImage source={{ uri: image.uri }} width="100%" height={180} style={styles.image} accessibilityLabel={image.caption || 'Captured signal'} recyclingKey={`capture:${image.id}`} cacheKey={`capture:${image.id}:${image.uri}`} /></View>)}<AppButton title="Save Image" onPress={() => saveDraftPatch({ productId, experimentId, manualId, patch: { manualId, capturedImages: images } })} /><AutoSaveStatus /></ScreenContainer>; }
const styles = StyleSheet.create({ preview: { marginBottom: 12 }, image: { width: '100%', height: 220, borderRadius: 8 } });
