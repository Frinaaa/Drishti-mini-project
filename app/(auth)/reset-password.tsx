import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    // 1. Validate input
    if (!email || !newPassword || !confirmPassword) {
      return Alert.alert('Error', 'Please fill all fields.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match.');
    }
    if (newPassword.length < 6) {
        return Alert.alert('Error', 'Password must be at least 6 characters long.');
    }

    setLoading(true);

    try {
      // 2. Call the backend API
      const response = await fetch(`${BACKEND_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      // 3. Handle the response
      if (response.ok) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. Please log in with your new password.'
        );
        router.replace('./family-login'); // Navigate to the login screen
      } else {
        Alert.alert('Reset Failed', data.msg || 'An unknown error occurred.');
      }
    } catch (error) { // <-- FIX: Added the opening curly brace {
      console.error('Password reset error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally { // <-- FIX: The closing curly brace } for the catch block is implicitly before this line
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your registered Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#b94e4e"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholderTextColor="#b94e4e"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#b94e4e"
      />
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 10 }} />
      ) : (
        <CustomButton title="Reset Password" onPress={handleResetPassword} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fcf7f7' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#850a0a', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14, color: '#000' },
});