// This file should be located at: app/(auth)/submit-request.tsx
// Or, for better clarity, you can rename it to: app/(auth)/request-account.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

// Using the recommended path alias for robust imports.
import CustomButton from '@/components/CustomButton';
import { BACKEND_API_URL } from '@/config/api';

// This helper function handles file-to-Base64 conversion for web browsers.
const getBase64ForWebApp = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};

export default function SubmitRequestScreen() {
    const router = useRouter();
    
    // State variables for all form fields
    const [ngoName, setNgoName] = useState('');
    const [registrationId, setRegistrationId] = useState('');
    const [description, setDescription] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState(''); // NEW: State for password
    const [document, setDocument] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This function handles the "Upload" button press.
    const pickDocument = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need access to your photo library to upload documents.');
                return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });
            if (!result.canceled && result.assets) {
                setDocument(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred while picking the document.');
        }
    };
    
    const resetForm = () => {
        setNgoName('');
        setRegistrationId('');
        setDescription('');
        setContactNumber('');
        setEmail('');
        setLocation('');
        setPassword('');
        setDocument(null);
    };

    // This function handles the final submission.
    const handleSubmit = async () => {
        // UPDATED: Added password to the validation check
        if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !document) {
            return Alert.alert('Missing Information', 'Please fill all fields, set a password, and upload the ID proof.');
        }
        
        setIsSubmitting(true);
        try {
            let documentData = null;
            if (document) {
                let base64String = '';
                if (Platform.OS === 'web') {
                    const response = await fetch(document.uri);
                    const blob = await response.blob();
                    base64String = await getBase64ForWebApp(blob);
                } else {
                    base64String = await FileSystem.readAsStringAsync(document.uri, { encoding: FileSystem.EncodingType.Base64 });
                }
                documentData = { fileBase64: base64String, fileName: document.fileName || 'document.jpg' };
            }

            const response = await fetch(`${BACKEND_API_URL}/api/requests/submit-for-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // UPDATED: Added password to the request body
                body: JSON.stringify({ ngoName, registrationId, description, contactNumber, email, location, password, documentData }),
            });

            const responseData = await response.json();
            if (response.ok) {
                Alert.alert(
                    'Success',
                    responseData.msg,
                    [{ text: 'OK', onPress: () => {
                        resetForm(); 
                        router.replace('/(auth)/ngo-login');
                    }}]
                );
            } else {
                throw new Error(responseData.msg || 'An unknown server error occurred.');
            }
        } catch (error) {
            let errorMessage = 'An unexpected error occurred.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            Alert.alert('Submission Failed', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.header}>Request NGO Account</Text>

                <TextInput style={styles.input} placeholder="NGO Name" placeholderTextColor="#b94e4e" value={ngoName} onChangeText={setNgoName} />
                <TextInput style={styles.input} placeholder="NGO ID/Registration Number" placeholderTextColor="#b94e4e" value={registrationId} onChangeText={setRegistrationId} />
                <TextInput style={[styles.input, styles.textArea]} placeholder="Brief Description of NGO's Work" placeholderTextColor="#b94e4e" multiline value={description} onChangeText={setDescription} />
                <TextInput style={styles.input} placeholder="Contact Number" placeholderTextColor="#b94e4e" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
                <TextInput style={styles.input} placeholder="Email Address for Login" placeholderTextColor="#b94e4e" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Location/Region of Operation" placeholderTextColor="#b94e4e" value={location} onChangeText={setLocation} />
                {/* NEW: Password input field */}
                <TextInput style={styles.input} placeholder="Set Account Password" placeholderTextColor="#b94e4e" value={password} onChangeText={setPassword} secureTextEntry={true} />

                <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>{document ? `Selected: ${document.fileName}` : 'Upload Registration Proof'}</Text>
                </TouchableOpacity>

                <CustomButton 
                    title={isSubmitting ? "Submitting..." : "Submit for Verification"} 
                    onPress={handleSubmit} 
                    disabled={isSubmitting} 
                    style={styles.submitButton}
                    textStyle={styles.submitButtonText}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFBF8' },
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', marginBottom: 30 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, color: '#3A0000' },
    textArea: { height: 120, textAlignVertical: 'top' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#850a0a', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
    uploadButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    submitButton: { backgroundColor: '#850a0a', paddingVertical: 18 },
    submitButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
});