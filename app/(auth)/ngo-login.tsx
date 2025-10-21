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
    // Comprehensive email validation
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
    if (!validateEmail(email)) {
      return Alert.alert('Invalid Email', emailError);
    }

    if (!validatePassword(password)) {
      return Alert.alert('Invalid Password', passwordError);
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
       await AsyncStorage.setItem('userToken', responseData.token);

        // [+] ADD THIS LINE: Store the user's PIN code
        if (responseData.user.pinCode) {
             await AsyncStorage.setItem('userPinCode', responseData.user.pinCode.toString());
        }

        // Navigate to dashboard
        router.replace('/(ngo)/ngo-dashboard');
    } else {
        // Check if the error is about an unregistered email
        if (responseData.msg?.toLowerCase().includes('not registered') || responseData.msg?.toLowerCase().includes('not found')) {
          Alert.alert(
            'Unregistered NGO',
            'This email is not registered as an NGO volunteer. Please submit a request for registration first.',
            [
              { text: 'OK' },
              { 
                text: 'Submit Request', 
                onPress: () => router.push('./submit-request')
              }
            ]
          );
        } else {
          throw new Error(responseData.msg || 'Login failed');
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
      <Text style={styles.title}>NGO Volunteer Login</Text>
      
      <View>
        <TextInput 
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="Email Address"
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
      <TextInput 
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#b94e4e"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        textContentType="password"
      />
      
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
    input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 4 },
    inputError: { borderColor: '#FF0000' },
    errorText: { color: '#FF0000', fontSize: 12, marginBottom: 10, marginLeft: 4 },
    linkText: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14, padding: 10 }
});