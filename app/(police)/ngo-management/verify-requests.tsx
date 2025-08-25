import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Linking, SafeAreaView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../../config/api'; // Corrected path for config
import AsyncStorage from '@react-native-async-storage/async-storage';

// REMOVED: This line caused the error because you cannot import backend files into the frontend.
// import { Request, User, Role } from '../models';

// This interface is the correct way to define the shape of the data for the frontend.
interface RegistrationRequest {
    _id: string;
    requestId: string;
    ngoName: string;
    registrationId: string;
    description: string;
    contactNumber: string;
    email: string;
    location: string;
    documentPath?: string;
    dateOfRequest: string;
}

export default function VerifyNgoScreen() {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            // Note: In a real app, police would have their own login and token.
            // This setup works for your current project structure.
            const response = await fetch(`${BACKEND_API_URL}/api/requests/pending-registrations`);
            if (!response.ok) throw new Error('Failed to fetch registration requests.');
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            Alert.alert('Error', 'Could not load pending registration requests.');
        } finally {
            if (!isRefreshing) setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
    
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

    const handleUpdateRequest = (request: RegistrationRequest, action: 'approve' | 'reject') => {
        const isApproving = action === 'approve';
        const title = isApproving ? 'Approve Registration' : 'Reject Registration';
        const message = `Are you sure you want to ${action} this request for '${request.ngoName}'?`;
        const buttonText = isApproving ? 'Approve' : 'Reject';

        Alert.alert(title, message, [
            { text: "Cancel", style: "cancel" },
            {
                text: buttonText,
                style: isApproving ? "default" : "destructive",
                onPress: async () => {
                    try {
                        const endpoint = isApproving 
                            ? `/api/requests/approve-registration/${request._id}` 
                            : `/api/requests/reject-registration/${request._id}`;
                        
                        const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
                            method: 'PUT',
                        });

                        const responseData = await response.json();
                        if (response.ok) {
                            Alert.alert("Success", responseData.msg);
                            onRefresh();
                        } else { 
                            throw new Error(responseData.msg || "Update failed"); 
                        }
                    } catch (error) { 
                        const errorMessage = error instanceof Error ? error.message : "Could not update the request.";
                        Alert.alert("Error", errorMessage);
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.pageContainer}>
            <Text style={styles.headerTitle}>Verify NGO Registrations</Text>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#850a0a"]} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
                ) : requests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-checkmark-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No pending registrations to verify.</Text>
                    </View>
                ) : (
                    requests.map(request => (
                        <View key={request._id} style={styles.card}>
                            <View style={styles.detailsContainer}>
                                <Text style={styles.requestId}>{request.requestId}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>NGO Name:</Text> {request.ngoName}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>Reg. ID:</Text> {request.registrationId}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>Email:</Text> {request.email}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>Contact:</Text> {request.contactNumber}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>Location:</Text> {request.location}</Text>
                                <Text style={styles.detailText}><Text style={styles.boldText}>Date:</Text> {new Date(request.dateOfRequest).toLocaleDateString()}</Text>
                                {request.documentPath && (
                                    <TouchableOpacity onPress={() => Linking.openURL(`${BACKEND_API_URL}/${request.documentPath}`)}>
                                        <Text style={styles.linkText}>View Registration Document</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleUpdateRequest(request, 'approve')}>
                                    <Ionicons name="checkmark" size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleUpdateRequest(request, 'reject')}>
                                    <Ionicons name="close" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pageContainer: { flex: 1, backgroundColor: '#FFFBF8' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    scrollContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#F0E0E0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    detailsContainer: { flex: 1 },
    requestId: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', marginBottom: 10 },
    detailText: { fontSize: 14, color: '#5B4242', marginTop: 4, lineHeight: 22 },
    boldText: { fontWeight: '700', color: '#3A0000' },
    linkText: { fontSize: 14, color: '#007AFF', textDecorationLine: 'underline', marginTop: 12, fontWeight: '600' },
    actionsContainer: { justifyContent: 'flex-start', marginLeft: 10 },
    actionButton: { borderRadius: 20, padding: 10, marginVertical: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3 },
    approveButton: { backgroundColor: '#28a745' },
    rejectButton: { backgroundColor: '#dc3545' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
});