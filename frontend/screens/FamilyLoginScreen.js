<<<<<<< HEAD
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FamilyMemberLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = () => {
    if (!email && !password) {
      Alert.alert('Error', 'Please enter your email/phone and password.');
    } else if (!email) {
      Alert.alert('Error', 'Please enter your email or phone.');
    } else if (!password) {
      Alert.alert('Error', 'Please enter your password.');
    } else {
      Alert.alert('Success', 'Logged in successfully!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Family Member Login</Text>

      {/* Mobile/Email Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
<<<<<<< HEAD
          placeholder="Mobile Number or Email Address"
          placeholderTextColor="#b94e4e"
=======
          placeholder="Mobile  Number or Email Address"
          placeholderTextColor="#8B5E5E"
>>>>>>> parent of 75e7d00 (aa)
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {/* Password Input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
<<<<<<< HEAD
          placeholderTextColor="#b94e4e"
=======
          placeholderTextColor="#8B5E5E"
>>>>>>> parent of 75e7d00 (aa)
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? 'eye-off' : 'eye'} size={20} color="#8B5E5E" />
        </TouchableOpacity>
      </View>

      {/* Forgot Password (Left aligned) */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* Sign Up */}
      <TouchableOpacity onPress={() => navigation.navigate('FamilySignup')}>
      <Text style={styles.signupText}>Don’t have an account? Create one</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 25, color: '#2B0000' },
  inputContainer: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 8, marginBottom: 15 },
  input: { padding: 12, fontSize: 14, color: '#2B0000' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 8, paddingHorizontal: 10 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#2B0000' },
  forgotPassword: { color: '#7F0E0E', textAlign: 'left', marginTop: 5, marginBottom: 20, fontSize: 14 },
  loginButton: { backgroundColor: '#7F0E0E', padding: 14, borderRadius: 6, alignItems: 'center' },
  loginText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  signupText: { color: '#7F0E0E', textAlign: 'center', marginTop: 15, fontSize: 14 }
});
=======
>>>>>>> parent of ba6a5d1 (as)
