import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Image, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import CustomButton from '../../components/CustomButton';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// Data for the dropdowns (NGO version)
const genderOptions = ['Male', 'Female', 'Other'];
const relationOptions = ['Parent', 'Sibling', 'Spouse', 'Child', 'Friend', 'Other Relative', 'None (NGO Report)'];

export default function SubmitReportScreen() {
    const router = useRouter();
    
    const [personName, setPersonName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [lastSeenLocation, setLastSeenLocation] = useState('');
    const [lastSeenDateTime, setLastSeenDateTime] = useState('');
    const [description, setDescription] = useState('');
    const [relation, setRelation] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isGenderPickerVisible, setGenderPickerVisible] = useState(false);
    const [isRelationPickerVisible, setRelationPickerVisible] = useState(false);

    // Validation error states
    const [errors, setErrors] = useState<{[key: string]: string}>({});

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions!');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
            console.log("[Frontend] Image picked, URI:", result.assets[0].uri); // Log the picked URI
        }
    };

    const validateForm = () => {
        const newErrors: {[key: string]: string} = {};

        if (!personName || personName.trim().length < 2) {
            newErrors.personName = 'Please enter a valid full name (at least 2 characters).';
        }

        if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
            newErrors.age = 'Please enter a valid age between 1 and 120.';
        }

        if (!gender) {
            newErrors.gender = 'Please select a gender.';
        }

        if (!lastSeenLocation || lastSeenLocation.trim().length < 3) {
            newErrors.lastSeenLocation = 'Please enter a valid last seen location (at least 3 characters).';
        }

        if (!lastSeenDateTime || lastSeenDateTime.trim().length < 3) {
            newErrors.lastSeenDateTime = 'Please enter valid last seen date and time information.';
        }

        if (!description || description.trim().length < 10) {
            newErrors.description = 'Please provide a detailed description (at least 10 characters).';
        }

        if (!relation) {
            newErrors.relation = 'Please select your relationship to the missing person.';
        }

        // Simple phone number validation (just check if it's numeric)
        if (!contactNumber || !/^\d+$/.test(contactNumber.replace(/\s+/g, ''))) {
            newErrors.contactNumber = 'Please enter a valid phone number (numbers only).';
        }

        if (!photoUri) {
            newErrors.photo = 'Please upload a clear photo of the missing person.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        console.log("--- SUBMITTING REPORT (Frontend) ---");

        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                setLoading(false);
                return Alert.alert('Authentication Error', 'You must be logged in to submit a report.');
            }

            // Create the form data
            const formData = new FormData();

            // Handle the photo for FormData
            let filename = 'photo.jpg'; // Default fallback
            if (photoUri) {
                const uriParts = photoUri.split('/');
                const lastPart = uriParts[uriParts.length - 1];
                if (lastPart && lastPart.includes('.')) {
                    // Clean the filename and ensure it has proper extension
                    filename = lastPart.split('?')[0].replace(/[^a-zA-Z0-9.-]/g, '_');
                }
            }
            const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            console.log('Photo upload debug:', { photoUri, filename, fileType, platform: Platform.OS });

            if (Platform.OS === 'web') {
                // On web, handle different types of URIs
                try {
                    console.log('Processing image for web upload...');
                    if (!photoUri) throw new Error('No photo URI available');
                    const response = await fetch(photoUri);
                    const blob = await response.blob();
                    console.log('Blob created:', { size: blob.size, type: blob.type });

                    // Create a File object for better compatibility with multer
                    const file = new File([blob], filename, { type: fileType });
                    formData.append('photo', file);
                    console.log('Photo appended to FormData as File object');
                } catch (error) {
                    console.error('Error processing image for web:', error);
                    throw new Error('Failed to process image for upload');
                }
            } else {
                // For native platforms, use the standard approach
                console.log('Using native platform approach');
                formData.append('photo', {
                    uri: photoUri,
                    name: filename,
                    type: fileType,
                } as any);
            }

            // Append other form fields
            formData.append('user', userId);
            formData.append('person_name', personName);
            formData.append('age', age);
            formData.append('gender', gender);
            formData.append('last_seen', `${lastSeenLocation} at ${lastSeenDateTime}`);
            formData.append('description', description);
            formData.append('relationToReporter', relation);
            formData.append('reporterContact', contactNumber);

            console.log("[Frontend] Sending request to:", `${BACKEND_API_URL}/api/reports`);

            const response = await fetch(`${BACKEND_API_URL}/api/reports`, {
                method: 'POST',
                // Don't set any headers - let FormData set Content-Type automatically
                body: formData,
            });

            const data = await response.json();
            console.log("[Frontend] Response status:", response.status);
            console.log("[Frontend] Response data:", data);

            if (response.ok) {
                // Clear form data on success
                setPersonName('');
                setAge('');
                setGender('');
                setLastSeenLocation('');
                setLastSeenDateTime('');
                setDescription('');
                setRelation('');
                setContactNumber('');
                setPhotoUri(null);
                setGenderPickerVisible(false);
                setRelationPickerVisible(false);

                Alert.alert(
                    'Report Submitted',
                    data.msg || 'The missing person report has been successfully submitted.',
                    [{
                        text: 'OK',
                        onPress: () => {
                            setLoading(true); // Keep loading state during navigation
                            try {
                                router.replace('/(ngo)/ngo-dashboard');
                            } catch (navError) {
                                console.error('Navigation error:', navError);
                                // Fallback navigation
                                router.push('/(ngo)/ngo-dashboard');
                            }
                        }
                    }]
                );
            } else {
                throw new Error(data.msg || 'Failed to submit report');
            }
        } catch (error) {
            console.error('🔴 Frontend caught error during report submission:', error);
            const errorMessage = error instanceof Error ? error.message : 'Could not submit the report. Please try again.';
            Alert.alert('Submission Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Report Missing Person', headerShown: true }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View>
                    <Text style={styles.label}>Full Name of Missing Person</Text>
                <TextInput
                    style={[styles.input, errors.personName && styles.inputError]}
                    value={personName}
                    onChangeText={(text) => {
                        setPersonName(text);
                        if (errors.personName) setErrors({...errors, personName: ''});
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor="#b94e4e"
                />
                {errors.personName && <Text style={styles.errorText}>{errors.personName}</Text>}
                <Text style={styles.label}>Age</Text>
                <TextInput
                    style={[styles.input, errors.age && styles.inputError]}
                    value={age}
                    onChangeText={(text) => {
                        // Only allow numbers
                        const numericText = text.replace(/[^0-9]/g, '');
                        setAge(numericText);
                        if (errors.age) setErrors({...errors, age: ''});
                    }}
                    placeholder="Enter age"
                    keyboardType="numeric"
                    placeholderTextColor="#b94e4e"
                    maxLength={3}
                />
                {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                <Text style={styles.label}>Gender</Text>
                <View>
                    <TouchableOpacity
                        style={[styles.input, errors.gender && styles.inputError]}
                        onPress={() => { setGenderPickerVisible(!isGenderPickerVisible); setRelationPickerVisible(false); }}
                    >
                        <View style={styles.dropdownHeader}>
                            <Text style={[styles.dropdownHeaderText, !gender && styles.placeholderText]}>
                                {gender || 'Select gender'}
                            </Text>
                            <Ionicons
                                name={isGenderPickerVisible ? "chevron-up-outline" : "chevron-down-outline"}
                                size={20}
                                color="#3A0000"
                            />
                        </View>
                    </TouchableOpacity>
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                    {isGenderPickerVisible && (
                        <View style={styles.dropdown}>
                            {genderOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={styles.dropdownItem}
                                    onPress={() => { setGender(option); setGenderPickerVisible(false); }}
                                >
                                    <Text style={styles.dropdownText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
                <Text style={styles.label}>Last Seen Location</Text>
                <TextInput
                    style={[styles.input, errors.lastSeenLocation && styles.inputError]}
                    value={lastSeenLocation}
                    onChangeText={(text) => {
                        setLastSeenLocation(text);
                        if (errors.lastSeenLocation) setErrors({...errors, lastSeenLocation: ''});
                    }}
                    placeholder="Enter last seen location"
                    placeholderTextColor="#b94e4e"
                />
                {errors.lastSeenLocation && <Text style={styles.errorText}>{errors.lastSeenLocation}</Text>}
                <Text style={styles.label}>Last Seen Date & Time</Text>
                <TextInput
                    style={[styles.input, errors.lastSeenDateTime && styles.inputError]}
                    value={lastSeenDateTime}
                    onChangeText={(text) => {
                        setLastSeenDateTime(text);
                        if (errors.lastSeenDateTime) setErrors({...errors, lastSeenDateTime: ''});
                    }}
                    placeholder="e.g., Yesterday at 5 PM"
                    placeholderTextColor="#b94e4e"
                />
                {errors.lastSeenDateTime && <Text style={styles.errorText}>{errors.lastSeenDateTime}</Text>}
                <Text style={styles.label}>Description / Clothing / Identifiable Marks</Text>
                <TextInput
                    style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                    value={description}
                    onChangeText={(text) => {
                        setDescription(text);
                        if (errors.description) setErrors({...errors, description: ''});
                    }}
                    multiline
                    placeholder="Describe what the person was wearing"
                    placeholderTextColor="#b94e4e"
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                <Text style={styles.label}>Relation to Missing Person</Text>
                <View>
                    <TouchableOpacity
                        style={[styles.input, errors.relation && styles.inputError]}
                        onPress={() => { setRelationPickerVisible(!isRelationPickerVisible); setGenderPickerVisible(false); }}
                    >
                        <View style={styles.dropdownHeader}>
                            <Text style={[styles.dropdownHeaderText, !relation && styles.placeholderText]}>
                                {relation || 'Select relationship'}
                            </Text>
                            <Ionicons
                                name={isRelationPickerVisible ? "chevron-up-outline" : "chevron-down-outline"}
                                size={20}
                                color="#3A0000"
                            />
                        </View>
                    </TouchableOpacity>
                    {errors.relation && <Text style={styles.errorText}>{errors.relation}</Text>}
                    {isRelationPickerVisible && (
                        <View style={styles.dropdown}>
                            {relationOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={styles.dropdownItem}
                                    onPress={() => { setRelation(option); setRelationPickerVisible(false); }}
                                >
                                    <Text style={styles.dropdownText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
                <Text style={styles.label}>Reporter Contact Number (NGO/Family)</Text>
                <TextInput
                    style={[styles.input, errors.contactNumber && styles.inputError]}
                    value={contactNumber}
                    onChangeText={(text) => {
                        // Only allow numbers
                        const numericText = text.replace(/[^0-9]/g, '');
                        setContactNumber(numericText);
                        if (errors.contactNumber) setErrors({...errors, contactNumber: ''});
                    }}
                    placeholder="Enter your contact number"
                    keyboardType="phone-pad"
                    placeholderTextColor="#b94e4e"
                    maxLength={15}
                />
                {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
                <Text style={styles.label}>Upload a Clear Photo of the Missing Person</Text>
                <TouchableOpacity style={[styles.imagePicker, errors.photo && styles.imagePickerError]} onPress={handleImagePick}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                    ) : (
                        <Text style={styles.imagePickerText}>Tap to upload photo</Text>
                    )}
                </TouchableOpacity>
                {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}
                <Text style={styles.subLabel}>Photo is essential for AI-powered face matching.</Text>
                <CustomButton
                    title={loading ? 'Submitting...' : 'Submit Report'}
                    onPress={handleSubmit}
                    disabled={loading}
                    style={{ marginTop: 20 }}
                />
            </View>
        </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    scrollContent: { padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#3A0000', marginBottom: 8 },
    subLabel: { fontSize: 13, color: '#A47171', textAlign: 'center', marginTop: -10, marginBottom: 20 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, color: '#3A0000', justifyContent: 'center', minHeight: 50 },
    inputError: { borderColor: '#ff4444' },
    errorText: { color: '#ff4444', fontSize: 12, marginTop: -15, marginBottom: 10, marginLeft: 4 },
    textArea: { height: 120, textAlignVertical: 'top' },
    imagePicker: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#E4C4C4', borderStyle: 'dashed', backgroundColor: 'rgba(245, 234, 234, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    imagePickerError: { borderColor: '#ff4444' },
    imagePickerText: { fontSize: 16, color: '#5B4242', fontWeight: '500' },
    imagePreview: { width: '100%', height: '100%', borderRadius: 10 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownHeaderText: { fontSize: 16, color: '#3A0000' },
    placeholderText: { color: '#b94e4e' },
    dropdown: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E4C4C4', marginTop: -15, },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    dropdownText: { fontSize: 16 },
});