import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_API_URL } from '../../config/api';

export default function RecentUploadsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReports = async () => {
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/reports/family`);
            const data = await response.json();
            if (response.ok) {
                setReports(data);
            } else {
                throw new Error('Failed to fetch reports');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not load recent uploads.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchReports();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReports();
    }, []);

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Recent Family Uploads', headerShown: true }} />
            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }} // This ensures the "empty" view can be centered vertically
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {reports.length > 0 ? (
                    reports.map(report => (
                        <TouchableOpacity 
                            key={report._id} 
                            style={styles.reportCard}
                            onPress={() => router.push({ pathname: '/(ngo)/report-detail', params: { reportId: report._id } })}
                        >
                            <Image source={require('@/assets/images/story1.png')} style={styles.reportImage} />
                            <View style={styles.reportDetails}>
                                <Text style={styles.reportName}>{report.person_name}, {report.age}</Text>
                                <Text style={styles.detailText}>Status: {report.status}</Text>
                                <Text style={styles.detailText}>Reported by: {report.user.name}</Text>
                                <Text style={styles.detailText}>Submitted: {new Date(report.reported_at).toLocaleDateString()}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={60} color="#A47171" />
                        <Text style={styles.emptyText}>No new family reports at this time.</Text>
                    </View>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171' },
    reportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 15,
        marginVertical: 8,
        flexDirection: 'row',
        padding: 10,
        borderWidth: 1,
        borderColor: '#F0E0E0',
        elevation: 1, // Subtle shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    reportImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    reportDetails: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    reportName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3A0000',
    },
    detailText: {
        fontSize: 14,
        color: '#5B4242',
        marginTop: 4,
    },
});