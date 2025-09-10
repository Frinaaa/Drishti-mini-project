// app/(auth)/submit-request.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

import CustomButton from '@/components/CustomButton';
import { BACKEND_API_URL } from '@/config/api';

// Helper function for web Base64 conversion
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
    
    // Unified state for form data
    const [formData, setFormData] = useState({
        ngoName: '',
        registrationId: '',
        description: '',
        contactNumber: '',
        email: '',
        location: '',
        password: '',
    });

    // State for validation errors and UI
    const [errors, setErrors] = useState<Partial<typeof formData> & { document?: string }>({});
    const [document, setDocument] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // General-purpose validation function
    const validateField = (name: keyof typeof formData, value: string) => {
        let error = '';
        switch (name) {
            case 'ngoName':
                if (!value) error = 'NGO Name is required.';
                break;
            case 'registrationId':
                if (!value) error = 'Registration ID is required.';
                break;
            case 'description':
                if (!value) error = 'A brief description is required.';
                break;
            case 'location':
                if (!value) error = 'Location is required.';
                break;
            case 'email':
                if (!value) {
                    error = 'Email address is required.';
                } else if (!/\S+@\S+\.\S+/.test(value)) {
                    error = 'Please enter a valid email address.';
                }
                break;
            case 'contactNumber':
                if (!value) {
                    error = 'Contact number is required.';
                } else if (!/^\d{10}$/.test(value)) {
                    error = 'Contact number must be 10 digits.';
                }
                break;
            case 'password':
                if (!value) {
                    error = 'Password is required.';
                } else if (value.length < 6) {
                    error = 'Password must be at least 6 characters long.';
                }
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return !error;
    };

    const handleChange = (name: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (name: keyof typeof formData) => {
        validateField(name, formData[name]);
    };

    const pickDocument = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photo library to upload documents.');
            return;
        }
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });
            if (!result.canceled && result.assets) {
                setDocument(result.assets[0]);
                setErrors(prev => ({ ...prev, document: '' }));
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while picking the document.');
        }
    };
    
    const resetForm = () => {
        setFormData({
            ngoName: '', registrationId: '', description: '',
            contactNumber: '', email: '', location: '', password: '',
        });
        setDocument(null);
        setErrors({});
    };

    const handleSubmit = async () => {
        // Run validation on all fields before submitting
        const isFormValid = Object.keys(formData).every(key => 
            validateField(key as keyof typeof formData, formData[key as keyof typeof formData])
        );

        const isDocValid = !!document;
        if (!isDocValid) {
            setErrors(prev => ({ ...prev, document: 'Registration proof document is required.' }));
        }

        if (!isFormValid || !isDocValid) {
            return Alert.alert('Invalid Information', 'Please correct the errors before submitting.');
        }
        
        setIsSubmitting(true);
        try {
            // Prepare document for upload
            let base64String = '';
            if (Platform.OS === 'web') {
                const response = await fetch(document!.uri);
                const blob = await response.blob();
                base64String = await getBase64ForWebApp(blob);
            } else {
                base64String = await FileSystem.readAsStringAsync(document!.uri, { encoding: FileSystem.EncodingType.Base64 });
            }
            const documentData = { fileBase64: base64String, fileName: document!.fileName || 'document.jpg' };

            // Send data to the backend
            const response = await fetch(`${BACKEND_API_URL}/api/requests/submit-for-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, documentData }),
            });

            // Always parse the JSON response to get success or error messages
            const responseData = await response.json();

            // --- GRACEFUL ERROR & SUCCESS HANDLING ---
            if (response.ok) {
                // On success, show an alert. When the user dismisses it, reset the form and navigate.
                Alert.alert(
                    'Success',
                    responseData.msg, // Display success message from backend
                    [{ text: 'OK', onPress: () => {
                        resetForm(); 
                        // Use router.replace to navigate to the login screen and clear the form from navigation history.
                        router.replace('/(auth)/ngo-login');
                    }}]
                );
            } else {
                // If the backend returns an error (like a duplicate email), throw an error with the specific message.
                throw new Error(responseData.msg || 'An unknown server error occurred.');
            }
        } catch (error) {
            // This 'catch' block handles both network errors and the specific errors thrown above.
            const errorMessage = (error instanceof Error) ? error.message : 'An unexpected error occurred.';
            Alert.alert('Submission Failed', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.header}>Request NGO Account</Text>

                <TextInput style={[styles.input, errors.ngoName && styles.inputError]} placeholder="NGO Name" placeholderTextColor="#b94e4e" value={formData.ngoName} onChangeText={(val) => handleChange('ngoName', val)} onBlur={() => handleBlur('ngoName')} />
                {errors.ngoName && <Text style={styles.errorText}>{errors.ngoName}</Text>}

                <TextInput style={[styles.input, errors.registrationId && styles.inputError]} placeholder="NGO ID/Registration Number" placeholderTextColor="#b94e4e" value={formData.registrationId} onChangeText={(val) => handleChange('registrationId', val)} onBlur={() => handleBlur('registrationId')} />
                {errors.registrationId && <Text style={styles.errorText}>{errors.registrationId}</Text>}

                <TextInput style={[styles.input, styles.textArea, errors.description && styles.inputError]} placeholder="Brief Description of NGO's Work" placeholderTextColor="#b94e4e" multiline value={formData.description} onChangeText={(val) => handleChange('description', val)} onBlur={() => handleBlur('description')} />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

                <TextInput style={[styles.input, errors.contactNumber && styles.inputError]} placeholder="Contact Number (10 digits)" placeholderTextColor="#b94e4e" value={formData.contactNumber} onChangeText={(val) => handleChange('contactNumber', val)} onBlur={() => handleBlur('contactNumber')} keyboardType="phone-pad" maxLength={10} />
                {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}

                <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Email Address for Login" placeholderTextColor="#b94e4e" value={formData.email} onChangeText={(val) => handleChange('email', val)} onBlur={() => handleBlur('email')} keyboardType="email-address" autoCapitalize="none" />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                <TextInput style={[styles.input, errors.location && styles.inputError]} placeholder="Location/Region of Operation" placeholderTextColor="#b94e4e" value={formData.location} onChangeText={(val) => handleChange('location', val)} onBlur={() => handleBlur('location')} />
                {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

                <View style={[styles.input, styles.passwordContainer, errors.password && styles.inputError]}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Set Account Password"
                        placeholderTextColor="#b94e4e"
                        value={formData.password}
                        onChangeText={(val) => handleChange('password', val)}
                        onBlur={() => handleBlur('password')}
                        secureTextEntry={!isPasswordVisible}
                    />
                    <TouchableOpacity onPress={() => setIsPasswordVisible(prev => !prev)}>
                        <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color="#850a0a" />
                    </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                {!document ? (
                    <TouchableOpacity style={[styles.uploadButton, errors.document && styles.inputError]} onPress={pickDocument}>
                        <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                        <Text style={styles.uploadButtonText}>Upload Registration Proof</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.fileDisplayContainer, errors.document && styles.inputError]}>
                        <Ionicons name="document-attach-outline" size={24} color="#3A0000" />
                        <Text style={styles.fileNameText} numberOfLines={1}>{document.fileName}</Text>
                        <TouchableOpacity onPress={() => setDocument(null)}>
                            <Ionicons name="close-circle" size={24} color="#850a0a" />
                        </TouchableOpacity>
                    </View>
                )}
                {errors.document && <Text style={styles.errorText}>{errors.document}</Text>}

                <CustomButton 
                    title={isSubmitting ? "Submitting..." : "Submit for Verification"} 
                    onPress={handleSubmit} 
                    disabled={isSubmitting} 
                    style={styles.submitButton}
                    textStyle={styles.submitButtonText}
                    showActivityIndicator={isSubmitting}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

// Styles remain unchanged
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFBF8' },
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', marginBottom: 30 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, marginBottom: 15, color: '#3A0000', height: 55, justifyContent: 'center' },
    textArea: { height: 120, textAlignVertical: 'top', paddingVertical: 15 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    passwordInput: { flex: 1, height: '100%', color: '#3A0000' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#850a0a', borderRadius: 10, padding: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, borderWidth: 1, borderColor: 'transparent', height: 55 },
    uploadButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    fileDisplayContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 10, paddingHorizontal: 15, height: 55, marginBottom: 15 },
    fileNameText: { flex: 1, marginLeft: 10, color: '#3A0000', fontSize: 16 },
    submitButton: { backgroundColor: '#850a0a', paddingVertical: 18, marginTop: 20 },
    submitButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
    inputError: {
        borderColor: '#D32F2F',
        borderWidth: 1.5,
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginBottom: 10,
        marginTop: -10,
        paddingLeft: 5,
    },
});