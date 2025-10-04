

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView, Modal, Linking, Platform } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKEND_API_URL } from '../../config/api';

// Platform-aware backend helper
const DEFAULT_BACKEND = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
const getBackendUrl = () => {
  if (typeof BACKEND_API_URL === 'string' && BACKEND_API_URL.trim()) return BACKEND_API_URL.replace(/\/$/, '');
  return DEFAULT_BACKEND;
};


// Types
interface NgoApplication {
  _id: string;
  ngoName: string;
  email: string;
  contactNumber?: string;
  location?: string;
  description?: string;
  registrationId?: string;
  documentPath?: string;
  dateOfRequest?: string;
  pinCode?:string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedUser?: any;
}

type FilterStatus = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Frozen';

const filterOptions = [
  { label: 'All', value: 'All' as FilterStatus },
  { label: 'Pending', value: 'Pending' as FilterStatus },
  { label: 'Verified', value: 'Approved' as FilterStatus },
  { label: 'Rejected', value: 'Rejected' as FilterStatus },
  { label: 'Frozen', value: 'Frozen' as FilterStatus },
];

const StatusBadge = ({ application }: { application: NgoApplication }) => {
  let displayStatus: 'Pending' | 'Approved' | 'Rejected' | 'Frozen' = application.status;
  if (application.status === 'Approved' && application.approvedUser?.status === 'Frozen') displayStatus = 'Frozen';
  const colors: any = {
    Approved: { bg: '#D4EDDA', color: '#155724' },
    Pending: { bg: '#FFF3CD', color: '#856404' },
    Rejected: { bg: '#F8D7DA', color: '#721C24' },
    Frozen: { bg: '#CCE5FF', color: '#004085' },
  };
  const style = colors[displayStatus] || { bg: '#E9ECEF', color: '#6C757D' };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.color }]}>{displayStatus}</Text>
    </View>
  );
};

const InfoRow = ({ label, value, isLink = false }: { label: string; value: string; isLink?: boolean }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {isLink ? (
      <TouchableOpacity onPress={() => Linking.openURL(value).catch(() => Alert.alert('Error', 'Could not open document.'))}>
        <Text style={[styles.infoValue, styles.linkText]}>View Document</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.infoValue}>{value}</Text>
    )}
  </View>
);

