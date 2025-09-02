// app/(police)/ngo-management.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView, Modal, Linking } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKEND_API_URL } from '../../config/api';

// --- Interfaces (No changes here) ---
interface NgoApplication {
    _id: string;
    requestId: string;
    ngoName: string;
    email: string;
    contactNumber: string;
    location: string;
    description: string;
    registrationId: string;
    documentPath: string;
    dateOfRequest: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approvedUser?: {
        _id: string;
        name: string;
        email: string;
        status: 'Active' | 'Frozen' | 'Blocked';
    };
}
type FilterStatus = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Frozen';

// --- Reusable Components (No changes here) ---
const StatusBadge = ({ application }: { application: NgoApplication }) => {
    let displayStatus: 'Pending' | 'Approved' | 'Rejected' | 'Frozen' = application.status;
    let backgroundColor = '', textColor = '';
    if (application.status === 'Approved' && application.approvedUser) {
        displayStatus = application.approvedUser.status === 'Frozen' ? 'Frozen' : 'Approved';
    }
    switch (displayStatus) {
        case 'Approved': backgroundColor = '#D4EDDA'; textColor = '#155724'; break;
        case 'Pending':  backgroundColor = '#FFF3CD'; textColor = '#856404'; break;
        case 'Rejected': backgroundColor = '#F8D7DA'; textColor = '#721C24'; break;
        case 'Frozen':   backgroundColor = '#CCE5FF'; textColor = '#004085'; break;
        default:         backgroundColor = '#E9ECEF'; textColor = '#6C757D'; break;
    }
    return (<View style={[styles.badge, { backgroundColor }]}><Text style={[styles.badgeText, { color: textColor }]}>{displayStatus}</Text></View>);
};
const InfoRow = ({ label, value, isLink = false }: { label: string, value: string, isLink?: boolean }) => (
    <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text>{isLink ? (<TouchableOpacity onPress={() => Linking.openURL(value).catch(() => Alert.alert("Error", "Could not open document."))}><Text style={[styles.infoValue, styles.linkText]}>View Document</Text></TouchableOpacity>) : (<Text style={styles.infoValue}>{value}</Text>)}</View>
);


// --- FIX #1: Create a data structure for the filter buttons ---
// This separates the user-facing text (label) from the internal state value (value).
const filterOptions = [
    { label: 'All',      value: 'All'      as FilterStatus },
    { label: 'Pending',  value: 'Pending'  as FilterStatus },
    { label: 'Verified', value: 'Approved' as FilterStatus }, // <-- This is the most important fix
    { label: 'Rejected', value: 'Rejected' as FilterStatus },
    { label: 'Frozen',   value: 'Frozen'   as FilterStatus },
];


