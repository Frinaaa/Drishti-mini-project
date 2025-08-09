import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NGOLoginScreen({ navigation }) {
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
      <Text style={styles.title}>NGO Volunteer Login</Text>
      <Text style={styles.subtitle}>Secure access for verified NGOs</Text>

      {/* Email Input */}
      <Text style={styles.label}>Email ID or Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter  your email or phone"
        placeholderTextColor="#A47171"
        value={email}
        onChangeText={setEmail}
      />

      {/* Password Input */}
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter  your password"
          placeholderTextColor="#A47171"
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? 'eye-off' : 'eye'} size={22} color="#A47171" />
        </TouchableOpacity>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* Sign Up */}
      <TouchableOpacity>
        <Text style={styles.signupText}>New to Drishti? Sign up here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 20, color: '#2B0000' },
  subtitle: { textAlign: 'center', color: '#A47171', marginBottom: 25 },
  label: { fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#2B0000' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E4C4C4' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E4C4C4' },
  passwordInput: { flex: 1, paddingVertical: 12 },
  forgotText: { color: '#A47171', marginTop: 10 },
  loginButton: { backgroundColor: '#7F0E0E', padding: 14, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  loginText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  signupText: { color: '#A47171', textAlign: 'center', marginTop: 15 }
});
