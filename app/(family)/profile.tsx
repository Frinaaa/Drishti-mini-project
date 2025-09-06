import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// const languages = ['English', 'Spanish', 'Hindi', 'French']; // Removed as App Language is removed

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    // const [isLanguagePickerVisible, setLanguagePickerVisible] = useState(false); // Removed
    // const [selectedLanguage, setSelectedLanguage] = useState('English'); // Removed

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                setLoading(true);
                try {
                    const userId = await AsyncStorage.getItem('userId');

                    if (!userId) {
                        router.replace('/(auth)/family-login');
                        return;
                    }
                    const response = await fetch(`${BACKEND_API_URL}/api/users/${userId}`);
                    const data = await response.json();
                    if (response.ok) {
                        setUser(data.user);
                        // NEW: Set profile image from user data, construct full URL
                        if (data.user.profile_photo) {
                            setProfileImageUri(`${BACKEND_API_URL}${data.user.profile_photo}`);
                        } else {
                            setProfileImageUri(null); // No custom photo, use default
                        }
                    } else {
                        Alert.alert('Error', 'Could not fetch user data.');
                    }
                } catch (error) {
                    Alert.alert('Connection Error', 'Could not connect to the server.');
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }, [])
    );

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('profileImageUri'); // Still remove local URI if it exists
        router.replace('/');
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileHeader}>
                <Image
                    source={profileImageUri ? { uri: profileImageUri } : require('@/assets/images/frina.png')}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{user?.name || 'Family Member'}</Text>
                <Text style={styles.role}>Family Member</Text>
                <TouchableOpacity style={styles.editButton} onPress={() => user && router.push({ pathname: '/(family)/edit-profile', params: { ...user, profile_photo: user.profile_photo ? `${BACKEND_API_URL}${user.profile_photo}` : null } })}>
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.settingsContainer}>
                <Text style={styles.settingsTitle}>Settings</Text>

                <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(family)/notifications')}>
                    <View style={styles.settingIconContainer}><Ionicons name="notifications-outline" size={22} color="#3A0000" /></View>
                    <Text style={styles.settingLabel}>Notifications</Text>
                    <Ionicons name="chevron-forward-outline" size={20} color="#A47171" />
                </TouchableOpacity>

                {/* Privacy Settings Removed */}
                {/* App Language Removed */}

                <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(family)/aboutUs')}>
                    <View style={styles.settingIconContainer}><Ionicons name="information-circle-outline" size={22} color="#3A0000" /></View>
                    <Text style={styles.settingLabel}>About Drishti</Text>
                    <Ionicons name="chevron-forward-outline" size={20} color="#A47171" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8', },
    scrollContent: { padding: 20, paddingBottom: 80, },
    profileHeader: { alignItems: 'center', marginBottom: 30, },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#F5EAEA', },
    name: { fontSize: 24, fontWeight: 'bold', color: '#1E1E1E', },
    role: { fontSize: 16, color: '#850a0a', marginBottom: 20, },
    editButton: { backgroundColor: '#F5EAEA', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30, },
    editButtonText: { color: '#3A0000', fontSize: 16, fontWeight: '600', },
    settingsContainer: { marginBottom: 30, },
    settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 10, paddingHorizontal: 5, },
    settingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#F0E0E0', },
    settingIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5EAEA', justifyContent: 'center', alignItems: 'center', marginRight: 15, },
    settingLabel: { flex: 1, fontSize: 16, color: '#3A0000', },
    logoutButton: { backgroundColor: '#F5EAEA', paddingVertical: 16, borderRadius: 12, alignItems: 'center', },
    logoutButtonText: { color: '#870808', fontSize: 16, fontWeight: 'bold', },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF8', },
    // Removed selectedValue, dropdown, dropdownItem, dropdownText styles as they are no longer needed
});