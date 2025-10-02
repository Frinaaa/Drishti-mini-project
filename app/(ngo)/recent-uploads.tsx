import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

export default function RecentUploadsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]); // Use a more specific type if available
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // [VERIFIED] This function correctly fetches the NGO's PIN code and sends it to the backend.
    const fetchReports = async () => {
        try {
            // Step 1: Get the stored NGO's PIN code from async storage.
            const ngoPinCode = await AsyncStorage.getItem('userPinCode');

            if (!ngoPinCode) {
                // This is a good safeguard. It handles cases where the user isn't a logged-in NGO.
                throw new Error('User PIN Code not found. Please log in again.');
            }

            // Step 2: Construct the API URL with the pinCode as a query parameter.
            // This is the key part that tells the backend how to filter.
            const apiUrl = `${BACKEND_API_URL}/api/reports?pinCode=${ngoPinCode}`;
            
            const response = await fetch(apiUrl); 
            const data = await response.json();

            if (response.ok) {
                setReports(data);
            } else {
                // Correctly handles errors sent from the backend.
                throw new Error(data.msg || 'Failed to fetch reports');
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            // Correctly displays an error to the user.
            Alert.alert('Error', (error instanceof Error) ? error.message : 'Could not load recent uploads.');
            setReports([]); // Correctly clears old data on error.
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // [VERIFIED] This hook correctly calls fetchReports whenever the screen is focused.
    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchReports();
        }, [])
    );

    // [VERIFIED] This function correctly handles the "pull-to-refresh" action.
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReports();
    }, []);

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#850a0a" /></View>;
    }

    // [VERIFIED] The JSX correctly maps over the fetched reports and displays them.
    return (
        <>
            <Stack.Screen options={{ title: 'Recent Missing Person Reports', headerShown: true }} />
            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {reports.length > 0 ? (
                    reports.map(report => (
                        <TouchableOpacity 
                            key={report._id} 
                            style={styles.reportCard}
                            onPress={() => router.push({ pathname: '/(ngo)/report-detail', params: { reportId: report._id } })}
                        >
                            <Image 
                                source={report.photo_url ? { uri: `${BACKEND_API_URL}/${report.photo_url}` } : require('@/assets/images/story1.png')} 
                                style={styles.reportImage} 
                            />
                            <View style={styles.reportDetails}>
                                <Text style={styles.reportName}>{report.person_name}, {report.age}</Text>
                                <Text style={styles.detailText}>Status: {report.status}</Text>
                                <Text style={styles.detailText}>
                                    Reported by: {report.user ? report.user.name : 'Unknown'}
                                </Text>
                                <Text style={styles.detailText}>Submitted: {new Date(report.reported_at).toLocaleDateString()}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={60} color="#A47171" />
                        {/* The empty state message is specific and helpful. */}
                        <Text style={styles.emptyText}>No reports found for your PIN code.</Text>
                        <Text style={styles.subEmptyText}>Pull down to refresh.</Text>
                    </View>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#A47171', fontWeight: '600' },
    subEmptyText: { marginTop: 5, fontSize: 14, color: '#A47171' },
    reportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 15,
        marginVertical: 8,
        flexDirection: 'row',
        padding: 10,
        borderWidth: 1,
        borderColor: '#F0E0E0',
        elevation: 1,
        shadowColor: '#000',
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