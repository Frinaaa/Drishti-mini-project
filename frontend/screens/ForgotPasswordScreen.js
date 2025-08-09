import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleNext = () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email.');
    } else {
      // You can trigger OTP send here
      navigation.navigate('OTPVerificationPolice', { email }); // Change route name as needed
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <Text style={styles.label}>Enter your registered Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#880806"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF7F7', padding: 20, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  button: { backgroundColor: '#880806', paddingVertical: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
