import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const overviewData = [ /* ... unchanged ... */ ];
const howToSteps = [ /* ... unchanged ... */ ];

export default function NgoDashboardScreen() {
    const { ngoName } = useLocalSearchParams<{ ngoName?: string }>();
    const router = useRouter();
    const [instructionsVisible, setInstructionsVisible] = useState(false);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.pageTitle}>NGO Dashboard</Text>
                <Text style={styles.welcomeText}>Welcome back, {ngoName || 'Volunteer'} 👋</Text>

                {/* --- Overview Section (Unchanged) --- */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.overviewContainer}>
                    {/* ... unchanged mapping ... */}
                </View>
                
                {/* --- Actions Section (UPDATED) --- */}
                <Text style={styles.sectionTitle}>Actions</Text>

                {/* 
                  ==================================================================
                  REMOVED: The "Submit Request to Police" button has been
                  deleted from this file. That action is now handled by the
                  public-facing screen in the (auth) group.
                  ==================================================================
                */}

                {/* Your other action buttons remain */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/(ngo)/recent-uploads')}
                >
                    <Ionicons name="images-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Recent Family Uploads</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/(ngo)/submit-reports')}
                >
                    <Ionicons name="person-add-outline" size={22} color="#3A0000" />
                    <Text style={styles.actionButtonText}>Register Missing Person</Text>
                </TouchableOpacity>

                {/* --- How to Use Dashboard Section (Unchanged) --- */}
                <TouchableOpacity 
                  style={styles.howToContainer} 
                  onPress={() => setInstructionsVisible(!instructionsVisible)}
                  activeOpacity={0.8}
                >
                   {/* ... unchanged content ... */}
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