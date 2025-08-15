import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status</Text>
      <Text>This screen will show the status of all active reports.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF8' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#3A0000' },
});