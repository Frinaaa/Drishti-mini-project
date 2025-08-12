import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen({ route }) {
  const role = route.params?.role || 'User';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role} Login</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});