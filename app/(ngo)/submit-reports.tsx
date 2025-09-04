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

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions!');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
            console.log("[Frontend] Image picked, URI:", result.assets[0].uri); // Log the picked URI
        }
    };

    const handleSubmit = async () => {
        if (!personName || !age || !gender || !lastSeenLocation || !relation || !contactNumber || !photoUri) {
            return Alert.alert('Missing Information', 'Please fill out all fields and upload a photo.');
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

            // First, handle the photo - this should be first to ensure it's properly attached
            if (photoUri) {
                // Get the file extension
                const extension = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `photo_${Date.now()}.${extension}`;
                
                // Create the file object
                const photoFile = {
                    uri: Platform.OS === 'ios' ? photoUri.replace('file://', '') : photoUri,
                    type: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
                    name: fileName,
                };

                // Append the photo first
                formData.append('photo', photoFile);
                console.log("[Frontend] Photo being uploaded:", photoFile);
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
                headers: {
                    'Accept': 'application/json',
                    // Note: Don't set Content-Type header, it's automatically set by FormData
                },
                body: formData,
            });

            const data = await response.json();
            console.log("[Frontend] Response status:", response.status);
            console.log("[Frontend] Response data:", data);

            if (response.ok) {
                Alert.alert(
                    'Report Submitted',
                    data.msg || 'The missing person report has been successfully submitted.',
                    [{ text: 'OK', onPress: () => router.replace('/(ngo)/ngo-dashboard') }]
                );
            } else {
                throw new Error(data.msg || 'Failed to submit report');
            }
        } catch (error) {
            console.error('🔴 Frontend caught error during report submission:', error);
            Alert.alert('Submission Error', error.message || 'Could not submit the report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Report Missing Person', headerShown: true }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Full Name of Missing Person</Text>
                <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder="Enter full name" placeholderTextColor="#b94e4e" />

                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Enter age" keyboardType="number-pad" placeholderTextColor="#b94e4e" />

                <Text style={styles.label}>Gender</Text>
                <View>
                    <TouchableOpacity style={styles.input} onPress={() => { setGenderPickerVisible(!isGenderPickerVisible); setRelationPickerVisible(false); }}>
                        <View style={styles.dropdownHeader}><Text style={[styles.dropdownHeaderText, !gender && styles.placeholderText]}>{gender || 'Select gender'}</Text><Ionicons name={isGenderPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" /></View>
                    </TouchableOpacity>
                    {isGenderPickerVisible && ( <View style={styles.dropdown}>{genderOptions.map(option => ( <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setGender(option); setGenderPickerVisible(false); }}><Text style={styles.dropdownText}>{option}</Text></TouchableOpacity>))}</View> )}
                </View>
                
                <Text style={styles.label}>Last Seen Location</Text>
                <TextInput style={styles.input} value={lastSeenLocation} onChangeText={setLastSeenLocation} placeholder="Enter last seen location" placeholderTextColor="#b94e4e" />

                <Text style={styles.label}>Last Seen Date & Time</Text>
                <TextInput style={styles.input} value={lastSeenDateTime} onChangeText={setLastSeenDateTime} placeholder="e.g., Yesterday at 5 PM" placeholderTextColor="#b94e4e" />

                <Text style={styles.label}>Description / Clothing / Identifiable Marks</Text>
                <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Describe what the person was wearing" placeholderTextColor="#b94e4e" />
                
                <Text style={styles.label}>Relation to Missing Person</Text>
                <View>
                    <TouchableOpacity style={styles.input} onPress={() => { setRelationPickerVisible(!isRelationPickerVisible); setGenderPickerVisible(false); }}>
                        <View style={styles.dropdownHeader}><Text style={[styles.dropdownHeaderText, !relation && styles.placeholderText]}>{relation || 'Select relationship'}</Text><Ionicons name={isRelationPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" /></View>
                    </TouchableOpacity>
                    {isRelationPickerVisible && ( <View style={styles.dropdown}>{relationOptions.map(option => ( <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setRelation(option); setRelationPickerVisible(false); }}><Text style={styles.dropdownText}>{option}</Text></TouchableOpacity>))}</View> )}
                </View>

                <Text style={styles.label}>Reporter Contact Number (NGO/Family)</Text>
                <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} placeholder="Enter your contact number" keyboardType="phone-pad" placeholderTextColor="#b94e4e" />
                
                <Text style={styles.label}>Upload a Clear Photo of the Missing Person</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                    {photoUri ? ( <Image source={{ uri: photoUri }} style={styles.imagePreview} /> ) : ( <Text style={styles.imagePickerText}>Tap to upload photo</Text> )}
                </TouchableOpacity>
                <Text style={styles.subLabel}>Photo is essential for AI-powered face matching.</Text>

                <CustomButton 
                    title={loading ? 'Submitting...' : 'Submit Report'} 
                    onPress={handleSubmit} 
                    disabled={loading} 
                    style={{ marginTop: 20 }}
                />
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
    textArea: { height: 120, textAlignVertical: 'top' },
    imagePicker: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#E4C4C4', borderStyle: 'dashed', backgroundColor: 'rgba(245, 234, 234, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    imagePickerText: { fontSize: 16, color: '#5B4242', fontWeight: '500' },
    imagePreview: { width: '100%', height: '100%', borderRadius: 10 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownHeaderText: { fontSize: 16, color: '#3A0000' },
    placeholderText: { color: '#b94e4e' },
    dropdown: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E4C4C4', marginTop: -15, },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    dropdownText: { fontSize: 16 },
});