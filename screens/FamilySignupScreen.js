import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export default function FamilySignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill all fields.');
    } else {
      Alert.alert('Success', 'Account created!');
      navigation.navigate('FamilyLogin');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Member Signup</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#b94e4e"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#b94e4e"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#b94e4e"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#b94e4e"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        <Text style={styles.signupText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('FamilyLogin')}>
        <Text style={styles.loginLink}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#850a0a', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4', marginBottom: 14 },
  signupButton: { backgroundColor: '#850a0a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  signupText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loginLink: { color: '#850a0a', textAlign: 'center', marginTop: 18, fontSize: 14 }
});