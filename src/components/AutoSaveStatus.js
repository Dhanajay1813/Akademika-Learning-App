import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
export default function AutoSaveStatus({ offline = false }) { return <Text style={styles.text}>{offline ? 'Saved offline. Will sync later.' : 'Auto saved ✓'}</Text>; }
const styles = StyleSheet.create({ text: { color: colors.success, fontSize: 13, fontWeight: '700', marginVertical: 8 } });
