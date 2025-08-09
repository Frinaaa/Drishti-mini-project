import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OTPVerificationScreen({ navigation }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    // Auto-focus next field
    if (text && index < otp.length - 1) {
      const nextInput = `otp-${index + 1}`;
      this?.[nextInput]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Page Title */}
      <Text style={styles.pageTitle}>Enter OTP</Text>
      <Text style={styles.description}>
        We have sent an OTP to your registered mobile number.
      </Text>

      {/* OTP Boxes */}
      <View style={styles.otpContainer}>
        {otp.map((value, index) => (
          <TextInput
            key={index}
            ref={(ref) => (this[`otp-${index}`] = ref)}
            style={styles.otpInput}
            maxLength={1}
            keyboardType="numeric"
            value={value}
            onChangeText={(text) => handleChange(text, index)}
          />
        ))}
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ResetPassword')}
      >
        <Text style={styles.buttonText}>Verify OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf7f7',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fcf7f7',
    width: 50,
    height: 50,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 18,
    color: '#000',
  },
  button: {
    backgroundColor: '#850a0a',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
