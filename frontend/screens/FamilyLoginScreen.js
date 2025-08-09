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
          placeholder="Mobile Number or Email Address"
          placeholderTextColor="#a07878"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {/* Password Input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#a07878"
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? 'eye-off' : 'eye'} size={20} color="#a07878" />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* Forgot Password (Centered Below Login) */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPasswordFamily')}
        style={styles.forgotButton}
      >
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Sign Up */}
      <TouchableOpacity>
        <Text style={styles.signupText}>Don’t have an account? Create one</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 25, color: '#850a0a' },

  inputContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e4c4c4',
    borderRadius: 8,
    marginBottom: 15
  },
  input: { padding: 12, fontSize: 14, color: '#850a0a' },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e4c4c4',
    borderRadius: 8,
    paddingHorizontal: 10
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#850a0a' },

  loginButton: {
    backgroundColor: '#850a0a',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20
  },
  loginText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  forgotButton: { marginTop: 12, alignItems: 'center' },
  forgotText: { color: '#850a0a', fontSize: 14 },

  signupText: { color: '#850a0a', textAlign: 'center', marginTop: 20, fontSize: 14 }
});
