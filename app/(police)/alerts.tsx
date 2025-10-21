// app/(police)/alerts.tsx - REWRITTEN as a simple text notification feed

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// The Report interface remains the same
// app/(police)/alerts.tsx

interface Report {
  _id: string;
  person_name: string;
  // Add 'Pending NGO Verification' to this list
  status: 'Pending Police Verification' | 'Found' | 'Rejected' | 'Verified' | 'Pending NGO Verification';
  reported_at: string;
}

// A new component for rendering a single notification item
const NotificationItem = ({ report }: { report: Report }) => {
  // Helper to generate the text and icon based on status
  const getNotificationDetails = () => {
    switch (report.status) {
       case 'Pending NGO Verification':
        return {
          icon: 'document-text-outline' as const,
          color: '#ffc107', // A yellow "pending" color
          text: `New Report: A case for "${report.person_name}" has been filed and is awaiting NGO review.`,
        };
      case 'Pending Police Verification':
        return {
          icon: 'alert-circle' as const,
          color: '#007bff',
          text: `Action Required: The report for "${report.person_name}" needs verification.`,
        };
      case 'Found':
        return {
          icon: 'checkmark-circle' as const,
          color: '#28a745',
          text: `Update: The missing person "${report.person_name}" has been marked as 'Found'.`,
        };
      case 'Rejected':
        return {
          icon: 'close-circle' as const,
          color: '#dc3545',
          text: `Update: The report for "${report.person_name}" has been rejected.`,
        };
      default:
        return {
          icon: 'information-circle' as const,
          color: '#6c757d',
          text: `Activity on report for "${report.person_name}".`,
        };
    }
  };

  const { icon, color, text } = getNotificationDetails();
  
  return (
    <View style={styles.notificationCard}>
      <Ionicons name={icon} size={28} color={color} style={styles.notificationIcon} />
      <View style={styles.notificationTextContainer}>
        <Text style={styles.notificationText}>{text}</Text>
        <Text style={styles.notificationTimestamp}>
          {new Date(report.reported_at).toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

export default function PoliceNotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const baseUrl = BACKEND_API_URL.replace(/\/$/, '');

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/police-login');
        return;
      }
      // We use the same powerful police-feed endpoint
      const response = await fetch(`${baseUrl}/api/reports/police-feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data: Report[] = await response.json();
      setNotifications(data);
    } catch (err) {
      Alert.alert('Error', `Could not load notifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, baseUrl]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <FlatList
        data={notifications}
        renderItem={({ item }) => <NotificationItem report={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={60} color="#A47171" />
            <Text style={styles.emptyText}>No new notifications.</Text>
            <Text style={styles.emptySubtext}>Pending actions and recent updates will appear here.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#850a0a"]} />}
      />
    </SafeAreaView>
  );
}

// --- NEW STYLES for a clean notification list ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { marginTop: 15, fontSize: 18, color: '#A47171', fontWeight: '600', textAlign: 'center' },
  emptySubtext: { marginTop: 5, fontSize: 14, color: '#A47171', textAlign: 'center' },
  listContent: { paddingVertical: 10 },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0E0',
  },
  notificationIcon: {
    marginRight: 15,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: '#3A0000',
    lineHeight: 22,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#A47171',
    marginTop: 4,
  },
});