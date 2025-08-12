import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleResetPassword = async () => {
    if (!email || !otp || !newPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      Alert.alert("Response", data.message);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error resetting password");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
        <Text style={styles.buttonText}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fcf7f7' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#850a0a', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14, color: '#000' },
    button: { backgroundColor: '#850a0a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});