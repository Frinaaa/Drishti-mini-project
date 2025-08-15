import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function PoliceLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      return Alert.alert('Demo', 'Please enter any ID and password to proceed.');
    }

    // --- CLIENT-SIDE VALIDATION START ---
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return Alert.alert('Invalid ID', 'Please enter a valid email address for the ID.');
    }

    if (password.length < 6) {
      return Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
    }
    // --- CLIENT-SIDE VALIDATION END ---

    console.log("Simulating successful police login...");
    router.replace({ pathname: '/(police)/police-dashboard', params: { officerName: 'Demo Officer' } });
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
      
      <CustomButton title="Login" onPress={handleLogin} />
      
      {/* The "Forgot Password" link is now at the bottom, like in the family login screen */}
      <Link href="./forgot-password" asChild replace>
        <Text style={styles.linkText}>Forgot Password?</Text>
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
  linkText: { // Renamed from loginLink but uses the same styling
    color: '#850a0a', 
    textAlign: 'center', 
    marginTop: 18, 
    fontSize: 14, 
    padding: 10 
  }
});