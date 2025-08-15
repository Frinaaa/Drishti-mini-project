import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function NgoLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      return Alert.alert('Demo', 'Please enter any email and password to proceed.');
    }

    // --- CLIENT-SIDE VALIDATION START ---
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }

    if (password.length < 6) {
      return Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
    }
    // --- CLIENT-SIDE VALIDATION END ---

    console.log("Simulating successful NGO login...");
    router.replace({ pathname: '/(ngo)/ngo-dashboard', params: { ngoName: 'Demo Volunteer' } });
  };

  return (
    <View style={styles.container}>
      {/* Title is updated to match the other screens */}
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
      
      <CustomButton title="Login" onPress={handleLogin} />
      
      {/* The "Forgot Password" link is now at the bottom, matching the other login screens */}
      <Link href="./forgot-password" style={styles.linkText} replace>
        Forgot Password?
      </Link>
    </View>
  );
}

// These styles are now based on the FamilyLoginScreen for consistency
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fcf7f7', // Matched background color
    padding: 20, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 100, // Matched large margin
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