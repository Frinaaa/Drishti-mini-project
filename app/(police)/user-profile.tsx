import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function UserProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Profile</Text>
      <Text>This screen will display the officer's profile and settings.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});