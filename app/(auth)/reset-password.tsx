// app/(auth)/reset-password.tsx

import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleResetPassword = async () => {
    // ... (your validation logic is correct)
    if (!email || !code || !newPassword || !confirmPassword) { return Alert.alert('Error', 'Please fill all fields.'); }
    if (newPassword !== confirmPassword) { return Alert.alert('Error', 'Passwords do not match.'); }
    if (newPassword.length < 6) { return Alert.alert('Error', 'Password must be at least 6 characters long.'); }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'An unknown error occurred.');
      }

      // --- THIS IS THE CORRECTED NAVIGATION LOGIC ---
      // 1. Show the success alert to the user first.
      Alert.alert('Success', data.msg);

      // 2. IMMEDIATELY after showing the alert, command the navigation to the main screen.
      // This is more reliable than putting the navigation inside the alert's onPress.
      // `router.replace` clears the history, which "refreshes" the user back to the main landing page.
      router.replace('/');

    } catch (error: any) {
      Alert.alert('Reset Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      
      <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
      <TextInput
        style={styles.input}
        placeholder="Enter 6-Digit Code from Email"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextInput style={styles.input} placeholder="Enter New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

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
    disabledInput: { backgroundColor: '#f0f0f0', color: '#a0a0a0' }
});