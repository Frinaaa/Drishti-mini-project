import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Using the recommended path alias for robust imports
import { BACKEND_API_URL } from '@/config/api'; 

// --- Static Data ---
const overviewData = [
    { title: "Photos Reviewed Today", value: "25", icon: "image-outline" as const },
    { title: "AI Matches Checked", value: "15", icon: "git-compare-outline" as const },
    { title: "Reports Sent to Police", value: "5", icon: "send-outline" as const },
];
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
                            <Ionicons name={item.icon} size={30} color="#850a0a" />
                            <Text style={styles.overviewTitle}>{item.title}</Text>
                            <Text style={styles.overviewValue}>{item.value}</Text>
                        </View>
                    ))}
                </View>
                
                {/* --- Actions Section --- */}
                <Text style={styles.sectionTitle}>Actions</Text>

                {/* The new action button to submit a request to the police */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/(ngo)/submit-request')}
                >
                    <Ionicons name="shield-checkmark-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Submit Request to Police</Text>
                </TouchableOpacity>

                {/* CORRECTED PATH: Navigation now correctly includes the '(ngo)' group segment. */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/(ngo)/recent-uploads')}
                >
                    <Ionicons name="images-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Recent Family Uploads</Text>
                </TouchableOpacity>
                
                {/* CORRECTED PATH: Navigation now correctly includes the '(ngo)' group segment. */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/(ngo)/submit-reports')}
                >
                    <Ionicons name="person-add-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Register Missing Person</Text>
                </TouchableOpacity>

                {/* --- How to Use Dashboard Section --- */}
                <TouchableOpacity 
                  style={styles.howToContainer} 
                  onPress={() => setInstructionsVisible(!instructionsVisible)}
                  activeOpacity={0.8}
                >
                    <View style={styles.howToHeader}>
                        <Ionicons name="shield-checkmark-outline" size={22} color="#3A0000" />
                        <Text style={styles.howToTitle}>How to Use Dashboard</Text>
                        <Ionicons 
                          name={instructionsVisible ? 'chevron-up-outline' : 'chevron-down-outline'} 
                          size={22} 
                          color="#3A0000" 
                        />
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
});