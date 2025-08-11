import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function PoliceLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    // TODO: Add actual login API call
    Alert.alert('Success', 'Police Login Successful');
  };

  const handleForgotPassword = () => {
  if (!email) {
    Alert.alert('Error', 'Please enter your registered email first');
    return;
  }
  navigation.navigate('ForgotPassword', { role: 'Police Officer', email });
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Police Login</Text>

      <TextInput
        style={styles.input}
<<<<<<< HEAD
        placeholder="Enter your email or ID"
        placeholderTextColor="#b94e4e"
=======
        placeholder="Enter Email"
>>>>>>> 5ad173e60f6c6b0a71c059c64caeba0b17c44c65
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

<<<<<<< HEAD
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
=======
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
>>>>>>> 5ad173e60f6c6b0a71c059c64caeba0b17c44c65

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#880806' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#880806', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  forgotText: { color: '#880806', textAlign: 'center', marginTop: 15 },
});
