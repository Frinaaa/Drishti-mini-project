// app/(auth)/forgot-password.tsx

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    
    setLoading(true);
    try {
        const response = await fetch(`${BACKEND_API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'An error occurred.');
        }

        // --- THIS IS THE CRITICAL FIX ---
        // 1. Show the success alert to the user.
        Alert.alert('Code Sent', data.msg);

        // 2. IMMEDIATELY after showing the alert, command the navigation.
        // This is more reliable than putting the navigation inside the alert's onPress callback.
        router.push({
            pathname: '/(auth)/reset-password',
            params: { email } // Pass the email to the next screen
        });
        
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Enter your registered Email" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none" 
        keyboardType="email-address" 
      />
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" />
      ) : (
        <CustomButton title="Send Reset Code" onPress={handleSendCode} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 100, color: '#2B0000' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14 },
});