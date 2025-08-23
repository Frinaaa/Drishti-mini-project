import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import CustomButton from '../../components/CustomButton';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// Data for the dropdowns
const genderOptions = ['Male', 'Female', 'Other'];
const relationOptions = ['Parent', 'Sibling', 'Spouse', 'Child', 'Friend', 'Other Relative'];

export default function SubmitReportScreen() {
    const router = useRouter();
    
    // State for all form fields
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
    
    // State for dropdown visibility
    const [isGenderPickerVisible, setGenderPickerVisible] = useState(false);
    const [isRelationPickerVisible, setRelationPickerVisible] = useState(false);

    // --- ADDED: Function to clear all form fields after submission ---
    const resetForm = () => {
        setPersonName('');
        setAge('');
        setGender('');
        setLastSeenLocation('');
        setLastSeenDateTime('');
        setDescription('');
        setRelation('');
        setContactNumber('');
        setPhotoUri(null);
    };

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
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
        }
    };

    const handleSubmit = async () => {
        if (!personName || !age || !gender || !lastSeenLocation || !relation || !contactNumber || !photoUri) {
            return Alert.alert('Missing Information', 'Please fill out all fields and upload a photo.');
        }
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                setLoading(false);
                return Alert.alert('Error', 'You must be logged in to submit a report.');
            }
            const photo_url = 'https://example.com/path/to/uploaded/image.jpg';

            const reportData = {
                user: userId,
                person_name: personName,
                age: Number(age),
                gender: gender,
                last_seen: `${lastSeenLocation} at ${lastSeenDateTime}`,
                description: description,
                relationToReporter: relation,
                reporterContact: contactNumber,
                photo_url: photo_url,
            };

            const response = await fetch(`${BACKEND_API_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });

            if (response.ok) {
                // --- UPDATED: Alert now simply dismisses, then the form is reset ---
                Alert.alert(
                    'Report Submitted', 
                    'Your report has been received and will be reviewed by verified NGOs.',
                    [{ text: 'OK' }]
                );
                resetForm(); // This will clear the form for a new entry
            } else {
                const errorData = await response.json();
                Alert.alert('Submission Failed', errorData.msg || 'An error occurred.');
            }
        } catch (error) {
            console.error('Report submission error:', error);
            Alert.alert('Connection Error', 'Could not submit the report. Please check your network and try again.');
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
                        <View style={styles.dropdownHeader}>
                            <Text style={[styles.dropdownHeaderText, !gender && styles.placeholderText]}>
                                {gender || 'Select gender'}
                            </Text>
                            <Ionicons name={isGenderPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" />
                        </View>
                    </TouchableOpacity>
                    {isGenderPickerVisible && (
                        <View style={styles.dropdown}>
                            {genderOptions.map(option => (
                                <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setGender(option); setGenderPickerVisible(false); }}>
                                    <Text style={styles.dropdownText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
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
                        <View style={styles.dropdownHeader}>
                            <Text style={[styles.dropdownHeaderText, !relation && styles.placeholderText]}>
                                {relation || 'Select your relationship'}
                            </Text>
                            <Ionicons name={isRelationPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" />
                        </View>
                    </TouchableOpacity>
                    {isRelationPickerVisible && (
                        <View style={styles.dropdown}>
                            {relationOptions.map(option => (
                                <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setRelation(option); setRelationPickerVisible(false); }}>
                                    <Text style={styles.dropdownText}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <Text style={styles.label}>Your Contact Number</Text>
                <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} placeholder="Enter your contact number" keyboardType="phone-pad" placeholderTextColor="#b94e4e" />
                
                <Text style={styles.label}>Upload a Clear Photo of the Missing Person</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                    ) : (
                        <Text style={styles.imagePickerText}>Tap to upload photo</Text>
                    )}
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
    dropdownHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    dropdownHeaderText: { 
        fontSize: 16,
        color: '#3A0000'
    },
    placeholderText: {
        color: '#b94e4e'
    },
    dropdown: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#E4C4C4', 
        marginTop: -15,
    },
    dropdownItem: { 
        padding: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F0E0E0' 
    },
    dropdownText: { 
        fontSize: 16 
    },
});