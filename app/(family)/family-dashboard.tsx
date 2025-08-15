import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Mock Data for the page ---
const activeReports = [
  { 
    id: '1', 
    name: 'Anya Sharma', 
    submitted: '2024-07-20', 
    status: 'Under Review', 
    image: require('@/assets/images/story1.png') // Reusing an existing image
  },
  { 
    id: '2', 
    name: 'Rohan Verma', 
    submitted: '2024-07-15', 
    status: 'Alert Raised', 
    image: require('@/assets/images/story2.png') // Reusing an existing image
  },
];

export default function FamilyDashboardScreen() {
  const router = useRouter();
  // Get the logged-in user's name from the login screen
  const { familyName } = useLocalSearchParams<{ familyName?: string }>();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- Custom Header --- */}
        <View style={styles.header}>
          <View style={styles.headerWelcome}>
            <Image source={require('@/assets/images/frina.png')} style={styles.avatar} />
            <Text style={styles.headerTitle}>Welcome to Drishti</Text>
          </View>
        </View>

        {/* --- Greeting --- */}
        <Text style={styles.greeting}>Hi, {familyName || 'there'} 👋</Text>
        <Text style={styles.subGreeting}>Helping families reunite faster and safer</Text>

        {/* --- Action Buttons --- */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.submitButton} onPress={() => Alert.alert('Navigate', 'Go to Submit Report screen.')}>
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statusButton} onPress={() => router.push('/(family)/status')}>
            <Text style={styles.statusButtonText}>View Status</Text>
          </TouchableOpacity>
        </View>
        
        {/* --- Main Illustration --- */}
        <Image source={require('@/assets/images/familyillustration.png')} style={styles.mainImage} />

        {/* --- Active Reports Section --- */}
        <Text style={styles.sectionTitle}>My Active Reports</Text>
        <View style={styles.reportsContainer}>
          {activeReports.map(report => (
            <TouchableOpacity 
              key={report.id} 
              style={styles.reportCard}
              onPress={() => Alert.alert('View Report', `Viewing details for ${report.name}.`)}
            >
              <Image source={report.image} style={styles.reportImage} />
              <Text style={styles.reportName}>{report.name}</Text>
              <Text style={styles.reportDetails}>Submitted: {report.submitted}</Text>
              <Text style={styles.reportDetails}>Status: {report.status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- Help & Support Section --- */}
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <Text style={styles.helpText}>Need help with reporting?</Text>
        <TouchableOpacity style={styles.contactButton} onPress={() => Alert.alert('Contacting Volunteer', 'Connecting you with a local NGO...')}>
          <Text style={styles.contactButtonText}>Contact Volunteer</Text>
        </TouchableOpacity>
        <Text style={styles.ngoInfo}>Our verified NGOs are here to assist you.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF8' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerWelcome: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#3A0000' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 4 },
  subGreeting: { fontSize: 16, color: '#5B4242', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center'},
  submitButton: { backgroundColor: '#850a0a', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, flex: 1, marginRight: 10 },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  statusButton: { backgroundColor: '#F5EAEA', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, flex: 1, marginLeft: 10 },
  statusButtonText: { color: '#850a0a', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  mainImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 15, marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1E1E', marginTop: 20, marginBottom: 15 },
  reportsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  reportCard: { backgroundColor: '#FFF0E6', borderRadius: 12, padding: 12, width: '48%' },
  reportImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  reportName: { fontSize: 16, fontWeight: 'bold', color: '#3A0000' },
  reportDetails: { fontSize: 13, color: '#B94E4E', marginTop: 2 },
  helpText: { fontSize: 16, color: '#5B4242', marginBottom: 10 },
  contactButton: { backgroundColor: '#F5EAEA', padding: 16, borderRadius: 12, alignItems: 'center' },
  contactButtonText: { color: '#3A0000', fontSize: 16, fontWeight: 'bold' },
  ngoInfo: { fontSize: 13, color: '#B94E4E', textAlign: 'center', marginTop: 10 },
});