import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomButton from '../../components/CustomButton';
import { BACKEND_API_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
    const router = useRouter();
    const user = useLocalSearchParams(); 
    
    const [name, setName] = useState(user.name ?? '');
    const [email, setEmail] = useState(user.email ?? '');
    const [profileImage, setProfileImage] = useState(null);
    const [gender, setGender] = useState(user.gender || 'Not specified');
    const [isGenderPickerVisible, setGenderPickerVisible] = useState(false);
    
    const [isPasswordSectionVisible, setPasswordSectionVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadImage = async () => {
            const savedImageUri = await AsyncStorage.getItem('profileImageUri');
            if (savedImageUri) {
                setProfileImage(savedImageUri);
            }
        };
        loadImage();
    }, []);

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 1,
        });
        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            setProfileImage(imageUri);
            await AsyncStorage.setItem('profileImageUri', imageUri);
        }
    };

    const handleSave = async () => {
        if (!name || !email) {
            return Alert.alert('Error', 'Name and email cannot be empty.');
        }
        if (newPassword || currentPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                return Alert.alert('Error', 'New passwords do not match.');
            }
            if (newPassword.length > 0 && newPassword.length < 6) {
                return Alert.alert('Error', 'New password must be at least 6 characters long.');
            }
            if (newPassword.length > 0 && !currentPassword) {
                return Alert.alert('Error', 'Please enter your current password to set a new one.');
            }
        }
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            const payload = { name, email, gender };
            if (newPassword && currentPassword) {
                payload.newPassword = newPassword;
                payload.currentPassword = currentPassword;
            }
            const response = await fetch(`${BACKEND_API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Success', 'Profile updated successfully!');
                router.back();
            } else {
                Alert.alert('Update Failed', data.msg || 'An error occurred.');
            }
        } catch (error) {
            Alert.alert('Connection Error', 'Could not save changes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.title}>Edit Profile</Text>

            <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={handleImagePick}>
                    <Image 
                        source={profileImage ? { uri: profileImage } : require('@/assets/images/frina.png')}
                        style={styles.avatar}
                    />
                    <View style={styles.editIcon}><Ionicons name="pencil" size={18} color="#FFF" /></View>
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor="#b94e4e"/>

            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#b94e4e"/>
            
            <Text style={styles.label}>Gender</Text>
            <View>
                <TouchableOpacity style={styles.input} onPress={() => setGenderPickerVisible(!isGenderPickerVisible)}>
                    <View style={styles.dropdownHeader}>
                       <Text style={styles.dropdownHeaderText}>{gender}</Text>
                       <Ionicons name={isGenderPickerVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color="#3A0000" />
                    </View>
                </TouchableOpacity>
                {isGenderPickerVisible && (
                    <View style={styles.dropdown}>
                        {['Male', 'Female', 'Other', 'Not specified'].map(g => (
                            <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => { setGender(g); setGenderPickerVisible(false); }}>
                                <Text style={styles.dropdownText}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* --- THIS IS THE CORRECTED STRUCTURE --- */}
            <View style={styles.collapsibleContainer}>
                <TouchableOpacity 
                    style={styles.collapsibleHeader}
                    onPress={() => setPasswordSectionVisible(!isPasswordSectionVisible)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="key-outline" size={22} color="#3A0000" />
                    <Text style={styles.collapsibleTitle}>Change Password</Text>
                    <Ionicons 
                      name={isPasswordSectionVisible ? 'chevron-up-outline' : 'chevron-down-outline'} 
                      size={22} 
                      color="#3A0000" 
                    />
                </TouchableOpacity>
                {isPasswordSectionVisible && (
                    <View style={styles.collapsibleContent}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput 
                            style={styles.input} 
                            secureTextEntry 
                            value={currentPassword} 
                            onChangeText={setCurrentPassword} 
                            placeholder="Enter current password"
                            placeholderTextColor="#b94e4e"
                        />
                        
                        <Text style={styles.label}>New Password</Text>
                        <TextInput 
                            style={styles.input} 
                            secureTextEntry 
                            value={newPassword} 
                            onChangeText={setNewPassword} 
                            placeholder="Enter new password"
                            placeholderTextColor="#b94e4e"
                        />

                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput 
                            style={styles.input} 
                            secureTextEntry 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                            placeholder="Confirm new password"
                            placeholderTextColor="#b94e4e"
                        />
                    </View>
                )}
            </View>
            
            <CustomButton title={loading ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={loading} style={{marginTop: 30}}/>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 16, color: '#3A0000', marginBottom: 8 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, justifyContent: 'center' },
    avatarContainer: { alignItems: 'center', marginBottom: 30 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#F5EAEA' },
    editIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#850a0a', padding: 8, borderRadius: 15 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownHeaderText: { fontSize: 16 },
    dropdown: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#F0E0E0', marginTop: -15, },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    dropdownText: { fontSize: 16 },
    // UPDATED: Styles are now split for the new structure
    collapsibleContainer: { 
        backgroundColor: '#F5EAEA', 
        borderRadius: 12, 
        marginTop: 10,
    },
    collapsibleHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: 16, // Padding is now on the header
    },
    collapsibleTitle: { 
        flex: 1, 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#3A0000', 
        marginLeft: 10 
    },
    collapsibleContent: { 
        // No top margin needed, padding handles spacing
        borderTopWidth: 1, 
        borderTopColor: '#E4C4C4', 
        paddingTop: 20,
        paddingHorizontal: 16, // Add horizontal padding
        paddingBottom: 0, // Content is at the bottom
    },
});