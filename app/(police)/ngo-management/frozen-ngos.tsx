import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FrozenNgosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frozen NGOs</Text>
      <Text>A list of NGOs with suspended access will be shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});