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
export default function TableScreen({ route, navigation }) { const { productId, experimentId } = route.params; const [table, setTable] = useState(emptyTable);
  useEffect(() => { (async () => { const drafts = await getDrafts(); const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId); if (draft?.table) setTable(draft.table); })(); }, []);
  const change = async (next) => { setTable(next); await saveDraftPatch({ productId, experimentId, patch: { table: next } }); };
  const plot = () => { if (!hasPlottableTable(table)) return Alert.alert('Table data required', 'Please fill table data first.'); if (table.columns.length < 2) return Alert.alert('Need two columns', 'Table must have at least two columns to plot.'); navigation.navigate('Graph', { productId, experimentId }); };
  return <ScreenContainer title="Table" keyboard><TableEditor table={table} onChange={change} /><AppButton title="Plot" onPress={plot} /><AutoSaveStatus /></ScreenContainer>; }
