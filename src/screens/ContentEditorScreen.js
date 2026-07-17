import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { colors } from '../constants/colors';
import {
  canEditContentForProduct,
  copyAcsDraftImage,
  exportAcsContentDraft,
  getAcsContentSection,
  saveAcsContentSection,
} from '../storage/contentEditorStorage';

const makeBlockId = () => 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
const makeTextBlock = (order) => ({ id: makeBlockId(), type: 'text', text: '', order });
const makeNoteBlock = (order) => ({ id: makeBlockId(), type: 'note', text: '', order });
const makeImageBlock = ({ id, imageUri, order }) => ({ id, type: 'image', imageUri, caption: '', order });

export default function ContentEditorScreen({ route, navigation }) {
  const { productId, experimentId, sectionKey, title, technical } = route.params;
  const isAllowed = canEditContentForProduct(productId);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    if (!isAllowed) {
      navigation.goBack();
      return;
    }
    (async () => {
      const existing = await getAcsContentSection({ productId, experimentId, sectionKey, technical });
      setBlocks((existing?.blocks || []).map((block, index) => ({
        ...block,
        imageUri: block.imageUri || block.uri || '',
        order: block.order || index + 1,
      })));
    })();
  }, [experimentId, isAllowed, navigation, productId, sectionKey, technical]);

  const normalizeOrder = (items) => items.map((item, index) => ({ ...item, order: index + 1 }));

  const updateBlock = (id, patch) => {
    setBlocks((items) => normalizeOrder(items.map((item) => (item.id === id ? { ...item, ...patch } : item))));
  };

  const deleteBlock = (id) => {
    setBlocks((items) => normalizeOrder(items.filter((item) => item.id !== id)));
  };

  const addTextBlock = () => {
    if (!isAllowed) return;
    setBlocks((items) => normalizeOrder([...items, makeTextBlock(items.length + 1)]));
  };

  const addNoteBlock = () => {
    if (!isAllowed) return;
    setBlocks((items) => normalizeOrder([...items, makeNoteBlock(items.length + 1)]));
  };

  const addImageBlock = async () => {
    if (!isAllowed) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to add an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled) return;

    const blockId = makeBlockId();
    const imageUri = await copyAcsDraftImage({
      productId,
      experimentId,
      sourceUri: result.assets[0].uri,
      blockId,
    });
    if (!imageUri) return;
    setBlocks((items) => normalizeOrder([...items, makeImageBlock({ id: blockId, imageUri, order: items.length + 1 })]));
  };

  const save = async () => {
    if (!isAllowed) return;
    await saveAcsContentSection({ productId, experimentId, sectionKey, title, technical, blocks: normalizeOrder(blocks) });
    Alert.alert('Saved', 'ACS content draft saved.');
  };

  const exportDraft = async () => {
    const uri = await exportAcsContentDraft(productId);
    if (uri) Alert.alert('Exported', 'Final ACS content pack generated with manualContent_acs.json and images.');
  };

  if (!isAllowed) return null;

  return (
    <ScreenContainer title="ACS Content Entry">
      <Text style={styles.sectionTitle}>{title}</Text>
      {blocks.map((block, index) => (
        <View key={block.id} style={styles.block}>
          <Text style={styles.blockTitle}>{block.type === 'image' ? 'Image Block' : block.type === 'note' ? 'Note Block' : 'Text Block'} {index + 1}</Text>
          {block.type === 'image' ? (
            <>
              {block.imageUri ? <Image source={{ uri: block.imageUri }} style={styles.preview} resizeMode="contain" /> : null}
              <AppInput label="Caption" value={block.caption} onChangeText={(caption) => updateBlock(block.id, { caption })} />
              {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
            </>
          ) : (
            <AppInput
              label={block.type === 'note' ? 'Note' : 'Text'}
              value={block.text}
              onChangeText={(text) => updateBlock(block.id, { text })}
              multiline
            />
          )}
          <AppButton title="Delete Block" onPress={() => deleteBlock(block.id)} variant="secondary" />
        </View>
      ))}
      <View style={styles.actions}>
        <AppButton title="Add Text Block" onPress={addTextBlock} />
        <AppButton title="Add Image Block" onPress={addImageBlock} variant="secondary" />
        <AppButton title="Add Note Block" onPress={addNoteBlock} variant="secondary" />
      </View>
      <AppButton title="Save" onPress={save} variant="secondary" />
      <View style={styles.exportSection}>
        <AppButton title="Generate Final ACS Content Pack" onPress={exportDraft} />
        <Text style={styles.exportDescription}>This will create the final ACS manualContent JSON and image folder from the typed draft content. Use this after ACS content entry is complete.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: 12, marginBottom: 12 },
  blockTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  preview: { width: '100%', height: 220, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 10, backgroundColor: '#FFFFFF' },
  caption: { color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  actions: { marginTop: 4, marginBottom: 6 },
  exportSection: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  exportDescription: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
});
