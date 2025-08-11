<<<<<<< HEAD
import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
=======
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
>>>>>>> 5ad173e60f6c6b0a71c059c64caeba0b17c44c65

export default function ForgotPasswordScreen({ navigation, route }) {
  const { role } = route.params || {};
  const [email, setEmail] = useState('');

  // Hide the default header so only our custom back arrow shows
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role} - Forgot Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#b94e4e"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Send OTP button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('OTPVerificationScreen')} // Sends to OTP screen
      >
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#880806' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 },
  button: { backgroundColor: '#880806', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
