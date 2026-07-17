import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import AutoSaveStatus from '../components/AutoSaveStatus';
import GraphPreview from '../components/GraphPreview';
import { colors } from '../constants/colors';
import { getDrafts } from '../storage/storage';
import { saveDraftPatch } from '../storage/autosave';
import { getNumericPairs, hasPlottableTable } from '../utils/graphUtils';

export default function GraphScreen({ route }) {
  const { productId, experimentId } = route.params;
  const [table, setTable] = useState({ columns: [], rows: [] });
  const [graph, setGraph] = useState({ generated: false, xAxis: '', yAxis: '', graphType: 'line' });

  useEffect(() => {
    (async () => {
      const drafts = await getDrafts();
      const draft = drafts.find((item) => item.productId === productId && item.experimentId === experimentId);
      if (draft?.table) {
        setTable(draft.table);
        setGraph({
          generated: false,
          xAxis: draft.table.columns[0] || '',
          yAxis: draft.table.columns[1] || draft.table.columns[0] || '',
          graphType: 'line',
          ...(draft.graph || {}),
        });
      }
    })();
  }, [experimentId, productId]);

  const update = (patch) => setGraph((current) => ({ ...current, ...patch, generated: false }));

  const generate = async () => {
    if (!hasPlottableTable(table)) {
      Alert.alert('Table data required', 'Please fill table data first.');
      return;
    }
    if (!graph.xAxis || !graph.yAxis) {
      Alert.alert('Select columns', 'Select X-Axis and Y-Axis columns.');
      return;
    }

    const points = getNumericPairs(table, graph.xAxis, graph.yAxis);
    const requiredPoints = graph.graphType === 'line' ? 2 : 1;
    if (points.length < requiredPoints) {
      Alert.alert('Invalid data', 'Please enter valid numeric table data to plot graph.');
      return;
    }

    const next = { ...graph, generated: true };
    setGraph(next);
    await saveDraftPatch({ productId, experimentId, patch: { graph: next } });
  };

  const saveGraph = async () => {
    if (!graph.generated) {
      Alert.alert('Generate graph', 'Generate Graph before saving.');
      return;
    }
    await saveDraftPatch({ productId, experimentId, patch: { graph } });
  };

  return (
    <ScreenContainer title="Graph">
      <Text style={styles.label}>Select X-Axis column</Text>
      {table.columns.map((column, index) => (
        <AppButton key={`x-${column}-${index}`} title={column} onPress={() => update({ xAxis: column })} variant={graph.xAxis === column ? 'primary' : 'secondary'} />
      ))}
      <Text style={styles.label}>Select Y-Axis column</Text>
      {table.columns.map((column, index) => (
        <AppButton key={`y-${column}-${index}`} title={column} onPress={() => update({ yAxis: column })} variant={graph.yAxis === column ? 'primary' : 'secondary'} />
      ))}
      <Text style={styles.label}>Graph Type</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <AppButton title="Line" onPress={() => update({ graphType: 'line' })} variant={graph.graphType === 'line' ? 'primary' : 'secondary'} />
        </View>
        <View style={styles.half}>
          <AppButton title="Scatter" onPress={() => update({ graphType: 'scatter' })} variant={graph.graphType === 'scatter' ? 'primary' : 'secondary'} />
        </View>
      </View>
      <AppButton title="Generate Graph" onPress={generate} />
      <GraphPreview table={table} graph={graph} />
      <AppButton title="Save Graph" onPress={saveGraph} variant="secondary" />
      <AutoSaveStatus />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
});
