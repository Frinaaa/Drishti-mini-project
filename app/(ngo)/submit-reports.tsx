// app/(ngo)/submit-reports.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Image, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import CustomButton from '../../components/CustomButton';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';
import CustomAlert from '../../components/CustomAlert';

// --- Top-level definitions ---
const genderOptions = ['Male', 'Female', 'Other'];
const relationOptions = ['Parent', 'Sibling', 'Spouse', 'Child', 'Friend', 'Other Relative', 'None (NGO Report)'];

type FormDataState = {
    personName: string;
    age: string;
    gender: string;
    lastSeenLocation: string;
    lastSeenDateTime: string;
    description: string;
    relation: string;
    contactNumber: string;
    familyEmail: string;
    pinCode: string;
};

const initialFormData: FormDataState = {
    personName: '', age: '', gender: '', lastSeenLocation: '', lastSeenDateTime: '',
    description: '', relation: '', contactNumber: '', familyEmail: '', pinCode: ''
};

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
type AlertData = { title: string; message: string; type: 'success' | 'error' | 'info' };

// --- Helper Component for the Review Screen ---
const ReviewRow = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value || 'N/A'}</Text>
    </View>
);

export default function SubmitReportScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isReviewVisible, setReviewVisible] = useState(false); // State to control view
    const [isGenderPickerVisible, setGenderPickerVisible] = useState(false);
    const [isRelationPickerVisible, setRelationPickerVisible] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormDataState | 'photo', string>>>({});
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
    const [isAlertVisible, setAlertVisible] = useState(false);
    const [alertData, setAlertData] = useState<AlertData>({ title: '', message: '', type: 'info' });

    useEffect(() => {
        console.log("Submission status changed:", submissionStatus);
    }, [submissionStatus]);

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is needed to upload a photo.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5,
        });
        if (!result.canceled && result.assets) {
            setPhotoUri(result.assets[0].uri);
            if (errors.photo) setErrors(prev => ({ ...prev, photo: undefined }));
        }
    };

    const validateField = (name: keyof FormDataState, value: string) => {
        let error = '';
        switch (name) {
            case 'personName': if (!value || value.trim().length < 2) error = 'Please enter a valid full name.'; break;
            case 'age': if (!value || isNaN(Number(value)) || Number(value) < 1 || Number(value) > 120) error = 'Please enter a valid age.'; break;
            case 'gender': if (!value) error = 'Please select a gender.'; break;
            case 'lastSeenLocation': if (!value || value.trim().length < 3) error = 'Please enter a valid location.'; break;
            case 'lastSeenDateTime': if (!value || value.trim().length < 3) error = 'Please enter valid date/time info.'; break;
            case 'description': if (!value || value.trim().length < 10) error = 'Please provide a detailed description.'; break;
            case 'relation': if (!value) error = 'Please select your relationship.'; break;
            case 'contactNumber': if (!value) { error = 'Contact number is required.'; } else if (!/^\d{10}$/.test(value)) { error = 'Please enter a valid 10-digit phone number.'; } break;
            case 'familyEmail': if (!value) { error = 'Family email is required.'; } else if (!/\S+@\S+\.\S+/.test(value)) { error = 'Please enter a valid email address.'; } break;
            case 'pinCode': if (!value) { error = 'PIN Code is required.'; } else if (!/^\d{6}$/.test(value)) { error = 'PIN Code must be exactly 6 digits.'; } break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return !error;
    };

    const handleChange = (name: keyof FormDataState, value: string) => {
        if (name === 'age' || name === 'contactNumber' || name === 'pinCode') {
            value = value.replace(/[^0-9]/g, '');
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleBlur = (name: keyof FormDataState) => { validateField(name, formData[name]); };

    const handleAlertClose = () => {
        setAlertVisible(false);
        if (submissionStatus === 'success') {
            router.back();
        }
        setSubmissionStatus('idle');
    };

    const handleProceedToReview = () => {
        const isFormValid = (Object.keys(formData) as Array<keyof FormDataState>).every(key => validateField(key, formData[key]));
        const isPhotoValid = !!photoUri;
        if (!isPhotoValid) setErrors(prev => ({ ...prev, photo: 'A clear photo is required for submission.' }));
        
        if (!isFormValid || !isPhotoValid) {
            setAlertData({ title: 'Incomplete Form', message: 'Please correct the highlighted errors before proceeding.', type: 'error' });
            setAlertVisible(true);
            return;
        }
        
        setReviewVisible(true);
    };

    const handleConfirmAndSubmit = async () => {
        setSubmissionStatus('submitting');
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error('You must be logged in to submit a report.');

            const formPayload = new FormData();
            formPayload.append('user', userId);
            formPayload.append('person_name', formData.personName);
            formPayload.append('age', formData.age);
            formPayload.append('gender', formData.gender);
            formPayload.append('last_seen', `${formData.lastSeenLocation} at ${formData.lastSeenDateTime}`);
            formPayload.append('description', formData.description);
            formPayload.append('relationToReporter', formData.relation);
            formPayload.append('reporterContact', formData.contactNumber);
            formPayload.append('familyEmail', formData.familyEmail);
            formPayload.append('pinCode', formData.pinCode);

            if (photoUri) {
                const filename = photoUri.split('/').pop() || 'photo.jpg';
                const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                if (Platform.OS === 'web') {
                    const response = await fetch(photoUri);
                    const blob = await response.blob();
                    formPayload.append('photo', blob, filename);
                } else {
                    formPayload.append('photo', { uri: photoUri, name: filename, type: fileType } as any);
                }
            }

            const response = await fetch(`${BACKEND_API_URL}/api/reports`, { method: 'POST', body: formPayload });
            const responseData = await response.json();

            if (response.ok) {
                setSubmissionStatus('success');
                setAlertData({ title: 'Report Submitted', message: responseData.msg || 'The report has been received.', type: 'success' });
                setAlertVisible(true);
            } else {
                throw new Error(responseData.msg || `Request failed with status ${response.status}`);
            }
        } catch (error) {
            setSubmissionStatus('error');
            const errorMessage = (error instanceof Error) ? error.message : 'Could not connect to the server.';
            setAlertData({ title: 'Submission Failed', message: errorMessage, type: 'error' });
            setAlertVisible(true);
        } finally {
            if (submissionStatus === 'error') {
                setReviewVisible(false);
            }
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: isReviewVisible ? 'Confirm Your Report' : 'Report Missing Person' }} />
            
            {isReviewVisible ? (
                // --- REVIEW VIEW ---
                <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.reviewTitle}>Please review the details before submitting.</Text>
                    
                    {photoUri && (
                        <View style={styles.reviewImageContainer}>
                            <Image source={{ uri: photoUri }} style={styles.reviewImage} />
                        </View>
                    )}
                    
                    <ReviewRow label="Full Name" value={formData.personName} />
                    <ReviewRow label="Age" value={formData.age} />
                    <ReviewRow label="Gender" value={formData.gender} />
                    <ReviewRow label="Last Seen Location" value={formData.lastSeenLocation} />
                    <ReviewRow label="Last Seen Date/Time" value={formData.lastSeenDateTime} />
                    <ReviewRow label="Description" value={formData.description} />
                    <ReviewRow label="Relation to Person" value={formData.relation} />
                    <ReviewRow label="Reporter Contact" value={formData.contactNumber} />
                    <ReviewRow label="Family Email" value={formData.familyEmail} />
                    <ReviewRow label="Report PIN" value={"*".repeat(formData.pinCode.length)} />

                    <CustomButton
                        title={submissionStatus === 'submitting' ? 'Submitting...' : 'Confirm & Submit'}
                        onPress={handleConfirmAndSubmit}
                        disabled={submissionStatus === 'submitting'}
                        style={{ marginTop: 20 }}
                        showActivityIndicator={submissionStatus === 'submitting'}
                    />
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setReviewVisible(false)}
                        disabled={submissionStatus === 'submitting'}
                    >
                        <Text style={styles.editButtonText}>Edit Details</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                // --- FORM VIEW (Original ScrollView) ---
                <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Full Name of Missing Person</Text>
                    <TextInput style={[styles.input, errors.personName && styles.inputError]} value={formData.personName} onChangeText={(text) => handleChange('personName', text)} onBlur={() => handleBlur('personName')} placeholder="Enter full name" placeholderTextColor="#b94e4e" />
                    {errors.personName && <Text style={styles.errorText}>{errors.personName}</Text>}

                    <Text style={styles.label}>Age</Text>
                    <TextInput style={[styles.input, errors.age && styles.inputError]} value={formData.age} onChangeText={(text) => handleChange('age', text)} onBlur={() => handleBlur('age')} placeholder="Enter age" keyboardType="numeric" placeholderTextColor="#b94e4e" maxLength={3} />
                    {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

                    <Text style={styles.label}>Gender</Text>
                    <View>
                        <TouchableOpacity style={[styles.input, errors.gender && styles.inputError]} onPress={() => setGenderPickerVisible(!isGenderPickerVisible)}>
                            <View style={styles.dropdownHeader}><Text style={[styles.dropdownHeaderText, !formData.gender && styles.placeholderText]}>{formData.gender || 'Select gender'}</Text><Ionicons name={isGenderPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" /></View>
                        </TouchableOpacity>
                        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                        {isGenderPickerVisible && <View style={styles.dropdown}>{genderOptions.map(option => (<TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { handleChange('gender', option); setGenderPickerVisible(false); }}><Text style={styles.dropdownText}>{option}</Text></TouchableOpacity>))}</View>}
                    </View>

                    <Text style={styles.label}>Last Seen Location</Text>
                    <TextInput style={[styles.input, errors.lastSeenLocation && styles.inputError]} value={formData.lastSeenLocation} onChangeText={(text) => handleChange('lastSeenLocation', text)} onBlur={() => handleBlur('lastSeenLocation')} placeholder="Enter last seen location" placeholderTextColor="#b94e4e" />
                    {errors.lastSeenLocation && <Text style={styles.errorText}>{errors.lastSeenLocation}</Text>}

                    <Text style={styles.label}>Last Seen Date & Time</Text>
                    <TextInput style={[styles.input, errors.lastSeenDateTime && styles.inputError]} value={formData.lastSeenDateTime} onChangeText={(text) => handleChange('lastSeenDateTime', text)} onBlur={() => handleBlur('lastSeenDateTime')} placeholder="e.g., Yesterday at 5 PM" placeholderTextColor="#b94e4e" />
                    {errors.lastSeenDateTime && <Text style={styles.errorText}>{errors.lastSeenDateTime}</Text>}

                    <Text style={styles.label}>Description / Clothing / Identifiable Marks</Text>
                    <TextInput style={[styles.input, styles.textArea, errors.description && styles.inputError]} value={formData.description} onChangeText={(text) => handleChange('description', text)} onBlur={() => handleBlur('description')} multiline placeholder="Describe what the person was wearing" placeholderTextColor="#b94e4e" />
                    {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

                    <Text style={styles.label}>Relation to Missing Person</Text>
                    <View>
                        <TouchableOpacity style={[styles.input, errors.relation && styles.inputError]} onPress={() => setRelationPickerVisible(!isRelationPickerVisible)}>
                            <View style={styles.dropdownHeader}><Text style={[styles.dropdownHeaderText, !formData.relation && styles.placeholderText]}>{formData.relation || 'Select your relationship'}</Text><Ionicons name={isRelationPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" /></View>
                        </TouchableOpacity>
                        {errors.relation && <Text style={styles.errorText}>{errors.relation}</Text>}
                        {isRelationPickerVisible && <View style={styles.dropdown}>{relationOptions.map(option => (<TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { handleChange('relation', option); setRelationPickerVisible(false); }}><Text style={styles.dropdownText}>{option}</Text></TouchableOpacity>))}</View>}
                    </View>

                    <Text style={styles.label}>Reporter Contact Number (NGO/Family)</Text>
                    <TextInput style={[styles.input, errors.contactNumber && styles.inputError]} value={formData.contactNumber} onChangeText={(text) => handleChange('contactNumber', text)} onBlur={() => handleBlur('contactNumber')} placeholder="Enter your 10-digit contact number" keyboardType="phone-pad" placeholderTextColor="#b94e4e" maxLength={10}/>
                    {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}

                    <Text style={styles.label}>Family Email</Text>
                    <TextInput style={[styles.input, errors.familyEmail && styles.inputError]} value={formData.familyEmail} onChangeText={(text) => handleChange('familyEmail', text)} onBlur={() => handleBlur('familyEmail')} placeholder="Enter family email to notify them" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#b94e4e" />
                    {errors.familyEmail && <Text style={styles.errorText}>{errors.familyEmail}</Text>}

                    <Text style={styles.label}>Enter 6-Digit PIN Code for this Report</Text>
                    <TextInput style={[styles.input, errors.pinCode && styles.inputError]} value={formData.pinCode} onChangeText={(text) => handleChange('pinCode', text)} onBlur={() => handleBlur('pinCode')} placeholder="Enter 6-digit PIN" keyboardType="numeric" placeholderTextColor="#b94e4e" maxLength={6}  />
                    {errors.pinCode && <Text style={styles.errorText}>{errors.pinCode}</Text>}

                    <Text style={styles.label}>Upload a Clear Photo of the Missing Person</Text>
                    <TouchableOpacity style={[styles.imagePicker, errors.photo && styles.imagePickerError]} onPress={handleImagePick}>
                        {photoUri ? <Image source={{ uri: photoUri }} style={styles.imagePreview} /> : <Text style={styles.imagePickerText}>Tap to upload photo</Text>}
                    </TouchableOpacity>
                    {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}
                    <Text style={styles.subLabel}>Photo is essential for AI-powered face matching.</Text>

                    <CustomButton
                        title="Review Report"
                        onPress={handleProceedToReview}
                        disabled={submissionStatus === 'submitting'}
                        style={{ marginTop: 20 }}
                    />
                </ScrollView>
            )}

            <CustomAlert
                visible={isAlertVisible}
                title={alertData.title}
                message={alertData.message}
                type={alertData.type}
                onClose={handleAlertClose}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    scrollContent: { padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#3A0000', marginBottom: 8 },
    subLabel: { fontSize: 13, color: '#A47171', textAlign: 'center', marginTop: -10, marginBottom: 20 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4C4C4', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, color: '#3A0000', justifyContent: 'center', minHeight: 50 },
    inputError: { borderColor: '#D32F2F', borderWidth: 1.5 },
    errorText: { color: '#D32F2F', fontSize: 12, marginTop: -15, marginBottom: 10, marginLeft: 4 },
    textArea: { height: 120, textAlignVertical: 'top' },
    imagePicker: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#E4C4C4', borderStyle: 'dashed', backgroundColor: 'rgba(245, 234, 234, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    imagePickerError: { borderColor: '#D32F2F', borderWidth: 1.5 },
    imagePickerText: { fontSize: 16, color: '#5B4242', fontWeight: '500' },
    imagePreview: { width: '100%', height: '100%', borderRadius: 10 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownHeaderText: { fontSize: 16, color: '#3A0000' },
    placeholderText: { color: '#b94e4e' },
    dropdown: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E4C4C4', marginTop: -15, },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    dropdownText: { fontSize: 16 },
    // --- Styles for the Review Screen ---
    reviewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3A0000',
        textAlign: 'center',
        marginBottom: 20,
    },
    reviewImageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    reviewImage: {
        width: 150,
        height: 150,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E4C4C4',
    },
    reviewRow: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0E0E0',
    },
    reviewLabel: {
        fontSize: 14,
        color: '#A47171',
        fontWeight: '600',
        marginBottom: 4,
    },
    reviewValue: {
        fontSize: 16,
        color: '#3A0000',
    },
    editButton: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    editButtonText: {
        fontSize: 16,
        color: '#3A0000',
        fontWeight: 'bold',
    },
});