import { Link, useRouter } from 'expo-router';
// UPDATED: Import useState and ActivityIndicator
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
// ADDED: Import the backend URL
import { BACKEND_API_URL } from '../../config/api';

export default function PoliceLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ADDED: State to manage the loading spinner
  const [loading, setLoading] = useState(false);

  // UPDATED: The function is now async to handle the API call
  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter your ID and password.');
    }

    // --- REMOVED CLIENT-SIDE VALIDATION TO RELY ON BACKEND ---
    // You can re-add it if you want both client and server validation.

    setLoading(true);

    try {
       const response = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if the user has the 'Police' role
        if (data.user?.role?.role_name === 'Police') {
          Alert.alert('Success', 'Logged in successfully!');
          // Navigate to the police dashboard
          router.replace({ pathname: '/(police)/police-dashboard', params: { officerName: data.user.name } });
        } else {
          // If the user is valid but not a police officer
          Alert.alert('Login Failed', 'This login is for Police Officers only.');
        }
      } else {
         // Handle errors from the server, like "Invalid credentials"
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
      
      {/* UPDATED: Show a loading spinner during the API call */}
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