import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleNext = () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email.');
    } else {
      // Logic to send reset email/link would go here
      Alert.alert('Password Reset', `If an account exists for ${email}, a reset link has been sent.`);
      router.back(); // Go back to previous screen
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      
      {/* The separate label has been removed. The placeholder now serves that purpose. */}
      <TextInput 
        style={styles.input} 
        placeholder="Enter your registered Email" 
        placeholderTextColor="#b94e4e" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none" 
        keyboardType="email-address" 
      />
      
      <CustomButton title="Send Reset Link" onPress={handleNext} />
    </View>
  );
}

// These styles are now based on the other login screens for consistency.
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
  // The 'label' style is no longer needed.
  input: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#E4C4C4', 
    marginBottom: 14 // Added margin for consistency
  },
});