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
    }
  };

  const handleVerify = () => {
    // Add OTP verification logic here
    navigation.navigate('ResetPassword'); // <-- Change 'ResetPassword' to your actual next screen name
  };

  return (
    <View style={styles.container}>
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
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
