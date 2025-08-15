import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
// CORRECTED IMPORT PATH:
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';

export default function FamilySignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Not used in backend yet, but keeping for UI
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      return Alert.alert('Error', 'Please fill name, email, and password.');
    }
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully! Please log in.');
        router.back(); // Go back to the login screen
      } else {
        // Handle errors like "User already exists"
        Alert.alert('Signup Failed', data.msg || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Sign Up</Text>
      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#b94e4e" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#b94e4e" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#b94e4e" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#b94e4e" value={password} onChangeText={setPassword} secureTextEntry />
      
      {loading ? (
        <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 10 }} />
      ) : (
        <CustomButton title="Sign Up" onPress={handleSignup} />
      )}
      
      {/* UPDATED: Added 'replace' to prevent a loop between login/signup */}
      <Link href="./family-login" asChild replace>
        <Text style={styles.loginLink}>Already have an account? Login</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20, justifyContent: 'center' },
  // The title style can be removed as the header handles it now.
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 100, // Matched large margin
    color: '#2B0000' 
  },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14 },
  loginLink: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14, padding: 10 }
});