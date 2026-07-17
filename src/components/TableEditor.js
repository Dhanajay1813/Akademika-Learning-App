import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import AppButton from './AppButton';
import { colors } from '../constants/colors';

export default function TableEditor({ table, onChange }) {
  const updateCell = (r, c, value) => {
    onChange({
      ...table,
      rows: table.rows.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? value : cell))),
    });
  };

  const updateColumn = (index, value) => {
    onChange({
      ...table,
      columns: table.columns.map((column, ci) => (ci === index ? value : column)),
    });
  };

  const addRow = () => {
    onChange({ ...table, rows: [...table.rows, table.columns.map(() => '')] });
  };

  const removeRow = () => {
    if (table.rows.length <= 1) {
      Alert.alert('Table required', 'At least one row and one column are required.');
      return;
    }
    onChange({ ...table, rows: table.rows.slice(0, -1) });
  };

  const addColumn = () => {
    onChange({
      ...table,
      columns: [...table.columns, `Column ${table.columns.length + 1}`],
      rows: table.rows.map((row) => [...row, '']),
    });
  };

  const removeColumn = () => {
    if (table.columns.length <= 1) {
      Alert.alert('Table required', 'At least one row and one column are required.');
      return;
    }
    onChange({
      ...table,
      columns: table.columns.slice(0, -1),
      rows: table.rows.map((row) => row.slice(0, -1)),
    });
  };

  return (
    <View>
      <TextInput
        value={table.tableName}
        onChangeText={(tableName) => onChange({ ...table, tableName })}
        style={styles.nameInput}
        placeholder="Table Name"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            {table.columns.map((column, index) => (
              <TextInput
                key={index}
                value={column}
                onChangeText={(value) => updateColumn(index, value)}
                style={[styles.cell, styles.headerCell]}
              />
            ))}
          </View>
          {table.rows.map((row, r) => (
            <View key={r} style={styles.row}>
              {table.columns.map((_, c) => (
                <TextInput
                  key={c}
                  value={row[c]}
                  onChangeText={(value) => updateCell(r, c, value)}
                  style={styles.cell}
                  keyboardType="numeric"
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <AppButton title="Add Row" onPress={addRow} variant="secondary" />
      <AppButton title="Remove Row" onPress={removeRow} variant="secondary" />
      <AppButton title="Add Column" onPress={addColumn} variant="secondary" />
      <AppButton title="Remove Column" onPress={removeColumn} variant="secondary" />
      <AppButton
        title="Clear Table"
        onPress={() => onChange({ tableName: 'Observation Table', columns: ['Voltage', 'Current'], rows: [['', '']] })}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 120,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  headerCell: {
    fontWeight: '700',
    backgroundColor: '#EAF2FB',
  },
});
