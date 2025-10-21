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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateInput = (input: string): { isEmail: boolean; isPoliceId: boolean; isValid: boolean } => {
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const isEmail = emailRegex.test(input);
    
    // Police ID validation (assuming format: P-XXXXX where X is a number)
    const policeIdRegex = /^P-\d{5}$/;
    const isPoliceId = policeIdRegex.test(input);

    return {
      isEmail,
      isPoliceId,
      isValid: isEmail || isPoliceId
    };
  };

  const validateEmail = (input: string): boolean => {
    if (!input) {
      setEmailError('Email or Police ID is required');
      return false;
    }

    const validation = validateInput(input);
    
    if (!validation.isValid) {
      if (input.startsWith('P-')) {
        setEmailError('Invalid Police ID format. Use P-XXXXX (e.g., P-12345)');
      } else {
        setEmailError('Please enter a valid email address or Police ID');
      }
      return false;
    }

    setEmailError('');
    return true;
  };

  const validatePassword = (pass: string): boolean => {
    if (!pass) {
      setPasswordError('Password is required');
      return false;
    }
    if (pass.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      return Alert.alert('Invalid Email/ID', emailError);
    }

    if (!validatePassword(password)) {
      return Alert.alert('Invalid Password', passwordError);
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
        // Check if the error is about an unregistered email
        if (data.msg?.toLowerCase().includes('not registered') || data.msg?.toLowerCase().includes('not found')) {
          Alert.alert(
            'Unregistered Account',
            'This email/Police ID is not registered in our system. Please contact your department administrator for registration.',
            [{ text: 'OK' }]
          );
        } else {
          // Handle other login errors
          Alert.alert('Login Failed', data.msg || 'Invalid credentials.');
        }
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
      
      <View>
        <TextInput 
          style={[styles.input, emailError ? styles.inputError : null]} 
          placeholder="Email or Police ID" 
          placeholderTextColor="#b94e4e" 
          value={email} 
          onChangeText={(text) => {
            setEmail(text);
            validateEmail(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>
      
      <View>
        <TextInput 
          style={[styles.input, passwordError ? styles.inputError : null]} 
          placeholder="Password" 
          placeholderTextColor="#b94e4e" 
          value={password} 
          onChangeText={(text) => {
            setPassword(text);
            validatePassword(text);
          }}
          secureTextEntry
          textContentType="password"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>
      
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
    marginBottom: 4 
  },
  inputError: {
    borderColor: '#FF0000'
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 4
  },
  linkText: {
    color: '#850a0a', 
    textAlign: 'center', 
    marginTop: 18, 
    fontSize: 14, 
    padding: 10 
  }
});