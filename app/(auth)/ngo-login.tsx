import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
// ADDED: Imports for backend connection
import { BACKEND_API_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NgoLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // UPDATED: This function now saves the userId on successful login
  const handleLogin = async () => {
    // ... (validation remains the same)
    if (!email || !password) {
        return Alert.alert('Error', 'Please enter email and password.');
    }
    setLoading(true);

    // In your NGO login screen, inside the handleLogin function...

try {
    const response = await fetch(`${BACKEND_API_URL}/api/auth/ngo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const responseData = await response.json();

    if (response.ok) {
        // Existing logic
        await AsyncStorage.setItem('userId', responseData.user._id);
        await AsyncStorage.setItem('token', responseData.token);

        // [+] ADD THIS LINE: Store the user's PIN code
        if (responseData.user.pinCode) {
             await AsyncStorage.setItem('userPinCode', responseData.user.pinCode.toString());
        }

        // Navigate to dashboard
        router.replace('/(ngo)/recent-uploads');
    } else {
        throw new Error(responseData.msg || 'Login failed');
    }


    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NGO Volunteer Login</Text>
      
      <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#b94e4e" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#b94e4e" secureTextEntry value={password} onChangeText={setPassword} />
      
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" style={{marginTop: 10, marginBottom: 10}} />
      ) : (
        <CustomButton title="Login" onPress={handleLogin} />
      )}
      
      <Link href="./forgot-password" asChild replace>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </Link>
     <Link href="./submit-request" asChild>
        <Text style={styles.linkText}>Don't have an account? Submit a request</Text>
      </Link>
      
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 100, color: '#2B0000' },
    input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14 },
    linkText: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14, padding: 10 }
});