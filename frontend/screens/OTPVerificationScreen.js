<<<<<<< HEAD
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function OtpVerificationScreen({ navigation, route }) {
  const { role, email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('http://localhost:5000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'OTP Verified');
        navigation.navigate('ResetPassword', { role, email });
      } else {
        Alert.alert('Error', data.message || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server.');
      console.error('OTP Verification Error:', error);
    } finally {
      setLoading(false);
=======
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function OTPVerificationScreen() {
  const navigation = useNavigation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

  const handleChange = (text, idx) => {
    const newOtp = [...otp];
    newOtp[idx] = text;
    setOtp(newOtp);
    if (text && idx < 5) {
      inputs.current[idx + 1].focus();
>>>>>>> parent of 75e7d00 (aa)
    }
  };

  const handleVerify = () => {
    // Add OTP verification logic here
    navigation.navigate('ResetPassword'); // <-- Change 'ResetPassword' to your actual next screen name
  };

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <Text style={styles.title}>{role} - OTP Verification</Text>
      <Text style={styles.subtitle}>OTP sent to {email}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ResetPasswordScreen')}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
=======
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#231815" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      {/* Content */}
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We have sent an OTP to your registered mobile number.
      </Text>
      <View style={styles.otpContainer}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={ref => inputs.current[idx] = ref}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={text => handleChange(text, idx)}
            autoFocus={idx === 0}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify OTP</Text>
>>>>>>> parent of 75e7d00 (aa)
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#880806' },
  subtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20, textAlign: 'center', fontSize: 18, letterSpacing: 4 },
  button: { backgroundColor: '#880806', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
=======
  container: {
    flex: 1,
    backgroundColor: '#FBF6F6',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#231815',
    marginRight: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#231815',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#231815',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#231815',
    borderRadius: 8,
    backgroundColor: '#FBF6F6',
    textAlign: 'center',
    fontSize: 24,
    color: '#231815',
  },
  button: {
    backgroundColor: '#820000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
>>>>>>> parent of 75e7d00 (aa)
});
