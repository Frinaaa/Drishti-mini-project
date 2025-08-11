import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PoliceLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = () => {
    if (!email && !password) {
      Alert.alert('Error', 'Please enter your email/ID and password.');
    } else if (!email) {
      Alert.alert('Error', 'Please enter your email or Police ID.');
    } else if (!password) {
      Alert.alert('Error', 'Please enter your password.');
    } else {
      Alert.alert('Success', 'Logged in successfully!');
      navigation.navigate('PoliceDashboard', { officerName: email });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Police Officer Login</Text>

      <Text style={styles.label}>Email / Police ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email or ID"
        placeholderTextColor="#b94e4e"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
          placeholderTextColor="#b94e4e"
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? 'eye-off' : 'eye'} size={22} color="#A47171" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* Forgot Password Button centered below Login */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPasswordPolice')}
        style={styles.forgotButton}
      >
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.link}>New officer? Contact admin</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#850a0a'
  },
  label: { fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#850a0a' },
  input: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4C4C4'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E4C4C4'
  },
  passwordInput: { flex: 1, paddingVertical: 12 },
  loginButton: {
    backgroundColor: '#850a0a',
    padding: 14,
    borderRadius: 6,
    marginTop: 20,
    alignItems: 'center'
  },
  loginText: { color: '#fcf7f7', fontWeight: 'bold' },
  forgotButton: {
    marginTop: 10,
    alignItems: 'center'
  },
  forgotText: { color: '#850a0a', fontSize: 14 },
  link: { color: '#850a0a', textAlign: 'center', marginTop: 20, fontSize: 14 }
});
