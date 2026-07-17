export const hasFilledTable = (table) => {
  return Boolean(table?.columns?.length && table?.rows?.some((row) => row.some((cell) => String(cell || '').trim())));
};

export const hasPlottableTable = (table) => Boolean(table?.columns?.length >= 2 && hasFilledTable(table));

export const getColumnValues = (table, columnName) => {
  const index = table.columns.indexOf(columnName);
  if (index < 0) return [];
  return table.rows.map((row) => Number(row[index])).filter((value) => Number.isFinite(value));
};

export const getNumericPairs = (table, xAxis, yAxis) => {
  const xIndex = table?.columns?.indexOf(xAxis) ?? -1;
  const yIndex = table?.columns?.indexOf(yAxis) ?? -1;
  if (xIndex < 0 || yIndex < 0) return [];

  return (table.rows || [])
    .map((row) => ({ x: Number(row[xIndex]), y: Number(row[yIndex]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
};
