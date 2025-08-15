import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function FamilyLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // No backend call, just validate that inputs are not empty for demo purposes.
    if (!email || !password) {
      return Alert.alert('Demo', 'Please enter any email and password to proceed.');
    }
    
    console.log("Simulating successful family login...");
    // Use replace to ensure the user can't navigate back to the auth flow.
    // Pass a hardcoded name for the demo.
    router.replace({
      pathname: '/(family)/family-dashboard',
      params: { familyName: 'Demo User' },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Family Login</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
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
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      <CustomButton title="Login" onPress={handleLogin} />
      
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
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14 },
  loginLink: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14, padding: 10 }
});