import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Linking, SafeAreaView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Using the recommended path alias for robust imports.
// Make sure your babel.config.js and tsconfig.json are set up for this.
import { BACKEND_API_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This interface defines the structure of a Request object received from the backend.
interface NgoRequest {
    _id: string;
    requestId: string;
    location: string;
    contact: string;
    dateOfRequest: string;
    documentPath?: string; // The document is optional.
    ngo_user: {
        name: string; // The name of the NGO that sent the request.
    } | null; // It could be null if the user was deleted.
}

export default function VerifyRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<NgoRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // This function connects to your backend to get the list of pending requests.
    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                // If the user is not logged in, send them to the login screen.
                Alert.alert("Authentication Error", "Please log in again.");
                router.replace('/(auth)/police-login');
                return;
            }
            // It calls the GET /api/requests/pending endpoint.
            const response = await fetch(`${BACKEND_API_URL}/api/requests/pending`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch requests from the server.');
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            Alert.alert('Error', 'Could not load pending requests.');
        } finally {
            if (!isRefreshing) setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    // This hook automatically re-runs `fetchData` every time the screen comes into focus.
    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
    
    // This function handles the pull-to-refresh action.
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

    // This function handles the "Approve" and "Reject" button presses.
    const handleUpdateRequest = (request: NgoRequest, newStatus: 'Approved' | 'Rejected') => {
        Alert.alert(
            `${newStatus} Request`,
            `Are you sure you want to ${newStatus.toLowerCase()} request ${request.requestId}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: newStatus,
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            // It calls the PUT /api/requests/:id/status endpoint.
                            const response = await fetch(`${BACKEND_API_URL}/api/requests/${request._id}/status`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus })
                            });
                            if (response.ok) {
                                Alert.alert("Success", `Request has been ${newStatus.toLowerCase()}.`);
                                onRefresh(); // Refresh the list to show the change.
                            } else { throw new Error("Update failed"); }
                        } catch (error) { Alert.alert("Error", `Could not update the request.`); }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.pageContainer}>
            <Text style={styles.headerTitle}>Verify Incoming Requests</Text>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#850a0a"]} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
                ) : requests.length === 0 ? (
                    // This message is shown if the backend returns no pending requests.
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-checkmark-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No pending requests to verify.</Text>
                    </View>
                ) : (
                    // This creates a card for each request sent by the NGOs.
                    requests.map(request => (
                        <View key={request._id} style={styles.card}>
                            <View style={styles.detailsContainer}>
                                <Text style={styles.requestId}>{request.requestId}</Text>
                                {/* DEFENSIVE CODING: This check prevents the app from crashing if ngo_user is null. */}
                                <Text style={styles.detailText}>From: <Text style={styles.boldText}>{request.ngo_user ? request.ngo_user.name : 'Unknown User'}</Text></Text>
                                <Text style={styles.detailText}>Location: <Text style={styles.boldText}>{request.location}</Text></Text>
                                <Text style={styles.detailText}>Contact: <Text style={styles.boldText}>{request.contact}</Text></Text>
                                <Text style={styles.detailText}>Date: {new Date(request.dateOfRequest).toLocaleDateString()}</Text>
                                {request.documentPath && (
                                    <TouchableOpacity onPress={() => Linking.openURL(`${BACKEND_API_URL}/${request.documentPath}`)}>
                                        <Text style={styles.linkText}>View Supporting Document</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleUpdateRequest(request, 'Approved')}>
                                    <Ionicons name="checkmark" size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleUpdateRequest(request, 'Rejected')}>
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
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0', elevation: 2 },
    detailsContainer: { flex: 1 },
    requestId: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', marginBottom: 8 },
    detailText: { fontSize: 14, color: '#5B4242', marginTop: 4, lineHeight: 20 },
    boldText: { fontWeight: '600', color: '#3A0000' },
    linkText: { fontSize: 14, color: '#007AFF', textDecorationLine: 'underline', marginTop: 8 },
    actionsContainer: { justifyContent: 'space-around', marginLeft: 10 },
    actionButton: { borderRadius: 20, padding: 10, marginVertical: 5 },
    approveButton: { backgroundColor: '#28a745' },
    rejectButton: { backgroundColor: '#dc3545' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
});