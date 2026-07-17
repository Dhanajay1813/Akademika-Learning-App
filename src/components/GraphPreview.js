import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../constants/colors';
import { getNumericPairs } from '../utils/graphUtils';

const chartWidth = Dimensions.get('window').width - 36;
const chartHeight = 240;
const padding = 34;

const scalePoints = (points) => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  return points.map((point) => ({
    ...point,
    sx: padding + ((point.x - minX) / xRange) * plotWidth,
    sy: chartHeight - padding - ((point.y - minY) / yRange) * plotHeight,
  }));
};

function SvgGraph({ points, graph }) {
  const scaled = scalePoints(points);
  const polylinePoints = scaled.map((point) => point.sx + ',' + point.sy).join(' ');
  const showLine = graph.graphType === 'line' && scaled.length > 1;

  return (
    <View style={styles.svgWrap}>
      <Svg width={chartWidth} height={chartHeight}>
        <Line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke={colors.border} strokeWidth="1" />
        <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke={colors.border} strokeWidth="1" />
        <SvgText x={padding} y={18} fill={colors.muted} fontSize="11">{graph.yAxis || 'Y'}</SvgText>
        <SvgText x={chartWidth - padding - 48} y={chartHeight - 8} fill={colors.muted} fontSize="11">{graph.xAxis || 'X'}</SvgText>
        {showLine ? <Polyline points={polylinePoints} fill="none" stroke={colors.primary} strokeWidth="3" /> : null}
        {scaled.map((point, index) => (
          <Circle key={point.x + '-' + point.y + '-' + index} cx={point.sx} cy={point.sy} r="5" fill={colors.primary} />
        ))}
      </Svg>
    </View>
  );
}

export default function GraphPreview({ table, graph }) {
  if (!graph?.generated) {
    return <View style={styles.placeholder}><Text style={styles.placeholderText}>Graph Area</Text></View>;
  }

  const points = getNumericPairs(table, graph.xAxis, graph.yAxis);

  if (!points.length) {
    return <View style={styles.placeholder}><Text style={styles.placeholderText}>No numeric points to plot.</Text></View>;
  }

  return <SvgGraph points={points} graph={graph} />;
}

const styles = StyleSheet.create({
  placeholder: {
    height: chartHeight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    color: colors.muted,
    fontWeight: '700',
  },
  svgWrap: {
    width: chartWidth,
    height: chartHeight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
});