export default function NgoManagementScreen() {
  const router = useRouter();
  const [allApplications, setAllApplications] = useState<NgoApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<NgoApplication[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<NgoApplication | null>(null);

  const baseUrl = getBackendUrl();

  const fetchData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('[NgoManagement] No auth token, redirecting to login');
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/police-login');
        return;
      }
      const endpoint = `${baseUrl}/api/requests/all-applications`;
      console.log('[NgoManagement] GET', endpoint);
      const resp = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      console.log('[NgoManagement] GET status', resp.status);
      if (!resp.ok) throw new Error(`Failed to fetch (${resp.status})`);

      let data;
      const contentType = resp.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        const textResponse = await resp.text();
        console.log('[NgoManagement] non-JSON response from fetchData:', textResponse.substring(0, 200));
        throw new Error(`Server returned non-JSON response (${resp.status}): ${textResponse.substring(0, 100)}...`);
      }

      console.log('[NgoManagement] applications count', Array.isArray(data) ? data.length : 'n/a');
      setAllApplications(data);
    } catch (err: any) {
      console.log('[NgoManagement] fetchData error', err);
      Alert.alert('Error', `Could not load applications: ${err.message}`);
    } finally {
      if (!isRefreshing) setLoading(false);
      setRefreshing(false);
    }
  }, [baseUrl, router]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    console.log('[NgoManagement] activeFilter', activeFilter);
    if (activeFilter === 'All') return setFilteredApplications(allApplications);
    let result = allApplications;
    if (activeFilter === 'Approved') result = allApplications.filter((a) => a.status === 'Approved' && a.approvedUser?.status === 'Active');
    if (activeFilter === 'Pending') result = allApplications.filter((a) => a.status === 'Pending');
    if (activeFilter === 'Rejected') result = allApplications.filter((a) => a.status === 'Rejected');
    if (activeFilter === 'Frozen') result = allApplications.filter((a) => a.status === 'Approved' && a.approvedUser?.status === 'Frozen');
    setFilteredApplications(result);
  }, [activeFilter, allApplications]);


  // perform the network call for an action
  const performUpdate = async (application: NgoApplication, action: 'Approve' | 'Reject' | 'Freeze' | 'Unfreeze') => {
    console.log('[NgoManagement] performUpdate', action, application._id);
    const token = await AsyncStorage.getItem('authToken');
    if (!token) { Alert.alert('Error', 'Auth token missing'); return; }
    const endpointMap: any = {
      Approve: `${baseUrl}/api/requests/approve-application/${application._id}`,
      Reject: `${baseUrl}/api/requests/reject-application/${application._id}`,
      Freeze: `${baseUrl}/api/requests/freeze-user/${application._id}`,
      Unfreeze: `${baseUrl}/api/requests/unfreeze-user/${application._id}`,
    };
    const endpoint = endpointMap[action];
    try {
      console.log('[NgoManagement] calling', endpoint);
      const resp = await fetch(endpoint, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      console.log('[NgoManagement] action response status', resp.status);

      let data;
      const contentType = resp.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const textResponse = await resp.text();
        console.log('[NgoManagement] non-JSON response:', textResponse.substring(0, 200));
        if (!resp.ok) {
          throw new Error(`Server error (${resp.status}): ${textResponse.substring(0, 100)}...`);
        }
        data = { msg: 'Action completed successfully' };
      }

      console.log('[NgoManagement] action response data', data);
      if (!resp.ok) throw new Error(data?.msg || `Failed (${resp.status})`);
      Alert.alert('Success', data.msg || 'Action completed');
      // close modal and refresh
      setIsModalVisible(false);
      setSelectedApplication(null);
      onRefresh();
    } catch (err: any) {
      console.log('[NgoManagement] action error', err);
      Alert.alert('Error', `Action failed: ${err.message}`);
    }
  };

  const handleCardPress = (app: NgoApplication) => {
    setSelectedApplication(app);
    setIsModalVisible(true);
  };
  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedApplication(null);
  };

  return (
    <SafeAreaView style={styles.pageContainer}>
      <Stack.Screen options={{ title: 'NGO Management Overview' }} />
      

      <View style={styles.filterContainer}>
        {filterOptions.map((opt) => (
          <TouchableOpacity key={opt.value} style={[styles.filterButton, activeFilter === opt.value && styles.activeFilterButton]} onPress={() => setActiveFilter(opt.value)}>
            <Text style={[styles.filterButtonText, activeFilter === opt.value && styles.activeFilterButtonText]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#850a0a" style={{ marginTop: 50 }} />
        ) : filteredApplications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#A47171" />
            <Text style={styles.emptyText}>No applications found for this filter.</Text>
          </View>
        ) : (
          filteredApplications.map((app) => (
            <TouchableOpacity key={app._id} onPress={() => handleCardPress(app)} activeOpacity={0.8}>
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

      {selectedApplication && (
        <Modal animationType="fade" transparent visible={isModalVisible} onRequestClose={closeModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalView}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedApplication.ngoName}</Text>
                  <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={30} color="#A47171" /></TouchableOpacity>
                </View>
                <InfoRow label="Registration ID" value={selectedApplication.registrationId || ''} />
                <InfoRow label="Email" value={selectedApplication.email} />
                <InfoRow label="Contact" value={selectedApplication.contactNumber || ''} />
                <InfoRow label="Location" value={selectedApplication.location || ''} />
                <InfoRow label="Pincode" value={selectedApplication.pinCode || 'N/A'} />
                <InfoRow label="Submitted On" value={selectedApplication.dateOfRequest ? new Date(selectedApplication.dateOfRequest).toLocaleDateString() : ''} />
                <InfoRow label="Description" value={selectedApplication.description || ''} />
                {selectedApplication.documentPath && (
                  <InfoRow label="Registration Proof" value={`${baseUrl}/${selectedApplication.documentPath}`} isLink />
                )}

                <View style={styles.modalActionsContainer}>
                  {selectedApplication.status === 'Pending' && (
                    <>
                      <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => { console.log('[NgoManagement] Approve pressed', selectedApplication?._id); if (selectedApplication) performUpdate(selectedApplication, 'Approve'); }}>
                        <Ionicons name="checkmark-circle-outline" size={22} color="white" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => { console.log('[NgoManagement] Reject pressed', selectedApplication?._id); if (selectedApplication) performUpdate(selectedApplication, 'Reject'); }}>
                        <Ionicons name="close-circle-outline" size={22} color="white" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {selectedApplication.status === 'Approved' && selectedApplication.approvedUser?.status === 'Active' && (
                    <TouchableOpacity style={[styles.actionButton, styles.freezeButton]} onPress={() => { console.log('[NgoManagement] Freeze pressed', selectedApplication._id); performUpdate(selectedApplication, 'Freeze'); }}>
                      <Ionicons name="snow-outline" size={22} color="white" />
                      <Text style={styles.actionButtonText}>Freeze Account</Text>
                    </TouchableOpacity>
                  )}

                  {selectedApplication.status === 'Approved' && selectedApplication.approvedUser?.status === 'Frozen' && (
                    <TouchableOpacity style={[styles.actionButton, styles.unfreezeButton]} onPress={() => { console.log('[NgoManagement] Unfreeze pressed', selectedApplication._id); performUpdate(selectedApplication, 'Unfreeze'); }}>
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