import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NgoUser { _id: string; name: string; email: string; verification_status: 'Pending' | 'Rejected'; }

export default function PendingNgosScreen() {
    const router = useRouter();
    const [ngos, setNgos] = useState<NgoUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/police-login');
                return;
            }
            const response = await fetch(`${BACKEND_API_URL}/api/users/pending-ngos`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch NGOs.');
            setNgos(await response.json());
        } catch (error) {
            Alert.alert('Error', 'Could not load NGOs for verification.');
        } finally {
            if (!isRefreshing) setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

    const handleUpdateStatus = (ngo: NgoUser, newStatus: 'Approved' | 'Rejected') => {
        Alert.alert(
            `Confirm ${newStatus}`,
            `Are you sure you want to ${newStatus.toLowerCase()} ${ngo.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: newStatus,
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            const response = await fetch(`${BACKEND_API_URL}/api/users/update-ngo-status/${ngo._id}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus })
                            });
                            if (response.ok) {
                                Alert.alert("Success", `${ngo.name} has been ${newStatus.toLowerCase()}.`);
                                onRefresh();
                            } else { throw new Error("Update failed"); }
                        } catch (error) { Alert.alert("Error", `Could not update status.`); }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        if (status === 'Pending') return '#ffc107'; // Yellow
        if (status === 'Rejected') return '#dc3545'; // Red
        return '#6c757d'; // Grey
    };

    return (
        <SafeAreaView style={styles.pageContainer}>
            <Text style={styles.headerTitle}>Pending NGO Verifications</Text>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
                ) : ngos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="hourglass-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No pending or rejected NGOs found.</Text>
                    </View>
                ) : (
                    ngos.map(ngo => (
                        <View key={ngo._id} style={styles.card}>
                            <View style={styles.detailsContainer}>
                                <View style={styles.nameContainer}>
                                    <Text style={styles.ngoName}>{ngo.name}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ngo.verification_status) }]}>
                                        <Text style={styles.statusText}>{ngo.verification_status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.detailText}>{ngo.email}</Text>
                            </View>
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleUpdateStatus(ngo, 'Approved')}>
                                    <Ionicons name="checkmark" size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleUpdateStatus(ngo, 'Rejected')}>
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

/*
 * ==================================================================
 * THIS IS THE MISSING CODE BLOCK
 * This `StyleSheet.create` call defines the `styles` object that the
 * component was trying to use. Adding it back will fix the crash.
 * ==================================================================
 */
const styles = StyleSheet.create({
    pageContainer: { flex: 1, backgroundColor: '#FFFBF8' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', textAlign: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    scrollContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0', elevation: 2 },
    detailsContainer: { flex: 1 },
    nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    ngoName: { fontSize: 18, fontWeight: 'bold', color: '#3A0000' },
    statusBadge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
    statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    detailText: { fontSize: 14, color: '#5B4242' },
    actionsContainer: { flexDirection: 'row', marginLeft: 10 },
    actionButton: { borderRadius: 20, padding: 10, marginLeft: 8 },
    approveButton: { backgroundColor: '#28a745' },
    rejectButton: { backgroundColor: '#dc3545' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
});