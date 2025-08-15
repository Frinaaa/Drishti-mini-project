import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const CustomButton = ({ title, onPress, style, textStyle, disabled }: CustomButtonProps) => {
  return (
    <TouchableOpacity style={[styles.button, style, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#850a0a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabled: {
    backgroundColor: '#c4c4c4',
  }
});

export default CustomButton;