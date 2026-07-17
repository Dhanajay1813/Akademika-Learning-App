import { useEffect, useState } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import { getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
export default function ObservationResultScreen({ route, navigation }) { const { productId, experimentId } = route.params; const [observation, setObservation] = useState(''); const [result, setResult] = useState('');
  useEffect(() => { (async () => { const drafts = await getDrafts(); const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId); setObservation(draft?.observation || ''); setResult(draft?.result || ''); })(); }, []);
  const save = async (patch) => saveDraftPatch({ productId, experimentId, patch });
  return <ScreenContainer title="Observation and Result" keyboard><AppInput label="Observation" value={observation} onChangeText={(value) => { setObservation(value); save({ observation: value }); }} multiline /><AppInput label="Result / Conclusion" value={result} onChangeText={(value) => { setResult(value); save({ result: value }); }} multiline /><AutoSaveStatus /><AppButton title="Generate PDF" onPress={() => navigation.navigate('GeneratePDF', { productId, experimentId })} /></ScreenContainer>; }
