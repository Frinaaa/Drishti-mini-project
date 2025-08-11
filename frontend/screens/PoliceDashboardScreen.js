import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function PoliceDashboardScreen({ route }) {
  const officerName = route?.params?.officerName || 'Officer';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dashboard</Text>
      <Text style={styles.welcome}>Welcome, {officerName}</Text>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>View Statistics</Text>
            <Text style={styles.cardDesc}>
              Access comprehensive statistics on missing persons cases.
            </Text>
            <TouchableOpacity style={styles.cardButton}>
              <Text style={styles.cardButtonText}>View 📈</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={require('../assets/statistics.png')}
            style={styles.cardImage}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Monitor Reports</Text>
            <Text style={styles.cardDesc}>
              Track and manage ongoing missing person reports in your jurisdiction.
            </Text>
            <TouchableOpacity style={styles.cardButton}>
              <Text style={styles.cardButtonText}>Monitor 📋</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={require('../assets/reports.png')}
            style={styles.cardImage}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcf7f7', padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 16, marginBottom: 8, color: '#231815' },
  welcome: { fontSize: 22, fontWeight: 'bold', marginVertical: 18, color: '#231815' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 18, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#850a0a', marginBottom: 4 },
  cardDesc: { color: '#A47171', marginBottom: 10 },
  cardButton: { backgroundColor: '#fcf7f7', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 6 },
  cardButtonText: { color: '#850a0a', fontWeight: 'bold' },
  cardImage: { width: 80, height: 80, marginLeft: 12, borderRadius: 8, backgroundColor: '#e0e0e0' },
});