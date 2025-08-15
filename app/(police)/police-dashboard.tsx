import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Data for the page ---
const recentCases = [
  { id: '1', name: 'Rohan Sharma', status: 'High Priority', lastSeen: 'Park Street, 2 days ago' },
  { id: '2', name: 'Anjali Verma', status: 'New', lastSeen: 'City Mall, 8 hours ago' },
];

const actionCards = [
    { title: 'View Statistics', description: 'Access comprehensive statistics on missing persons cases.', buttonText: 'View', iconName: 'stats-chart', image: require('@/assets/images/statistics.png'), href: '/statistics' },
    { title: 'Monitor Reports', description: 'Track and manage ongoing missing person reports in your jurisdiction.', buttonText: 'Monitor', iconName: 'document-text', image: require('@/assets/images/reports.png'), href: '/reports' },
]

export default function PoliceDashboardScreen() {
  const router = useRouter();
  const { officerName } = useLocalSearchParams<{ officerName?: string }>();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcomeText}>Welcome, {officerName || 'Officer'}</Text>

        {/* --- Recent Cases Section --- */}
        <Text style={styles.sectionTitle}>Recent Cases</Text>
        <View>
            {recentCases.map(caseItem => (
                <TouchableOpacity key={caseItem.id} style={styles.caseCard} onPress={() => router.push('/reports')}>
                    <View>
                        <Text style={styles.caseName}>{caseItem.name}</Text>
                        <Text style={styles.caseDetails}>Last seen: {caseItem.lastSeen}</Text>
                    </View>
                    <View style={[styles.statusBadge, caseItem.status === 'High Priority' && styles.highPriorityBadge]}>
                        <Text style={styles.statusText}>{caseItem.status}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>

        {/* --- Action Cards Section --- */}
        {actionCards.map((card, index) => (
             <TouchableOpacity key={index} style={styles.actionCard} onPress={() => router.push(card.href as any)}>
                <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{card.title}</Text>
                    <Text style={styles.actionDescription}>{card.description}</Text>
                    <View style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>{card.buttonText}</Text>
                        <Ionicons name={card.iconName as any} size={14} color="#3A0000" />
                    </View>
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