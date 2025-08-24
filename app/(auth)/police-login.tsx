import { Link, useRouter } from 'expo-router';
// THIS IS THE CORRECTED LINE
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
// ADDED: Import AsyncStorage to save the login token
import AsyncStorage from '@react-native-async-storage/async-storage';
// It's better to use the path alias if you have it set up
import { BACKEND_API_URL } from '../../config/api';

export default function PoliceLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter your ID and password.');
    }
    setLoading(true);

    try {
       const response = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANT: Ensure your backend expects the 'role' field for police login
        body: JSON.stringify({ email, password, role: 'Police' }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user?.role?.role_name === 'Police') {

          /*
           * ==================================================================
           * THIS IS THE CRITICAL FIX
           * Before navigating, we MUST save the authentication token and user ID
           * that the server sent back.
           * ==================================================================
           */
          await AsyncStorage.setItem('authToken', data.token);
          await AsyncStorage.setItem('userId', data.user._id);

          Alert.alert('Success', 'Logged in successfully!');
          // Now that the token is saved, we can safely navigate to the dashboard.
          router.replace({ pathname: '/(police)/police-dashboard', params: { officerName: data.user.name } });

        } else {
          Alert.alert('Login Failed', 'This login is for Police Officers only.');
        }
      } else {
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
      
      <Link href="./forgot-password" asChild replace>
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