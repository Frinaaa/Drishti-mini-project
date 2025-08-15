import React from 'react'; // Removed useState as it's no longer needed
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// --- Data for the page (remains the same) ---
const overviewData = [
    { title: "Photos Reviewed Today", value: "25", icon: "image-outline" },
    { title: "AI Matches Checked", value: "15", icon: "git-compare-outline" },
    { title: "Reports Sent to Police", value: "5", icon: "send-outline" },
];
// REMOVED: The howToSteps array is no longer needed.

export default function NgoDashboardScreen() {
    const { ngoName } = useLocalSearchParams<{ ngoName?: string }>();
    // REMOVED: The instructionsVisible state is no longer needed.

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.pageTitle}>NGO Dashboard</Text>
                <Text style={styles.welcomeText}>Welcome back, {ngoName || 'Volunteer'} 👋</Text>

                {/* --- Overview Section --- */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.overviewContainer}>
                    {overviewData.map((item, index) => (
                        <View key={index} style={styles.overviewCard}>
                            <Ionicons name={item.icon as any} size={30} color="#850a0a" />
                            <Text style={styles.overviewTitle}>{item.title}</Text>
                            <Text style={styles.overviewValue}>{item.value}</Text>
                        </View>
                    ))}
                </View>
                
                {/* --- Actions Section --- */}
                <Text style={styles.sectionTitle}>Actions</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert("Action", "Viewing recent family uploads.")}>
                    <Ionicons name="images-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Recent Family Uploads</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert("Action", "Opening form to register missing person.")}>
                    <Ionicons name="person-add-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Register Missing Person</Text>
                </TouchableOpacity>

                {/* --- REMOVED: The entire "How to Use Dashboard" section has been deleted. --- */}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    scrollContent: { padding: 20 },
    // ADDED: Styles for the new title and adjusted welcome text
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 8 },
    welcomeText: { fontSize: 16, color: '#B94E4E', marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 15 },
    overviewContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    overviewCard: { backgroundColor: '#F5EAEA', borderRadius: 12, padding: 15, alignItems: 'center', width: '32%', minHeight: 130 },
    overviewTitle: { color: '#3A0000', fontWeight: '600', textAlign: 'center', marginTop: 8, fontSize: 13 },
    overviewValue: { color: '#1E1E1E', fontWeight: 'bold', fontSize: 24, marginTop: 4 },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0E0', borderRadius: 10, padding: 16, marginBottom: 10 },
    actionButtonText: { fontSize: 16, fontWeight: '600', color: '#3A0000', marginLeft: 12 },
    // REMOVED: All 'howTo' styles are now gone.
});