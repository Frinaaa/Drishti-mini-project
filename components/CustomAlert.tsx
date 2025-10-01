// components/CustomAlert.tsx

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, type, onClose }) => {
  // --- THEME ALIGNMENT: DARK RED ---
  // Both success and error will now use a consistent icon color from your theme.
  const iconName = type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline';
  
  // The icon color is now consistently a shade of dark red.
  // Success gets a slightly brighter, more positive feel, while error is the deep brand red.
  const iconColor = type === 'success' ? '#A13333' : '#8B0000'; 
  
  // The button color will always be your primary dark red.
  const buttonStyle = styles.themeButton;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertContainer}>
          <Ionicons name={iconName} size={60} color={iconColor} style={{ marginBottom: 10 }} />
          
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          
          <TouchableOpacity style={[styles.closeButton, buttonStyle]} onPress={onClose}>
            <Text style={styles.closeButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- UPDATED STYLESHEET FOR DARK RED THEME ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  alertContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFBF8', 
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4C4C4',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    // Changed: Use your theme's main title color
    color: '#3A0000',
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    // Changed: Use your theme's secondary text color
    color: '#5B4242',
    marginBottom: 30,
    lineHeight: 24,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  // NEW: A single theme button style
  themeButton: {
    backgroundColor: '#8B0000', // Your primary dark red
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlert;