// app/(police)/incoming-reports.tsx

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
import { BACKEND_API_URL } from '../../config/api';

// This is the Report interface from before
interface Report {
  _id: string;
  person_name: string;
  age: number;
  gender: string;
  last_seen: string;
  description?: string;
  photo_url: string;
  pinCode: string;
  status: 'Pending NGO Verification' | 'Pending Police Verification' | 'Rejected' | 'Found';
  reported_at: string;
  user: {
    _id: string;
    name: string;
  };
}

const StatusBadge = ({ status }: { status: Report['status'] }) => {
  const statusStyles = {
    'Found': { bg: '#28a745', color: '#fff' },
    'Pending Police Verification': { bg: '#007bff', color: '#fff' },
    'Pending NGO Verification': { bg: '#ffc107', color: '#333' },
    'Rejected': { bg: '#dc3545', color: '#fff' },
  };
  const style = statusStyles[status] || { bg: '#6c757d', color: '#fff' };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}><Text style={[styles.badgeText, { color: style.color }]}>{status}</Text></View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
);

export default function IncomingReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseUrl = BACKEND_API_URL.replace(/\/$/, '');

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/police-login');
        return;
      }
      // --- FETCH FROM THE NEW DEDICATED ENDPOINT ---
      const response = await fetch(`${baseUrl}/api/reports/pending-police`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data: Report[] = await response.json();
      setReports(data);
    } catch (err) {
      Alert.alert('Error', `Could not load reports: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, baseUrl]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const openModal = (report: Report) => { setSelectedReport(report); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedReport(null); };

  const handleUpdateStatus = async (reportId: string, action: 'found' | 'reject') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('Auth token missing.');

      const response = await fetch(`${baseUrl}/api/reports/${action}/${reportId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Action failed.');
      
      Alert.alert('Success', data.msg);
      closeModal();
      onRefresh();
    } catch (err) {
      Alert.alert('Action Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <Image source={{ uri: `${baseUrl}/${item.photo_url}` }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.person_name}</Text>
        <Text style={styles.cardSubtitle}>Status:</Text>
        <StatusBadge status={item.status} />
      </View>
      <Ionicons name="chevron-forward" size={24} color="#A47171" />
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Incoming Reports' }} />
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="file-tray-outline" size={60} color="#A47171" />
            <Text style={styles.emptyText}>No new reports require verification.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#850a0a"]} />}
      />

      {selectedReport && (
        <Modal animationType="slide" visible={isModalVisible} onRequestClose={closeModal}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedReport.person_name}</Text>
                <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={30} color="#A47171" /></TouchableOpacity>
              </View>
              <Image source={{ uri: `${baseUrl}/${selectedReport.photo_url}` }} style={styles.modalImage} />
              <View style={styles.detailsContainer}>
                <InfoRow label="Age" value={selectedReport.age} />
                <InfoRow label="Gender" value={selectedReport.gender} />
                <InfoRow label="Last Seen Details" value={selectedReport.last_seen} />
                <InfoRow label="Forwarded By (NGO)" value={selectedReport.user.name} />
              </View>

              {selectedReport.status === 'Pending Police Verification' && (
                <View style={styles.modalActionsContainer}>
                  <TouchableOpacity style={[styles.actionButton, styles.foundButton]} onPress={() => handleUpdateStatus(selectedReport._id, 'found')} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Mark as Found</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleUpdateStatus(selectedReport._id, 'reject')} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Reject Report</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// You can reuse the same styles from alerts.tsx or define them here
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { marginTop: 15, fontSize: 18, color: '#A47171', fontWeight: '600' },
  listContent: { padding: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0E0E0', elevation: 3 },
  cardImage: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#5B4242', textTransform: 'uppercase', marginBottom: 4 },
  badge: { borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#FFFBF8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#3A0000' },
  modalImage: { width: '100%', height: 350 },
  detailsContainer: { padding: 20 },
  infoRow: { marginBottom: 15, borderBottomWidth: 1, borderColor: '#F0E0E0', paddingBottom: 10 },
  infoLabel: { fontSize: 14, color: '#A47171', fontWeight: '600', marginBottom: 5 },
  infoValue: { fontSize: 16, color: '#3A0000' },
  modalActionsContainer: { paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderColor: '#F0E0E0' },
  actionButton: { borderRadius: 10, paddingVertical: 14, marginTop: 10, alignItems: 'center' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  foundButton: { backgroundColor: '#28a745' },
  rejectButton: { backgroundColor: '#dc3545' },
});