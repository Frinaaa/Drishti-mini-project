import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

// REMOVED: The mock data array has been deleted.
/*
const notifications = [ ... ];
*/

export default function NotificationsScreen() {
    // ADDED: A new state variable to hold notifications. It starts as an empty array.
    // In a real application, you would use useEffect to fetch this data from a server.
    const [notifications, setNotifications] = React.useState([]);

    return (
        <>
            {/* This adds a proper header with a title to the screen */}
            <Stack.Screen options={{ title: 'Notifications', headerShown: true }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* The logic now checks the state variable. Since it's empty, it will show the placeholder. */}
                {notifications.length > 0 ? (
                    notifications.map(item => (
                        <View key={item.id} style={styles.notificationItem}>
                            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                                <Ionicons name={item.icon as any} size={24} color={item.color} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.message}>{item.message}</Text>
                                <Text style={styles.time}>{item.time}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>You have no new notifications.</Text>
                    </View>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF8',
    },
    // ADDED: Style to make the empty container fill the screen
    scrollContent: {
        flexGrow: 1,
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
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E1E1E',
    },
    message: {
        fontSize: 14,
        color: '#5B4242',
        marginTop: 2,
    },
    time: {
        fontSize: 12,
        color: '#A47171',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // REMOVED: paddingTop is no longer needed
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#A47171',
    },
});