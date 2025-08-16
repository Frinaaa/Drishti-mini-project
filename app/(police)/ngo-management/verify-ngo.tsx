import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VerifyNgoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify NGO</Text>
      <Text>A list of unverified NGOs will be displayed here for verification.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});