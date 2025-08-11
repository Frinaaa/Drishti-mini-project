import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function NgoDashboardScreen({ route }) {
  const ngoName = route?.params?.ngoName || 'NGO Volunteer';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Image source={require('../assets/profile.png')} style={styles.avatar} />
        <Text style={styles.header}>NGO Dashboard</Text>
      </View>
      <Text style={styles.welcome}>Welcome back, {ngoName} 👋</Text>

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Image source={require('../assets/photo.png')} style={styles.overviewImage} />
          <Text style={styles.overviewLabel}>Photos Reviewed Today</Text>
          <Text style={styles.overviewValue}>25</Text>
        </View>
        <View style={styles.overviewCard}>
          <Image source={require('../assets/ai.png')} style={styles.overviewImage} />
          <Text style={styles.overviewLabel}>AI Matches Checked</Text>
          <Text style={styles.overviewValue}>15</Text>
        </View>
        <View style={styles.overviewCard}>
          <Image source={require('../assets/reports.png')} style={styles.overviewImage} />
          <Text style={styles.overviewLabel}>Reports Sent to Police</Text>
          <Text style={styles.overviewValue}>5</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Actions</Text>
      <TouchableOpacity style={styles.actionCard}>
        <Text style={styles.actionText}>Recent Family Uploads</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionCard}>
        <Text style={styles.actionText}>Register Missing Person</Text>
      </TouchableOpacity>

      <View style={styles.howToCard}>
        <Text style={styles.howToTitle}>🛡️ How to Use Dashboard</Text>
        <Text style={styles.howToStep}>Step 1: Review photos sent by families.</Text>
        <Text style={styles.howToStep}>Step 2: Use scan tool to match with AI assistance.</Text>
        <Text style={styles.howToStep}>Step 3: Verify family identity.</Text>
        <Text style={styles.howToStep}>Step 4: Send credible matches to police.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#f5e3e3' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#231815' },
  welcome: { fontSize: 16, color: '#A47171', marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#231815', marginTop: 18, marginBottom: 8 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  overviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', width: 110, elevation: 2 },
  overviewImage: { width: 40, height: 40, marginBottom: 6, borderRadius: 8, backgroundColor: '#e0e0e0' },
  overviewLabel: { fontSize: 12, color: '#231815', textAlign: 'center', marginBottom: 2 },
  overviewValue: { fontSize: 16, fontWeight: 'bold', color: '#850a0a' },
  actionCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1 },
  actionText: { fontWeight: 'bold', color: '#231815', fontSize: 15 },
  howToCard: { backgroundColor: '#f5e3e3', borderRadius: 8, padding: 12, marginTop: 14 },
  howToTitle: { fontWeight: 'bold', color: '#850a0a', marginBottom: 6 },
  howToStep: { color: '#A47171', fontSize: 13, marginBottom: 2 }
});