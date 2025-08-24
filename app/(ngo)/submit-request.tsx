import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

// UPDATED: Using the robust path alias for imports.
import CustomButton from '@/components/CustomButton';
import { BACKEND_API_URL } from '@/config/api';

// This helper function for web file reading is correct and remains unchanged.
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
    const [location, setLocation] = useState('');
    const [contact, setContact] = useState('');
    const [document, setDocument] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const pickDocument = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need permission to access your files.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // You can change this to .All if you need other file types
        });
        if (!result.canceled && result.assets) {
            setDocument(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!location || !contact) {
            Alert.alert('Error', 'Please fill out location and contact information.');
            return;
        }
        setIsSubmitting(true);

        try {
            let documentData = null;
            if (document) {
                let base64String = '';
                let fileName = document.fileName || document.uri.split('/').pop() || 'document.jpg';

                // This platform-specific logic is correct and remains unchanged.
                if (Platform.OS === 'web') {
                    const response = await fetch(document.uri);
                    const blob = await response.blob();
                    base64String = await getBase64ForWebApp(blob);
                } else {
                    base64String = await FileSystem.readAsStringAsync(document.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                }
                
                documentData = {
                    fileBase64: base64String,
                    fileName: fileName,
                };
            }

            const response = await fetch(`${BACKEND_API_URL}/api/requests/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location,
                    contact,
                    documentData,
                }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Your request has been submitted successfully.');
                router.back();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.msg || `Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Request submission failed:', error);
            Alert.alert('Error', error.message || 'Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // UPDATED: Added SafeAreaView and ScrollView for better layout
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.header}>Submit New Request</Text>
                <Text style={styles.subHeader}>Provide the details below to request assistance from the police.</Text>

                <TextInput 
                    style={styles.input} 
                    placeholder="Location (Address/Area)" 
                    placeholderTextColor="#b94e4e"
                    value={location} 
                    onChangeText={setLocation} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Your Contact Number" 
                    placeholderTextColor="#b94e4e"
                    value={contact} 
                    onChangeText={setContact} 
                    keyboardType="phone-pad" 
                />
                
                {/* UPDATED: Converted the custom button to a styled TouchableOpacity for consistency */}
                <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#850a0a" />
                    <Text style={styles.uploadButtonText}>
                        {document ? `Selected: ${document.fileName || 'document'}` : 'Select Supporting Document'}
                    </Text>
                </TouchableOpacity>

                <View style={{ marginTop: 20 }}>
                    <CustomButton 
                        title={isSubmitting ? "Submitting..." : "Submit Request"} 
                        onPress={handleSubmit} 
                        disabled={isSubmitting} 
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// UPDATED: Styles now match the rest of your application's theme.
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFBF8',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3A0000',
        marginBottom: 8,
    },
    subHeader: {
        fontSize: 16,
        color: '#5B4242',
        marginBottom: 25,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4C4C4',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 15,
        color: '#3A0000',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5EAEA',
        borderWidth: 1,
        borderColor: '#E4C4C4',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
    },
    uploadButtonText: {
        color: '#850a0a',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});