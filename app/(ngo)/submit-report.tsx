import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import CustomButton from '../../components/CustomButton';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../config/api';

const genderOptions = ['Male', 'Female', 'Other'];

export default function NgoSubmitReportScreen() {
    const router = useRouter();
    const [personName, setPersonName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [lastSeenLocation, setLastSeenLocation] = useState('');
    const [lastSeenDateTime, setLastSeenDateTime] = useState('');
    const [description, setDescription] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isGenderPickerVisible, setGenderPickerVisible] = useState(false);

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
        }
    };

    const handleSubmit = async () => {
        if (!personName || !age || !gender || !lastSeenLocation || !photoUri) {
            return Alert.alert('Missing Information', 'Please fill out all required fields and upload a photo.');
        }

        setLoading(true);

        const reportData = {
            person_name: personName,
            age: parseInt(age, 10),
            gender: gender,
            last_seen: `${lastSeenLocation} on ${lastSeenDateTime}`,
            photo_url: "https://example.com/path/to/uploaded/image.jpg", // Placeholder
            description: description,
        };

        try {
            // ===================================================================
            // !!! THIS IS THE FINAL AND MOST IMPORTANT STEP !!!
            // The token you were using is expired. You MUST replace the line below
            // with a fresh token you get from logging in your NGO user via Postman.
            // ===================================================================
            const DUMMY_NGO_TOKEN = "!!! PASTE YOUR NEW, VALID TOKEN HERE !!!";

            const response = await fetch(`${BACKEND_API_URL}/api/reports/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': DUMMY_NGO_TOKEN,
                },
                body: JSON.stringify(reportData),
            });

            const responseData = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Report Submitted',
                    'The missing person report has been successfully registered.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert(`Submission Failed (${response.status})`, responseData.msg || 'An unknown error occurred. Your token is likely invalid or expired.');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            Alert.alert('Network Error', 'Could not connect to the server. Is your IP address correct?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Register Missing Person', headerShown: true }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Full Name of Missing Person</Text>
                <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder="Enter full name" placeholderTextColor="#b94e4e" />
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Enter approximate age" keyboardType="number-pad" placeholderTextColor="#b94e4e" />
                <Text style={styles.label}>Gender</Text>
                <View>
                    <TouchableOpacity style={styles.input} onPress={() => setGenderPickerVisible(!isGenderPickerVisible)}>
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
                <TextInput style={styles.input} value={lastSeenLocation} onChangeText={setLastSeenLocation} placeholder="Enter last known location" placeholderTextColor="#b94e4e" />
                <Text style={styles.label}>Last Seen Date & Time (Optional)</Text>
                <TextInput style={styles.input} value={lastSeenDateTime} onChangeText={setLastSeenDateTime} placeholder="Approximate date and time" placeholderTextColor="#b94e4e" />
                <Text style={styles.label}>Description / Clothing / Identifiable Marks</Text>
                <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Enter any relevant details" placeholderTextColor="#b94e4e" />
                <Text style={styles.label}>Upload a Clear Photo of the Missing Person</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                    ) : (
                        <Text style={styles.imagePickerText}>Tap to upload photo</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.subLabel}>A clear photo is essential for face matching.</Text>
                <CustomButton 
                    title={loading ? 'Submitting...' : 'Register Report'} 
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