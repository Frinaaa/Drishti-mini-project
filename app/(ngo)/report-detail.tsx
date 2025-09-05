// app/(ngo)/report-detail.tsx

import React, { useState, useEffect } from 'react';
// --- FIX #1: Added missing imports ---
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; // Added useRouter
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage

import { BACKEND_API_URL } from '../../config/api';
// Assuming you don't need CustomButton if you use TouchableOpacity, but keeping it if you do
import CustomButton from '../../components/CustomButton';

export default function ReportDetailScreen() {
    const router = useRouter(); // Get the router to navigate back
    const { reportId } = useLocalSearchParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (!reportId) return;
            try {
                const response = await fetch(`${BACKEND_API_URL}/api/reports/${reportId}`);
                const data = await response.json();
                if (response.ok) {
                    setReport(data);
                } else {
                    throw new Error('Failed to fetch report');
                }
            } catch (error) {
                Alert.alert('Error', 'Could not load report details.');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [reportId]);

    // --- This is the single, correct function for handling status updates ---
    const handleUpdateStatus = async (action: 'verify' | 'reject') => {
        const actionText = action.charAt(0).toUpperCase() + action.slice(1); // "Verify" or "Reject"
        Alert.alert(
            `Confirm ${actionText}`,
            `Are you sure you want to ${action} this report for "${report?.person_name}"? The family will be notified.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: `Yes, ${actionText}`,
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            if (!token) {
                                return Alert.alert('Error', 'Authentication token not found.');
                            }

                            const endpoint = `${BACKEND_API_URL}/api/reports/${action}/${reportId}`;
                            const response = await fetch(endpoint, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}` },
                            });

                            const data = await response.json();
                            if (response.ok) {
                                Alert.alert('Success', data.msg);
                                router.back(); // Go back to the list screen after success
                            } else {
                                throw new Error(data.msg || 'An error occurred.');
                            }
                        } catch (error: any) {
                            Alert.alert('Action Failed', error.message);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    if (!report) {
        return <View style={styles.centered}><Text>Report not found.</Text></View>;
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Report Details', headerShown: true }} />
            <ScrollView style={styles.container}>
                <Image 
                    source={report.photo_url ? { uri: `${BACKEND_API_URL}/${report.photo_url}` } : require('@/assets/images/story1.png')} 
                    style={styles.reportImage} 
                />
                <View style={styles.content}>
                    <Text style={styles.name}>{report.person_name}, {report.age}</Text>
                    <Text style={styles.status}>Status: {report.status}</Text>
                    
                    <Text style={styles.sectionHeader}>Missing Person Details</Text>
                    <View style={styles.infoBox}>
                        <InfoRow icon="male-female-outline" label="Gender" value={report.gender} />
                        <InfoRow icon="location-outline" label="Last Seen" value={report.last_seen} />
                        <InfoRow icon="reader-outline" label="Description" value={report.description || 'No description provided.'} />
                    </View>

                    <Text style={styles.sectionHeader}>Reporter Information</Text>
                    <View style={styles.infoBox}>
                        <InfoRow icon="person-outline" label="Submitted By" value={report.user?.name || 'N/A'} />
                        <InfoRow icon="mail-outline" label="Contact Email" value={report.user?.email || 'N/A'} />
                        <InfoRow icon="call-outline" label="Contact Phone" value={report.reporterContact || 'N/A'} />
                        <InfoRow icon="people-circle-outline" label="Relation" value={report.relationToReporter || 'N/A'} />
                        <InfoRow icon="calendar-outline" label="Submitted On" value={new Date(report.reported_at).toDateString()} />
                    </View>

                    {/* --- FIX #2: Updated the action container to call the correct function --- */}
                    <View style={styles.actionContainer}>
                        {/* Only show these buttons if the report is still pending */}
                        {report.status === 'Pending Verification' && (
                            <>
                                <TouchableOpacity style={[styles.actionButton, styles.verifyButton]} onPress={() => handleUpdateStatus('verify')}>
                                    <Ionicons name="shield-checkmark-outline" size={22} color="white" />
                                    <Text style={styles.actionButtonText}>Verify Report</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleUpdateStatus('reject')}>
                                    <Ionicons name="close-circle-outline" size={22} color="white" />
                                    <Text style={styles.actionButtonText}>Reject Report</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </>
    );
}

const InfoRow = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon} size={20} color="#850a0a" style={styles.icon} />
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    reportImage: { width: '100%', height: 300 },
    name: { fontSize: 26, fontWeight: 'bold', color: '#3A0000', marginBottom: 5 },
    status: { fontSize: 16, color: '#B94E4E', marginBottom: 20, fontStyle: 'italic' },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', marginTop: 15, marginBottom: 10 },
    infoBox: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#F0E0E0' },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    icon: { marginRight: 15, width: 20 },
    infoLabel: { fontSize: 16, fontWeight: '600', color: '#3A0000' },
    infoValue: { fontSize: 16, color: '#5B4242', flex: 1, textAlign: 'right', marginLeft: 10, flexWrap: 'wrap' },
    actionContainer: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderColor: '#F0E0E0' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 10 },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    verifyButton: { backgroundColor: '#28a745' },
    rejectButton: { backgroundColor: '#dc3545' },
});