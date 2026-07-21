import { useEffect, useState } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
export default function ObservationResultScreen({ route, navigation }) { const { productId, experimentId, manualId } = route.params; const [observation, setObservation] = useState(''); const [result, setResult] = useState('');
  useEffect(() => { (async () => { const drafts = await getDrafts(); const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId && (!manualId || !item.manualId || item.manualId === manualId)); setObservation(draft?.observation || ''); setResult(draft?.result || ''); })(); }, [experimentId, manualId, productId]);
  const save = async (patch) => saveDraftPatch({ productId, experimentId, manualId, patch: { manualId, ...patch } });
  return <ScreenContainer title="Observation and Result" keyboard><AppInput label="Observation" value={observation} onChangeText={(value) => { setObservation(value); save({ observation: value }); }} multiline /><AppInput label="Result / Conclusion" value={result} onChangeText={(value) => { setResult(value); save({ result: value }); }} multiline /><AutoSaveStatus /><AppButton title="Generate Complete Experiment PDF" onPress={() => navigation.navigate('GeneratePDF', { productId, experimentId, manualId })} /></ScreenContainer>; }
