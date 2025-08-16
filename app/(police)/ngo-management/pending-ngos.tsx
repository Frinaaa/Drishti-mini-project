import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PendingNgosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending NGOs</Text>
      <Text>A list of NGOs pending initial review will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});