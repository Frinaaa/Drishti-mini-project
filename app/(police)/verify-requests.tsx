import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../../components/CustomButton';

// TypeScript interface for type safety
interface NgoRequest {
    _id: string;
    name: string;
    registration: string;
    contact: string;
    details: string;
    status: 'pending' | 'verified' | 'rejected';
}

export default function VerifyRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<NgoRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Function to fetch all pending requests
    const fetchRequests = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/police-login');
                return;
            }
            const response = await fetch(`${BACKEND_API_URL}/api/ngo/requests`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch requests.');
            const data: NgoRequest[] = await response.json();
            // We only display requests that are still pending
            setRequests(data.filter(req => req.status === 'pending'));
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    // useFocusEffect ensures the list is always up-to-date
    useFocusEffect(useCallback(() => { setLoading(true); fetchRequests(); }, [fetchRequests]));

    // Function to handle the Verify/Reject actions
    const handleUpdateStatus = async (id: string, status: 'verified' | 'rejected') => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(`${BACKEND_API_URL}/api/ngo/verify/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error(`Failed to ${status} request.`);
            Alert.alert('Success', `Request has been ${status}.`);
            // Refresh the list after an action is taken
            fetchRequests();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    // Show loading indicator on initial load
    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    return (
        <View style={styles.pageContainer}>
            <Stack.Screen options={{ title: 'Verify NGO Requests', headerShown: true }} />
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRequests} colors={["#850a0a"]} />}
            >
                {requests.length > 0 ? requests.map(req => (
                    <View key={req._id} style={styles.card}>
                        <Text style={styles.cardTitle}>{req.name}</Text>
                        <Text style={styles.detailText}><Text style={styles.bold}>Registration:</Text> {req.registration}</Text>
                        <Text style={styles.detailText}><Text style={styles.bold}>Contact:</Text> {req.contact}</Text>
                        <Text style={styles.detailText}><Text style={styles.bold}>Details:</Text> {req.details}</Text>
                        
                        {/* Action buttons */}
                        <View style={styles.buttonContainer}>
                            <CustomButton 
                                title="Reject" 
                                onPress={() => handleUpdateStatus(req._id, 'rejected')} 
                                style={styles.rejectButton} 
                                textStyle={styles.rejectButtonText} 
                            />
                            <CustomButton 
                                title="Verify" 
                                onPress={() => handleUpdateStatus(req._id, 'verified')} 
                                style={styles.verifyButton} 
                            />
                        </View>
                    </View>
                )) : (
                    // Handle empty state
                    <View style={styles.centered}>
                        <Ionicons name="shield-checkmark-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No pending requests to verify.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// Styles consistent with the app's theme
const styles = StyleSheet.create({
    pageContainer: { 
        flex: 1, 
        backgroundColor: '#FFFBF8' 
    },
    container: { 
        flex: 1, 
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingTop: '50%' 
    },
    emptyText: { 
        marginTop: 15, 
        fontSize: 16, 
        color: '#A47171' 
    },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 12, 
        padding: 15, 
        margin: 15,
        marginBottom: 0,
        borderWidth: 1, 
        borderColor: '#F0E0E0', 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2 
    },
    cardTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#3A0000', 
        marginBottom: 10 
    },
    detailText: { 
        fontSize: 14, 
        color: '#5B4242', 
        marginBottom: 5, 
        lineHeight: 20 
    },
    bold: { 
        fontWeight: '600' 
    },
    buttonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        marginTop: 15, 
        borderTopWidth: 1, 
        borderTopColor: '#F0E0E0', 
        paddingTop: 15 
    },
    verifyButton: { 
        flex: 1, 
        marginLeft: 5,
        marginTop: 0,
    },
    rejectButton: { 
        flex: 1, 
        marginRight: 5, 
        backgroundColor: '#F5EAEA',
        marginTop: 0,
    },
    rejectButtonText: { 
        color: '#850a0a' 
    },
});