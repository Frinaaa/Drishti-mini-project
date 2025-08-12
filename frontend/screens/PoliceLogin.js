import React, { useState } from 'react';
<<<<<<< HEAD
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
=======
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
>>>>>>> parent of ba6a5d1 (as)

export default function PoliceLoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
<<<<<<< HEAD
<<<<<<< HEAD
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
=======
    if (!email && !password) {
      Alert.alert('Error', 'Please enter your email/ID and password.');
    } else if (!email) {
      Alert.alert('Error', 'Please enter your email or Police ID.');
    } else if (!password) {
      Alert.alert('Error', 'Please enter your password.');
    } else {
      // Proceed with authentication
      Alert.alert('Success', 'Logged in successfully!');
>>>>>>> parent of 75e7d00 (aa)
    }
    // TODO: Add actual login API call
    Alert.alert('Success', 'Police Login Successful');
=======
    // You can later connect to API here
    console.log('Police Login:', username, password);
>>>>>>> parent of ba6a5d1 (as)
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
<<<<<<< HEAD
        placeholder="Enter Email"
=======
        placeholder="Enter  your email or ID"
        placeholderTextColor="#A47171"
>>>>>>> parent of 75e7d00 (aa)
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

<<<<<<< HEAD
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
=======
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
>>>>>>> parent of 75e7d00 (aa)

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

<<<<<<< HEAD
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
=======
      <TouchableOpacity>
        <Text style={styles.link}>Forgot Password?</Text>
>>>>>>> parent of 75e7d00 (aa)
=======
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
>>>>>>> parent of ba6a5d1 (as)
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
<<<<<<< HEAD
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#880806' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#880806', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  forgotText: { color: '#880806', textAlign: 'center', marginTop: 15 },
});
=======
  container: { flex: 1, backgroundColor: '#FFF8F8', padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  label: { fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  input: { backgroundColor: 'white', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: '#E4C4C4' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E4C4C4' },
  passwordInput: { flex: 1, paddingVertical: 12 },
  loginButton: { backgroundColor: '#7F0E0E', padding: 14, borderRadius: 6, marginTop: 20, alignItems: 'center' },
  loginText: { color: 'white', fontWeight: 'bold' },
  link: { color: '#A47171', textAlign: 'center', marginTop: 10 }
=======
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FCF7F7',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
    color: '#3A0000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#880806',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#880806',
    padding: 12,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
>>>>>>> parent of ba6a5d1 (as)
});
>>>>>>> parent of 75e7d00 (aa)
