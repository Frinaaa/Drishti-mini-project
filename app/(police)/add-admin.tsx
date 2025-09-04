// app/(police)/add-admin.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';

export default function AddAdminScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // This function clears all the input fields
    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
    };

    const handleCreateAdmin = async () => {
        // --- 1. Initial Validation ---
        if (!name || !email || !password) {
            return Alert.alert('Missing Fields', 'Please fill in all fields.');
        }

        // --- 2. Email Validation ---
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return Alert.alert('Invalid Email', 'Please enter a valid email address.');
        }

        // --- 3. Password Validation ---
        if (password.length < 6) {
            return Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
        }

        setLoading(true);
        try {
            // This endpoint needs to exist on your backend (we will create it next)
            const endpoint = `${BACKEND_API_URL}/api/users/add-admin`;
            const token = await AsyncStorage.getItem('authToken');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // This is a protected route, so we need to send the token
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', data.msg || 'Admin account created successfully!');
                resetForm(); // Clear the form after success
            } else {
                // Show specific error from the backend (e.g., "User already exists")
                throw new Error(data.msg || 'An unknown error occurred.');
            }
        } catch (error: any) {
            Alert.alert('Creation Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Add New Admin' }} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                
                <Text style={styles.label}>Admin Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter full name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />
                
                <Text style={styles.label}>Admin Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Set a password (min. 6 characters)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry // Hides the password input
                />
                
                {loading ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 20 }} />
                ) : (
                    <CustomButton title="Create Admin Account" onPress={handleCreateAdmin} />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF8',
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3A0000',
        textAlign: 'center',
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3A0000',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4C4C4',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
        color: '#3A0000',
    },
});