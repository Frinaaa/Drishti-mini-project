import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FamilyLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const validateEmail = (email: string): boolean => {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    if (email.length > 254) {
      setEmailError('Email is too long');
      return false;
    }
    
    const [localPart] = email.split('@');
    if (localPart.length > 64) {
      setEmailError('Email username is too long');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter both email and password.');
    }

    // Validate email
    if (!validateEmail(email)) {
      return Alert.alert('Invalid Email', emailError);
    }

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

    if (!validatePassword(password)) {
      return Alert.alert('Invalid Password', passwordError);
    }
    // --- CLIENT-SIDE VALIDATION END ---

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if the user has the 'Family' role
        if (data.user?.role?.role_name === 'Family') {
          console.log("Successful family login for:", data.user.name);
          await AsyncStorage.setItem('userId', data.user._id);
          // Use replace to ensure the user can't navigate back to the auth flow.
          router.replace({
            pathname: '/(family)/family-dashboard',
            params: { familyName: data.user.name },
          });
        } else {
          // If the user exists but is not a family member
          Alert.alert('Access Denied', 'This login is for family members only. Please use the correct login portal.');
        }
      } else {
        // Check if the error is about an unregistered email
        if (data.msg?.toLowerCase().includes('not registered') || data.msg?.toLowerCase().includes('not found')) {
          Alert.alert(
            'Unregistered Account',
            'This email is not registered. Would you like to create a new family account?',
            [
              { text: 'Cancel' },
              { 
                text: 'Sign Up', 
                onPress: () => router.push('./family-signup')
              }
            ]
          );
        } else {
          // Handle other login errors
          Alert.alert('Login Failed', data.msg || 'An unknown error occurred.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Family Login</Text>
      <View>
        <TextInput 
          style={[styles.input, emailError ? styles.inputError : null]} 
          placeholder="Email" 
          placeholderTextColor="#b94e4e" 
          value={email} 
          onChangeText={(text) => {
            setEmail(text);
            validateEmail(text);
          }}
          keyboardType="email-address" 
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
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
        <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 20 }} />
      ) : (
        <CustomButton title="Login" onPress={handleLogin} />
      )}
      
      <Link href="./family-signup" asChild replace>
        <Text style={styles.loginLink}>Don't have an account? Sign Up</Text>
      </Link>
      <Link href="./forgot-password" asChild replace>
        <Text style={styles.loginLink}>Forgot Password?</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 100, color: '#2B0000' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 4 },
  inputError: { borderColor: '#FF0000' },
  errorText: { color: '#FF0000', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  loginLink: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14, padding: 10 }
});