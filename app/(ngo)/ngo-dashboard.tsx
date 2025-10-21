import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- IMPORT AsyncStorage

// --- Static Data (Only for the "How to" section) ---
const howToSteps = [
    "Step 1: Review photos sent by families.",
    "Step 2: Use scan tool to match with AI assistance.",
    "Step 3: Verify family identity.",
    "Step 4: Send credible matches to police.",
];

export default function NgoDashboardScreen() {
    const { ngoName } = useLocalSearchParams<{ ngoName?: string }>();
    const router = useRouter();
    const [instructionsVisible, setInstructionsVisible] = useState(false);

    // --- STATE FOR LIVE DATA ---
    const [stats, setStats] = useState({
        photosReviewedToday: 0,
        aiMatchesChecked: 0,
        reportsSent: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- DATA FETCHING LOGIC ---
    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                // 1. Get the authentication token from storage
                const authToken = await AsyncStorage.getItem('userToken');

                if (!authToken) {
                    throw new Error("Authentication token not found. Please log in again.");
                }

                // 2. Make the API call with the Authorization header
                const response = await fetch('http://localhost:5000/api/ngo/dashboard-stats', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}` // <-- This is the crucial part
                    }
                });

                if (!response.ok) {
                    // This will handle errors like 401 Unauthorized if the token is bad
                    throw new Error(`Server responded with an error: ${response.status}`);
                }

                const data = await response.json();
                setStats(data); // Update the state with the real, per-NGO numbers
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardStats();
    }, []); // Empty array ensures this runs only once when the screen loads

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.pageTitle}>NGO Dashboard</Text>
                <Text style={styles.welcomeText}>Welcome back, {ngoName || 'Volunteer'} 👋</Text>

                {/* --- Overview Section --- */}
                <Text style={styles.sectionTitle}>Overview</Text>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#850a0a" style={{ marginVertical: 40 }} />
                ) : error ? (
                    <Text style={styles.errorText}>Could not load dashboard data. {error}</Text>
                ) : (
                    <View style={styles.overviewContainer}>
                        <View style={styles.overviewCard}>
                            <Ionicons name="image-outline" size={30} color="#850a0a" />
                            <Text style={styles.overviewTitle}>Photos Reviewed Today</Text>
                            <Text style={styles.overviewValue}>{stats.photosReviewedToday}</Text>
                        </View>
                        <View style={styles.overviewCard}>
                            <Ionicons name="git-compare-outline" size={30} color="#850a0a" />
                            <Text style={styles.overviewTitle}>AI Matches Checked</Text>
                            <Text style={styles.overviewValue}>{stats.aiMatchesChecked}</Text>
                        </View>
                         <View style={styles.overviewCard}>
                            <Ionicons name="shield-checkmark-outline" size={30} color="#850a0a" />
                            <Text style={styles.overviewTitle}>Total Verified Reports</Text> {/* <-- UPDATED LABEL */}
                            <Text style={styles.overviewValue}>{stats.reportsSent}</Text>
                        </View>
                    </View>
                )}
                
                {/* --- The rest of your component remains the same --- */}
                <Text style={styles.sectionTitle}>Actions</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/recent-uploads')}>
                    <Ionicons name="images-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Recent Family Uploads</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/submit-reports')}>
                    <Ionicons name="person-add-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Register Missing Person</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.howToContainer} onPress={() => setInstructionsVisible(!instructionsVisible)} activeOpacity={0.8}>
                    <View style={styles.howToHeader}>
                        <Ionicons name="shield-checkmark-outline" size={22} color="#3A0000" />
                        <Text style={styles.howToTitle}>How to Use Dashboard</Text>
                        <Ionicons name={instructionsVisible ? 'chevron-up-outline' : 'chevron-down-outline'} size={22} color="#3A0000" />
                    </View>
                    {instructionsVisible && (
                        <View style={styles.howToContent}>
                            {howToSteps.map((step, index) => (
                                <Text key={index} style={styles.howToStep}>{step}</Text>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    scrollContent: { padding: 20, paddingBottom: 80 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 8 },
    welcomeText: { fontSize: 16, color: '#B94E4E', marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 15 },
    overviewContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    overviewCard: { backgroundColor: '#F5EAEA', borderRadius: 12, padding: 15, alignItems: 'center', width: '32%', minHeight: 130 },
    overviewTitle: { color: '#3A0000', fontWeight: '600', textAlign: 'center', marginTop: 8, fontSize: 13 },
    overviewValue: { color: '#1E1E1E', fontWeight: 'bold', fontSize: 24, marginTop: 4 },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 10, padding: 16, marginBottom: 10 },
    actionButtonText: { fontSize: 16, fontWeight: '600', color: '#3A0000', marginLeft: 12 },
    howToContainer: { backgroundColor: '#F5EAEA', borderRadius: 12, padding: 16, marginTop: 20 },
    howToHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    howToTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#3A0000', marginLeft: 10 },
    howToContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E4C4C4', paddingTop: 12 },
    howToStep: { fontSize: 14, color: '#5B4242', lineHeight: 20, marginBottom: 4 },
    errorText: { color: '#B94E4E', textAlign: 'center', marginVertical: 40, fontSize: 16, },
});