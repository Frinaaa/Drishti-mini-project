import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

const volunteerContact = {
  name: 'Asiya',
  PhoneNumber: '9746887331',
};

export default function FamilyDashboardScreen() {
  const router = useRouter();
  
  const [modalVisible, setModalVisible] = useState(false);
  
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) {
            router.replace('/(auth)/family-login');
            return;
          }

          // Fetch user data for the welcome message
          const userResponse = await fetch(`${BACKEND_API_URL}/api/users/${userId}`);
          const userData = await userResponse.json();
          if (userResponse.ok) {
            setUser(userData.user);
          } else {
            throw new Error('Failed to fetch user data');
          }
          
          // Fetch the user's active ("Verified") reports
          const reportsResponse = await fetch(`${BACKEND_API_URL}/api/reports/user/${userId}`);
          const reportsData = await reportsResponse.json();
          
          if (reportsResponse.ok) {
            setReports(reportsData);
          } else {
            console.error("Failed to fetch reports:", reportsData.message);
            setReports([]);
          }

        } catch (error) {
          Alert.alert('Error', 'Could not load dashboard data. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#850a0a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Contact Details</Text>
            <Text style={styles.modalText}>Name: {volunteerContact.name}</Text>
            <Text style={styles.modalText}>PhoneNumber: {volunteerContact.PhoneNumber}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerWelcome}>
            <Text style={styles.headerTitle}>Welcome to Drishti</Text>
          </View>
        </View>

        <Text style={styles.greeting}>Hi, {user?.name || 'there'} 👋</Text>
        <Text style={styles.subGreeting}>Helping families reunite faster and safer</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={() => router.push('/(family)/submit-report')}
          >
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
        
        <Image 
          source={require('@/assets/images/familyillustration.png')} 
          style={styles.mainImage} 
        />

        <Text style={styles.sectionTitle}>My Active Reports</Text>
        
        {reports.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.reportsContainer}>
            
{reports.map((report) => (
  <TouchableOpacity 
    key={report._id} 
    style={styles.reportCard}
  >
    <Image 
      source={{ uri: `${BACKEND_API_URL}/${report.photo_url}` }} 
      style={styles.reportImage} 
    />
    <Text style={styles.reportName}>{report.person_name}</Text>
    <Text style={styles.reportDetails}>{`Age: ${report.age}, Gender: ${report.gender}`}</Text>
    
    {/* --- LOGIC FIX: Display the status for each report --- */}
    <Text style={styles.reportDetails}>Status: {report.status}</Text>

  </TouchableOpacity>
))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="document-text-outline" size={40} color="#A47171" />
            <Text style={styles.placeholderText}>You have no active reports right now.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Help & Support</Text>
        <Text style={styles.helpText}>Need help with reporting?</Text>
        <TouchableOpacity style={styles.contactButton} onPress={() => setModalVisible(true)}>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#3A0000' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 4 },
  subGreeting: { fontSize: 16, color: '#5B4242', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center'},
  submitButton: { backgroundColor: '#850a0a', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, flex: 1 },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  mainImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 15, marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1E1E', marginTop: 20, marginBottom: 15 },
  reportsContainer: { flexDirection: 'row', justifyContent: 'flex-start' },
  reportCard: { 
    backgroundColor: '#F5EAEA', 
    borderRadius: 12, 
    padding: 12, 
    width: 160,
    marginRight: 15,
  },
  reportImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  reportName: { fontSize: 16, fontWeight: 'bold', color: '#3A0000' },
  reportDetails: { fontSize: 13, color: '#B94E4E', marginTop: 2 },
  helpText: { fontSize: 16, color: '#5B4242', marginBottom: 10 },
  contactButton: { backgroundColor: '#F5EAEA', padding: 16, borderRadius: 12, alignItems: 'center' },
  contactButtonText: { color: '#3A0000', fontSize: 16, fontWeight: 'bold' },
  ngoInfo: { fontSize: 13, color: '#B94E4E', textAlign: 'center', marginTop: 10 },
  modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { marginBottom: 15, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#3A0000' },
  modalText: { marginBottom: 10, textAlign: 'center', fontSize: 16, color: '#1E1E1E' },
  modalButton: { backgroundColor: '#850a0a', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, elevation: 2, marginTop: 15 },
  modalButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  placeholderContainer: { backgroundColor: '#F5EAEA', borderRadius: 12, padding: 20, alignItems: 'center', justifyContent: 'center', height: 150, },
  placeholderText: { fontSize: 16, color: '#A47171', textAlign: 'center', marginTop: 10, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF8' },
});