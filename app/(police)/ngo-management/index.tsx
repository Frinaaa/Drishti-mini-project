import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../../../components/CustomButton';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_API_URL } from '../../../config/api';

export default function AddNgoScreen() {
    const [ngoName, setNgoName] = useState('');
    const [ngoId, setNgoId] = useState('');
    const [address, setAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [location, setLocation] = useState('');
    const [registrationProof, setRegistrationProof] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleUploadProof = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });
            
            if (!result.canceled) {
                setRegistrationProof(result.assets[0]);
                Alert.alert('File Selected', result.assets[0].name);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to pick a document.');
        }
    };

    const handleAddNgo = async () => {
        if (!ngoName || !ngoId || !contactNumber || !email || !location || !password || !registrationProof) {
            return Alert.alert('Missing Information', 'Please fill all fields, set a password, and upload proof.');
        }
        
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/ngo/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ngoName,
                    ngoId,
                    address,
                    contactNumber,
                    email,
                    location,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', data.msg || 'NGO has been added and can now log in.');
                setNgoName('');
                setNgoId('');
                setAddress('');
                setContactNumber('');
                setEmail('');
                setPassword('');
                setLocation('');
                setRegistrationProof(null);
            } else {
                Alert.alert('Registration Failed', data.msg || 'An error occurred.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Connection Error', 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Add New NGO</Text>

            <TextInput
                style={styles.input}
                placeholder="NGO Name"
                placeholderTextColor="#b94e4e" // APPLIED
                value={ngoName}
                onChangeText={setNgoName}
            />
            <TextInput
                style={styles.input}
                placeholder="NGO ID/Registration Number"
                placeholderTextColor="#b94e4e" // APPLIED
                value={ngoId}
                onChangeText={setNgoId}
            />
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Address"
                placeholderTextColor="#b94e4e" // APPLIED
                multiline
                numberOfLines={4}
                value={address}
                onChangeText={setAddress}
            />
            <TextInput
                style={styles.input}
                placeholder="Contact Number"
                placeholderTextColor="#b94e4e" // APPLIED
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={setContactNumber}
            />
            <TextInput
                style={styles.input}
                placeholder="Email Address (for login)"
                placeholderTextColor="#b94e4e" // APPLIED
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Set Temporary Password"
                placeholderTextColor="#b94e4e" // APPLIED
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="Location/Region"
                placeholderTextColor="#b94e4e" // APPLIED
                value={location}
                onChangeText={setLocation}
            />

            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadProof}>
                <Ionicons name="cloud-upload-outline" size={20} color="#850a0a" />
                <Text style={styles.uploadButtonText}>
                    {registrationProof ? `File: ${registrationProof.name}` : 'Upload Registration Proof'}
                </Text>
            </TouchableOpacity>

            <CustomButton
                title={loading ? 'Adding...' : 'Add NGO'}
                onPress={handleAddNgo}
                disabled={loading}
                style={{ marginTop: 10 }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8', paddingHorizontal: 20, paddingTop: 20 },
    heading: { fontSize: 22, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', marginBottom: 25 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 15, color: '#3A0000' },
    textArea: { height: 120, textAlignVertical: 'top' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EAEA', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 8, padding: 14, marginBottom: 10 },
    uploadButtonText: { color: '#850a0a', fontSize: 16, fontWeight: '600', marginLeft: 10 },
});