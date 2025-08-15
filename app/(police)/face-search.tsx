import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FaceSearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face Search</Text>
      <Text>This screen will allow officers to perform a face search.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});