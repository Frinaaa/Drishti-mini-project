import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatisticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Statistics</Text>
      <Text>This screen will display statistics and data visualizations.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});