import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
// UPDATED: Import ActivityIndicator
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
// ADDED: Import the backend URL
import { BACKEND_API_URL } from '../../config/api';

export default function NgoLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ADDED: State to manage the loading spinner
  const [loading, setLoading] = useState(false);

  // UPDATED: The function is now async to handle the API call
  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter your email and password.');
    }
    
    // Client-side validation is good, but the backend also handles it, so we can proceed.
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    if (password.length < 6) {
      return Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if the user has the 'NGO' role
        if (data.user?.role?.role_name === 'NGO') {
          // No need for an alert on success, the navigation is enough feedback
          router.replace({ pathname: '/(ngo)/ngo-dashboard', params: { ngoName: data.user.name } });
        } else {
          // If the user is valid but not an NGO volunteer
          Alert.alert('Login Failed', 'This login is for NGO volunteers only.');
        }
      } else {
        // Handle server errors like "Invalid credentials"
        Alert.alert('Login Failed', data.msg || 'Invalid credentials.');
      }
    } catch (error) {
      console.error('NGO Login Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NGO Volunteer Login</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email Address" 
        placeholderTextColor="#b94e4e"
        value={email} 
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        placeholderTextColor="#b94e4e"
        secureTextEntry 
        value={password} 
        onChangeText={setPassword}
      />
      
      {/* UPDATED: Conditionally render a loading indicator or the button */}
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 10, marginBottom: 10 }} />
      ) : (
        <CustomButton title="Login" onPress={handleLogin} />
      )}
      
      <Link href="./forgot-password" style={styles.linkText} replace>
        Forgot Password?
      </Link>
    </View>
  );
}

// Styles remain the same
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
  },
});