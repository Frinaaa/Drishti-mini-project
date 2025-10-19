// app/police/reports.tsx

import React, { useState, useCallback } from 'react';
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
import { BACKEND_API_URL } from '../../config/api'; // Make sure this path is correct

// --- TypeScript Interface for a Report ---
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
  reported_at: string;
  user: {
    _id: string;
    name: string; // This comes from the .populate() in your backend
  };
}

// --- Status Badge Component ---
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

// --- Info Row for Modal ---
const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function PoliceReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const baseUrl = BACKEND_API_URL.replace(/\/$/, '');

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken'); // Assuming police users have a token
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/police-login'); // Adjust login route if needed
        return;
      }
      const response = await fetch(`${baseUrl}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch reports.');
      const data: Report[] = await response.json();
      setReports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      Alert.alert('Error', `Could not load reports: ${message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, baseUrl]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const openModal = (report: Report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedReport(null);
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <Image source={{ uri: `${baseUrl}/${item.photo_url}` }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.person_name}</Text>
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
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="file-tray-outline" size={60} color="#A47171" />
            <Text style={styles.emptyText}>No reports found.</Text>
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
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close-circle" size={30} color="#A47171" />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: `${baseUrl}/${selectedReport.photo_url}` }} style={styles.modalImage} />
              <View style={styles.detailsContainer}>
                <StatusBadge status={selectedReport.status} />
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E0E0',
    elevation: 2,
  },
  cardImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#3A0000' },
  cardSubtitle: { fontSize: 14, color: '#5B4242', marginVertical: 4 },
  badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#FFFBF8' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#F0E0E0',
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', flex: 1 },
  modalImage: { width: '100%', height: 300, resizeMode: 'cover' },
  detailsContainer: { padding: 20 },
  infoRow: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#F0E0E0',
    paddingBottom: 10,
  },
  infoLabel: { fontSize: 14, color: '#A47171', fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#3A0000', marginTop: 4 },
});