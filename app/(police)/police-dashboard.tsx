// app/(police)/police-dashboard.tsx

import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'; // CORRECTED IMPORT
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'react-toastify';
import { BACKEND_API_URL } from '@/config/api';

// --- Helper Types & Functions ---
interface RecentCase {
  _id: string;
  person_name: string;
  last_seen: string;
  reported_at: string;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

// --- Static Data for Action Cards ---
const actionCards = [
    { title: 'View Statistics', description: 'Access comprehensive statistics on missing persons cases.', buttonText: 'View', iconName: 'stats-chart', image: require('@/assets/images/statistics.png'), href: '/statistics' },
    { title: 'Monitor Reports', description: 'Track and manage ongoing missing person reports in your jurisdiction.', buttonText: 'Monitor', iconName: 'document-text', image: require('@/assets/images/reports.png'), href: '/reports' },
    { title: 'Add New Admin', description: 'Create accounts for new police officers.', buttonText: 'Add', iconName: 'person-add', image: require('@/assets/images/add_admin.png'), href: '/(police)/add-admin' },
];


// --- Main Component ---
export default function PoliceDashboardScreen() {
  const router = useRouter();
  const { officerName } = useLocalSearchParams<{ officerName?: string }>(); // CORRECTED HOOK USAGE
  
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const notifiedCaseIds = React.useRef(new Set());

  const fetchRecentCases = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/reports/recent`);
      if (!response.ok) throw new Error('Failed to fetch cases');
      const data: RecentCase[] = await response.json();
      setRecentCases(data);

      data.forEach(newCase => {
        if (!notifiedCaseIds.current.has(newCase._id)) {
          toast.info(`New report for ${newCase.person_name} is pending review.`);
          notifiedCaseIds.current.add(newCase._id);
        }
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not load recent cases.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchRecentCases();
    }, [fetchRecentCases])
  );

  const renderRecentCases = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#3A0000" style={{ marginVertical: 20 }} />;
    }
    if (recentCases.length === 0) {
        return <Text style={styles.noCasesText}>No new cases requiring verification.</Text>;
    }
    return recentCases.map((caseItem, index) => (
      <View key={caseItem._id} style={styles.caseCard}>
          <View>
              <Text style={styles.caseName}>{caseItem.person_name}</Text>
              <Text style={styles.caseDetails}>Last seen: {caseItem.last_seen}</Text>
              <Text style={styles.reportedTime}>Reported {formatTimeAgo(caseItem.reported_at)}</Text>
          </View>
          <View style={[styles.statusBadge, index === 0 ? styles.highPriorityBadge : styles.newBadge]}>
              <Text style={styles.statusText}>{index === 0 ? 'High Priority' : 'New'}</Text>
          </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcomeText}>Welcome, {officerName || 'Officer'}</Text>

        <Text style={styles.sectionTitle}>Recent Cases</Text>
        {renderRecentCases()}

        {actionCards.map((card, index) => (
             <TouchableOpacity key={index} style={styles.actionCard} onPress={() => router.push(card.href as any)}>
                <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{card.title}</Text>
                    <Text style={styles.actionDescription}>{card.description}</Text>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push(card.href as any)}>
                        <Text style={styles.actionButtonText}>{card.buttonText}</Text>
                        <Ionicons name={card.iconName as any} size={14} color="#3A0000" />
                    </TouchableOpacity>
                </View>
                <Image source={card.image} style={styles.actionImage} />
            </TouchableOpacity>
        ))}
      </ScrollView>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF8',
  },
  scrollContent: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3A0000',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A0000',
    marginBottom: 10,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E0E0',
  },
  caseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A0000',
  },
  caseDetails: {
    fontSize: 14,
    color: '#A47171',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  highPriorityBadge: {
    backgroundColor: '#FADBD8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A0000',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0E0E0',
    overflow: 'hidden',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A0000',
  },
  actionDescription: {
    fontSize: 14,
    color: '#B94E4E',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#F5EAEA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#3A0000',
    fontWeight: '600',
    marginRight: 6,
  },
  actionImage: {
    width: 90,
    height: 90,
    marginLeft: 15,
  },
});