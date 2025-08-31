// --- THIS IS THE CORRECTED LINE ---
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../config/api';

type NgoStatus = 'All' | 'Approved' | 'Pending' | 'Rejected';

interface NgoUser {
    _id: string;
    name: string;
    email: string;
    status:  'Pending' | 'Approved' | 'Rejected';
}

const StatusBadge = ({ status }: { status: NgoUser['status'] }) => {
    const statusStyles = {
        Approved: { backgroundColor: '#D4EDDA', color: '#155724' },
        Pending: { backgroundColor: '#FFF3CD', color: '#856404' },
        Rejected: { backgroundColor: '#F8D7DA', color: '#721C24' },
    };
    return (
        <View style={[styles.badge, { backgroundColor: statusStyles[status].backgroundColor }]}>
            <Text style={[styles.badgeText, { color: statusStyles[status].color }]}>{status}</Text>
        </View>
    );
};

export default function NgoManagementScreen() {
    const [allNgos, setAllNgos] = useState<NgoUser[]>([]);
    const [filteredNgos, setFilteredNgos] = useState<NgoUser[]>([]);
    const [activeFilter, setActiveFilter] = useState<NgoStatus>('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!refreshing) setLoading(true);
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/users/ngos`);
            if (!response.ok) throw new Error('Failed to fetch NGOs.');
            const data = await response.json();
            setAllNgos(data);
        } catch (error) {
            Alert.alert('Error', 'Could not load NGO data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
    
    useEffect(() => {
        if (activeFilter === 'All') {
            setFilteredNgos(allNgos);
        } else {
            const filtered = allNgos.filter(ngo => ngo.status === activeFilter);
            setFilteredNgos(filtered);
        }
    }, [activeFilter, allNgos]);

    const onRefresh = useCallback(() => { setRefreshing(true); }, []);

    const FilterButton = ({ title, status }: { title: string, status: NgoStatus }) => (
        <TouchableOpacity
            style={[styles.filterButton, activeFilter === status && styles.activeFilterButton]}
            onPress={() => setActiveFilter(status)}
        >
            <Text style={[styles.filterButtonText, activeFilter === status && styles.activeFilterButtonText]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.pageContainer}>
            <Stack.Screen options={{ title: 'NGO Management' }} />
            <View style={styles.header}>
                <View style={styles.filterContainer}>
                    <FilterButton title="All" status="All" />
                    <FilterButton title="Verified" status="Approved" />
                    <FilterButton title="Pending" status="Pending" />
                    <FilterButton title="Frozen" status="Rejected" />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#850a0a"]} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
                ) : filteredNgos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No NGOs found for this filter.</Text>
                    </View>
                ) : (
                    filteredNgos.map(ngo => (
                        <View key={ngo._id} style={styles.card}>
                            <View>
                                <Text style={styles.ngoName}>{ngo.name}</Text>
                                <Text style={styles.ngoEmail}>{ngo.email}</Text>
                            </View>
                            <StatusBadge status={ngo.status} />
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pageContainer: { flex: 1, backgroundColor: '#FFFBF8' },
    header: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, backgroundColor: '#FFFBF8', borderBottomWidth: 1, borderColor: '#F0E0E0' },
    filterContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filterButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F5EAEA', borderRadius: 20 },
    activeFilterButton: { backgroundColor: '#850a0a' },
    filterButtonText: { color: '#3A0000', fontWeight: '600' },
    activeFilterButtonText: { color: '#FFFFFF' },
    scrollContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0' },
    ngoName: { fontSize: 16, fontWeight: 'bold', color: '#3A0000' },
    ngoEmail: { fontSize: 14, color: '#5B4242', marginTop: 4 },
    badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
});