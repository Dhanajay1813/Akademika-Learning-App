import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import TableEditor from '../components/TableEditor';
import { getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
import { hasPlottableTable } from '../utils/graphUtils';
const emptyTable = { tableName: 'Observation Table', columns: ['Voltage', 'Current'], rows: [['', '']] };
const sameDraft = (item, productId, manualId, experimentId) => item.productId === productId && item.experimentId === experimentId && (!manualId || !item.manualId || item.manualId === manualId);
export default function TableScreen({ route, navigation }) { const { productId, experimentId, manualId } = route.params; const [table, setTable] = useState(emptyTable);
  useEffect(() => { (async () => { const drafts = await getDrafts(); const draft = drafts.find((item) => sameDraft(item, productId, manualId, experimentId)); if (draft?.table) setTable(draft.table); })(); }, [experimentId, manualId, productId]);
  const change = async (next) => { setTable(next); await saveDraftPatch({ productId, experimentId, manualId, patch: { manualId, table: next } }); };
  const plot = () => { if (!hasPlottableTable(table)) return Alert.alert('Table data required', 'Please fill table data first.'); if (table.columns.length < 2) return Alert.alert('Need two columns', 'Table must have at least two columns to plot.'); navigation.navigate('Graph', { productId, experimentId, manualId }); };
  return <ScreenContainer title="Table" keyboard><TableEditor table={table} onChange={change} /><AppButton title="Plot" onPress={plot} /><AutoSaveStatus /></ScreenContainer>; }