export default function NgoManagementScreen() {
    const router = useRouter();
    const [allApplications, setAllApplications] = useState<NgoApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<NgoApplication[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<NgoApplication | null>(null);

    // --- DATA FETCHING & FILTERING ---
    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                Alert.alert("Authentication Error", "Please log in again.");
                router.replace('/(auth)/police-login'); return;
            }
            const response = await fetch(`${BACKEND_API_URL}/api/requests/all-applications`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch applications.');
            const data = await response.json();
            setAllApplications(data);
        } catch (error: any) {
            Alert.alert('Error', `Could not load applications: ${error.message}`);
        } finally {
            if (!isRefreshing) setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

    // This useEffect hook correctly filters the list based on the active state.
    useEffect(() => {
        if (activeFilter === 'All') {
            setFilteredApplications(allApplications);
            return;
        }
        let result = allApplications;
        if (activeFilter === 'Approved') { // The "Verified" button now correctly sets this state
            result = allApplications.filter(app => app.status === 'Approved' && app.approvedUser?.status === 'Active');
        } else if (activeFilter === 'Rejected') {
            result = allApplications.filter(app => app.status === 'Rejected');
        } else if (activeFilter === 'Pending') {
            result = allApplications.filter(app => app.status === 'Pending');
        } else if (activeFilter === 'Frozen') {
             result = allApplications.filter(app => app.status === 'Approved' && app.approvedUser?.status === 'Frozen');
        }
        setFilteredApplications(result);
    }, [activeFilter, allApplications]);

    // --- ACTION HANDLERS ---
    const handleUpdateStatus = async (application: NgoApplication, action: 'Approve' | 'Reject' | 'Freeze' | 'Unfreeze') => {
        Alert.alert( `Confirm ${action}`, `Are you sure you want to ${action.toLowerCase()} this application?`,
            [{ text: "Cancel", style: "cancel" }, { text: action, onPress: async () => {
                try {
                    const token = await AsyncStorage.getItem('authToken');
                    if (!token) { Alert.alert("Error", "Auth token missing."); return; }
                    let endpoint = '';
                    if (action === 'Approve') endpoint = `${BACKEND_API_URL}/api/requests/approve-application/${application._id}`;
                    else if (action === 'Reject') endpoint = `${BACKEND_API_URL}/api/requests/reject-application/${application._id}`;
                    else if (action === 'Freeze') endpoint = `${BACKEND_API_URL}/api/requests/freeze-user/${application._id}`;
                    else if (action === 'Unfreeze') endpoint = `${BACKEND_API_URL}/api/requests/unfreeze-user/${application._id}`;
                    const response = await fetch(endpoint, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                    const responseData = await response.json();
                    if (response.ok) {
                        Alert.alert("Success", responseData.msg || "Status updated.");
                        onRefresh();
                    } else { throw new Error(responseData.msg || 'Failed to update status.'); }
                } catch (error: any) { Alert.alert('Error', `Could not perform action: ${error.message}`); }
            },}]
        );
    };
    const handleCardPress = (application: NgoApplication) => { setSelectedApplication(application); setIsModalVisible(true); };
    const closeModal = () => { setIsModalVisible(false); setSelectedApplication(null); };

    return (
        <SafeAreaView style={styles.pageContainer}>
            <Stack.Screen options={{ title: 'NGO Management Overview' }} />
            <Text style={styles.headerTitle}>NGO Management Overview</Text>

            {/* --- FIX #2: The corrected filter bar --- */}
            {/* This now maps over the `filterOptions` array to create the buttons, ensuring the logic is correct. */}
            <View style={styles.filterContainer}>
                {filterOptions.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.filterButton, activeFilter === option.value && styles.activeFilterButton]}
                        onPress={() => setActiveFilter(option.value)}
                    >
                        <Text style={[styles.filterButtonText, activeFilter === option.value && styles.activeFilterButtonText]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Main List View */}
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {loading && !refreshing ? ( <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
                ) : filteredApplications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No applications found for this filter.</Text>
                    </View>
                ) : (
                    filteredApplications.map(app => (
                        <TouchableOpacity key={app._id} onPress={() => handleCardPress(app)} activeOpacity={0.7}>
                            <View style={styles.card}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.ngoName} numberOfLines={1}>{app.ngoName}</Text>
                                    <Text style={styles.ngoEmail}>{app.email}</Text>
                                </View>
                                <StatusBadge application={app} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Details Modal */}
            {selectedApplication && (
                <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={closeModal}>
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalView}>
                            <ScrollView>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedApplication.ngoName}</Text>
                                    <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={30} color="#A47171" /></TouchableOpacity>
                                </View>
                                <InfoRow label="Request ID" value={selectedApplication.requestId} />
                                <InfoRow label="Registration ID" value={selectedApplication.registrationId} />
                                <InfoRow label="Email" value={selectedApplication.email} />
                                <InfoRow label="Contact Number" value={selectedApplication.contactNumber} />
                                <InfoRow label="Location" value={selectedApplication.location} />
                                <InfoRow label="Submitted On" value={new Date(selectedApplication.dateOfRequest).toLocaleDateString()} />
                                <InfoRow label="Description" value={selectedApplication.description} />
                                <InfoRow label="Registration Proof" value={`${BACKEND_API_URL}/${selectedApplication.documentPath}`} isLink={true} />
                                <View style={styles.modalActionsContainer}>
                                    {selectedApplication.status === 'Pending' && (
                                        <>
                                            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => { closeModal(); handleUpdateStatus(selectedApplication, 'Approve'); }}>
                                                <Ionicons name="checkmark-circle-outline" size={22} color="white" />
                                                <Text style={styles.actionButtonText}>Approve</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => { closeModal(); handleUpdateStatus(selectedApplication, 'Reject'); }}>
                                                <Ionicons name="close-circle-outline" size={22} color="white" />
                                                <Text style={styles.actionButtonText}>Reject</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    {selectedApplication.status === 'Approved' && selectedApplication.approvedUser?.status === 'Active' && (
                                        <TouchableOpacity style={[styles.actionButton, styles.freezeButton]} onPress={() => { closeModal(); handleUpdateStatus(selectedApplication, 'Freeze'); }}>
                                            <Ionicons name="snow-outline" size={22} color="white" />
                                            <Text style={styles.actionButtonText}>Freeze Account</Text>
                                        </TouchableOpacity>
                                    )}
                                    {selectedApplication.status === 'Approved' && selectedApplication.approvedUser?.status === 'Frozen' && (
                                        <TouchableOpacity style={[styles.actionButton, styles.unfreezeButton]} onPress={() => { closeModal(); handleUpdateStatus(selectedApplication, 'Unfreeze'); }}>
                                            <Ionicons name="reload-outline" size={22} color="white" />
                                            <Text style={styles.actionButtonText}>Unfreeze Account</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    pageContainer: { flex: 1, backgroundColor: '#FFFBF8' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F0E0E0' },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#F7F7F7', marginBottom: 15, borderRadius: 10, marginHorizontal: 15 },
    filterButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
    activeFilterButton: { backgroundColor: '#3A0000' },
    filterButtonText: { color: '#3A0000', fontWeight: '600' },
    activeFilterButtonText: { color: 'white' },
    scrollContent: { paddingHorizontal: 15, paddingBottom: 30, flexGrow: 1 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0', elevation: 2 },
    cardInfo: { flex: 1, marginRight: 10 },
    ngoName: { fontSize: 16, fontWeight: 'bold', color: '#3A0000' },
    ngoEmail: { fontSize: 14, color: '#5B4242', marginTop: 4 },
    badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171', textAlign: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    modalView: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#F0E0E0', paddingBottom: 10, marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3A0000', flex: 1, marginRight: 10 },
    infoRow: { marginBottom: 12 },
    infoLabel: { fontSize: 14, color: '#A47171', fontWeight: '600' },
    infoValue: { fontSize: 16, color: '#3A0000', marginTop: 4 },
    linkText: { color: '#007AFF', textDecorationLine: 'underline' },
    modalActionsContainer: { marginTop: 20, borderTopWidth: 1, borderColor: '#F0E0E0', paddingTop: 15 },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, marginBottom: 10 },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    approveButton: { backgroundColor: '#28a745' },
    rejectButton: { backgroundColor: '#dc3545' },
    freezeButton: { backgroundColor: '#007bff' },
    unfreezeButton: { backgroundColor: '#6c757d' },
});