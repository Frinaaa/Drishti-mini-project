// app/(family)/notifications.tsx

// --- CHANGE: Added hooks for state and effects, and components for loading/refreshing ---
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// --- CHANGE: useFocusEffect is needed to refresh data when the screen is viewed ---
import { Stack, useFocusEffect } from 'expo-router';
// --- CHANGE: AsyncStorage is needed to get the logged-in user's ID ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// --- CHANGE: Defined an interface for the notification data from the backend ---
interface Notification {
    _id: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export default function NotificationsScreen() {
    // --- CHANGE: Added new state variables for loading and pull-to-refresh ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- CHANGE: This new function fetches data from your backend ---
    const fetchNotifications = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error('User session not found.');
            
            const endpoint = `${BACKEND_API_URL}/api/notifications`;
            const response = await fetch(endpoint, {
                headers: { 'user-id': userId }, // Send user ID to the backend
            });

            const data = await response.json();
            if (response.ok) {
                setNotifications(data);
            } else {
                throw new Error(data.msg || 'Failed to fetch notifications.');
            }
        } catch (error: any) {
            console.error('Failed to fetch notifications:', error.message);
        } finally {
            if (!isRefreshing) setLoading(false);
            setRefreshing(false);
        }
    };

    // --- CHANGE: useFocusEffect re-fetches data every time the user visits this screen ---
    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    // --- CHANGE: This function handles the pull-to-refresh gesture ---
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications(true);
    }, []);

    // --- CHANGE: Added a loading indicator for better UX ---
    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: 'Notifications' }} />
                <ActivityIndicator size="large" color="#850a0a" />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Notifications', headerShown: true }} />
            {/* --- CHANGE: Added RefreshControl to the ScrollView --- */}
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }} // Ensures empty view is centered
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* --- CHANGE: Updated the logic to display real data or an empty message --- */}
                {notifications.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="notifications-off-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>You have no new notifications.</Text>
                    </View>
                ) : (
                    notifications.map(item => (
                        <View key={item._id} style={styles.notificationItem}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="information-circle-outline" size={24} color="#850a0a" />
                            </View>
                            <View style={styles.textContainer}>
                                {/* Display the message from the backend */}
                                <Text style={styles.message}>{item.message}</Text>
                                {/* Display the creation date from the backend, formatted nicely */}
                                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </>
    );
}

// --- CHANGE: Styles have been updated and cleaned up ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF8',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBF8', // Ensure background color for loading view
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#A47171',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0E0E0',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5EAEA',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: 15,
        color: '#3A0000',
        lineHeight: 22,
    },
    time: {
        fontSize: 12,
        color: '#A47171',
        marginTop: 5,
    },
});