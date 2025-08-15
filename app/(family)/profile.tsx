import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.info}>
        Here you can manage your account details and change your password.
        To log out, use the icon in the top right of the header.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFBF8',
    padding: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#3A0000' 
  },
  info: {
    fontSize: 16,
    color: '#5B4242',
    textAlign: 'center',
    lineHeight: 24,
  }
});