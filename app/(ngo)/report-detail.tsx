import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../config/api';
import CustomButton from '../../components/CustomButton';

export default function ReportDetailScreen() {
    const { reportId } = useLocalSearchParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (!reportId) return;
            try {
                const response = await fetch(`${BACKEND_API_URL}/api/reports/${reportId}`);
                const data = await response.json();
                if (response.ok) {
                    setReport(data);
                } else {
                    throw new Error('Failed to fetch report');
                }
            } catch (error) {
                Alert.alert('Error', 'Could not load report details.');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [reportId]);

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    if (!report) {
        return <View style={styles.centered}><Text>Report not found.</Text></View>;
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Report Details', headerShown: true }} />
            <ScrollView style={styles.container}>
                {/* --- START OF CHANGES --- */}
                {/* Use report.photo_url for the image source, with a fallback */}
                <Image 
                    source={report.photo_url ? { uri: report.photo_url } : require('@/assets/images/story1.png')} 
                    style={styles.reportImage} 
                />
                {/* --- END OF CHANGES --- */}
                <View style={styles.content}>
                    <Text style={styles.name}>{report.person_name}, {report.age}</Text>
                    <Text style={styles.status}>Status: {report.status}</Text>
                    
                    <Text style={styles.sectionHeader}>Missing Person Details</Text>
                    <View style={styles.infoBox}>
                        <InfoRow icon="male-female-outline" label="Gender" value={report.gender} />
                        <InfoRow icon="location-outline" label="Last Seen" value={report.last_seen} />
                        <InfoRow icon="reader-outline" label="Description" value={report.description || 'No description provided.'} />
                    </View>

                    <Text style={styles.sectionHeader}>Reporter Information</Text>
                    <View style={styles.infoBox}>
                        <InfoRow icon="person-outline" label="Submitted By" value={report.user?.name || 'N/A'} />
                        <InfoRow icon="mail-outline" label="Contact Email" value={report.user?.email || 'N/A'} />
                        <InfoRow icon="call-outline" label="Contact Phone" value={report.reporterContact || 'N/A'} />
                        <InfoRow icon="people-circle-outline" label="Relation" value={report.relationToReporter || 'N/A'} />
                        <InfoRow icon="calendar-outline" label="Submitted On" value={new Date(report.reported_at).toDateString()} />
                    </View>

                    <View style={styles.actionContainer}>
                        <CustomButton title="Verify Report" onPress={() => Alert.alert("Verify", "Mark this report as verified?")} />
                        <CustomButton title="Reject Report" onPress={() => Alert.alert("Reject", "Are you sure you want to reject this report?")} style={{backgroundColor: '#dc3545'}} />
                    </View>
                </View>
            </ScrollView>
        </>
    );
}

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon} size={20} color="#850a0a" style={styles.icon} />
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    reportImage: { width: '100%', height: 300 },
    name: { fontSize: 26, fontWeight: 'bold', color: '#3A0000', marginBottom: 5 },
    status: { fontSize: 16, color: '#B94E4E', marginBottom: 20, fontStyle: 'italic' },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#3A0000', marginTop: 15, marginBottom: 10 },
    infoBox: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#F0E0E0' },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
    icon: { marginRight: 15, width: 20 },
    infoLabel: { fontSize: 16, fontWeight: '600', color: '#3A0000' },
    infoValue: { fontSize: 16, color: '#5B4242', flex: 1, textAlign: 'right', marginLeft: 10, flexWrap: 'wrap' },
    actionContainer: { marginTop: 30, paddingBottom: 20 },
});