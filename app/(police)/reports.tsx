// app/police/reports.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

interface Report {
  _id: string;
  person_name: string;
  age: number;
  gender: string;
  last_seen: string;
  description?: string;
  photo_url: string;
  pinCode: string;
  status: 'Pending Verification' | 'Verified' | 'Rejected' | 'Found';
  source: 'Family/NGO Form' | 'Police Face Search' | 'NGO Live Scan';
  reported_at: string;
  user: {
    _id: string;
    name: string;
  };
}

// --- MODIFIED: Removed 'Family/NGO Form' from the type ---
type FilterType = 'All' | 'Police Face Search' | 'NGO Live Scan';

// --- MODIFIED: Removed 'Form Submissions' from the options array ---
const filterOptions: { label: string, value: FilterType }[] = [
    { label: 'All Reports', value: 'All' },
    { label: 'Police Search', value: 'Police Face Search' },
    { label: 'NGO Scan', value: 'NGO Live Scan' },
];

const StatusBadge = ({ status }: { status: Report['status'] }) => {
  const statusStyles = {
    'Found': { bg: '#28a745', color: '#fff' },
    'Verified': { bg: '#007bff', color: '#fff' },
    'Pending Verification': { bg: '#ffc107', color: '#333' },
    'Rejected': { bg: '#dc3545', color: '#fff' },
  };
  const style = statusStyles[status] || { bg: '#6c757d', color: '#fff' };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.color }]}>{status}</Text>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const SourceIcon = ({ source }: { source: Report['source'] }) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'document-text-outline';
    let color = '#6c757d';
    switch (source) {
        case 'Police Face Search': iconName = 'camera-outline'; color = '#007bff'; break;
        case 'NGO Live Scan': iconName = 'videocam-outline'; color = '#28a745'; break;
        case 'Family/NGO Form': default: iconName = 'create-outline'; color = '#6c757d'; break;
    }
    return <Ionicons name={iconName} size={20} color={color} style={styles.sourceIcon} />;
};

export default function PoliceReportsScreen() {
  const router = useRouter();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const baseUrl = BACKEND_API_URL.replace(/\/$/, '');

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/police-login');
        return;
      }
      const response = await fetch(`${baseUrl}/api/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch reports.');
      const data: Report[] = await response.json();
      setAllReports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      Alert.alert('Error', `Could not load reports: ${message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, baseUrl]);
  
  useEffect(() => {
    if (activeFilter === 'All') {
        setFilteredReports(allReports);
    } else {
        // Updated logic: Filter for reports that are BOTH from the selected source AND have the 'Found' status
        setFilteredReports(allReports.filter(report => report.source === activeFilter && report.status === 'Found'));
    }
  }, [allReports, activeFilter]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const openModal = (report: Report) => { setSelectedReport(report); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedReport(null); };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <Image source={{ uri: `${baseUrl}/${item.photo_url}` }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.person_name}</Text>
            <SourceIcon source={item.source} />
        </View>
        <Text style={styles.cardSubtitle}>Age: {item.age}, PIN: {item.pinCode}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Ionicons name="chevron-forward" size={24} color="#A47171" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#850a0a" />
        <Text>Loading Reports...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Missing Person Reports' }} />
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterOptions.map(option => (
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
        </ScrollView>
      </View>
      <FlatList
        data={filteredReports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="file-tray-outline" size={60} color="#A47171" />
            <Text style={styles.emptyText}>No reports found for this filter.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      {selectedReport && (
        <Modal animationType="slide" transparent={false} visible={isModalVisible} onRequestClose={closeModal}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedReport.person_name}</Text>
                <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={30} color="#A47171" /></TouchableOpacity>
              </View>
              <Image source={{ uri: `${baseUrl}/${selectedReport.photo_url}` }} style={styles.modalImage} />
              <View style={styles.detailsContainer}>
                <StatusBadge status={selectedReport.status} />
                <InfoRow label="Report Source" value={selectedReport.source || 'N/A'} />
                <InfoRow label="Age" value={selectedReport.age} />
                <InfoRow label="Gender" value={selectedReport.gender} />
                <InfoRow label="PIN Code" value={selectedReport.pinCode} />
                <InfoRow label="Last Seen" value={selectedReport.last_seen} />
                <InfoRow label="Description" value={selectedReport.description || 'N/A'} />
                <InfoRow label="Reported On" value={new Date(selectedReport.reported_at).toLocaleString()} />
                <InfoRow label="Reported By" value={selectedReport.user.name} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
  listContent: { padding: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0', elevation: 2 },
  cardImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', flex: 1 },
  sourceIcon: { marginLeft: 8 },
  cardSubtitle: { fontSize: 14, color: '#5B4242', marginVertical: 4 },
  badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#FFFBF8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#F0E0E0' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', flex: 1 },
  modalImage: { width: '100%', height: 300, resizeMode: 'cover' },
  detailsContainer: { padding: 20 },
  infoRow: { marginBottom: 15, borderBottomWidth: 1, borderColor: '#F0E0E0', paddingBottom: 10 },
  infoLabel: { fontSize: 14, color: '#A47171', fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#3A0000', marginTop: 4 },
  filterContainer: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#F7F7F7', borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
  filterButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E9ECEF', marginRight: 10 },
  activeFilterButton: { backgroundColor: '#3A0000' },
  filterButtonText: { color: '#3A0000', fontWeight: '600' },
  activeFilterButtonText: { color: 'white' },
});