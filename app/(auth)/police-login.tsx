// app/(auth)/police-login.tsx

import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

export default function PoliceLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter your email and password.');
    }
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        // --- THIS IS THE CRITICAL FIX ---
        // The login request should ONLY send the email and password.
        // The server is responsible for determining the user's role.
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // After a successful login, we check the role that the SERVER sent back to us.
        if (data.user?.role?.role_name === 'Police') {

          // Save the token and user ID for future requests
          await AsyncStorage.setItem('authToken', data.token);
          await AsyncStorage.setItem('userId', data.user._id);

          Alert.alert('Success', 'Logged in successfully!');
          router.replace({ pathname: '/(police)/police-dashboard', params: { officerName: data.user.name } });

        } else {
          // This will now correctly catch Family or NGO members trying to log in here.
          Alert.alert('Access Denied', 'This login portal is for Police Officers only.');
        }
      } else {
         // This handles backend errors like "Invalid credentials"
         Alert.alert('Login Failed', data.msg || 'Invalid credentials.');
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
      <Text style={styles.title}>Police Officer Login</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email or Police ID" 
        placeholderTextColor="#b94e4e" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        placeholderTextColor="#b94e4e" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 10, marginBottom: 10 }} />
      ) : (
        <CustomButton title="Login" onPress={handleLogin} />
      )}
      
      <Link href="./forgot-password" asChild>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fcf7f7',
    padding: 20, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 100,
    color: '#2B0000' 
  },
  input: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#E4C4C4', 
    marginBottom: 14 
  },
  linkText: {
    color: '#850a0a', 
    textAlign: 'center', 
    marginTop: 18, 
    fontSize: 14, 
    padding: 10 
  }
});