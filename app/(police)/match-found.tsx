import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AI_API_URL } from '../../config/api';

const parseParams = (params: any) => ({
    ...params,
    age: params.age ? parseInt(params.age, 10) : 'N/A',
    confidence: params.confidence ? parseFloat(params.confidence) : 0,
});

export default function MatchFoundScreen() {
    const params = parseParams(useLocalSearchParams());
    const router = useRouter();

    const confidencePercentage = (params.confidence * 100).toFixed(0);
    const detectionDate = new Date().toISOString().split('T')[0];
    const detectionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const handleConfirm = () => {
        Alert.alert("Match Confirmed", "Relevant authorities will be notified.");
        router.push('/(police)/police-dashboard');
    }

    const handleReject = () => {
        Alert.alert("Match Rejected", "Thank you. Your feedback will improve the system.");
        router.push('/(police)/police-dashboard');
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(police)/police-dashboard')}>
                    
                </TouchableOpacity>
                <Text style={styles.title}>Match Found Alert</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Potential Match Detected!</Text>
                <Text style={styles.cardSubtitle}>Review the match details below and respond quickly.</Text>

                <View style={styles.matchDetailsContainer}>
                    <View style={styles.detailsTextContainer}>
                        <DetailItem label="Name" value={params.person_name || 'Unknown'} />
                        <DetailItem label="Approx. Age" value={params.age} />
                        <DetailItem label="Gender" value={params.gender} />
                        <DetailItem label="Match Confidence" value={`${confidencePercentage}%`} />
                        <DetailItem label="Last Seen Location" value={params.last_seen || 'Not specified'} />
                        <DetailItem label="Date/Time of Detection" value={`${detectionDate} ${detectionTime}`} />
                    </View>
                    <Image
                        source={{ uri: `${AI_API_URL}/${params.file_path}` }}
                        style={styles.matchedImage}
                    />
                </View>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                    <Text style={styles.buttonText}>Confirm Match</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                    <Text style={styles.rejectButtonText}>Reject Match</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Text style={styles.historyLink}>View Match History</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const DetailItem = ({ label, value }: { label: string, value: any }) => (
    <>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8' },
    header: { flexDirection: 'row', alignItems: 'center', marginTop: 50, paddingHorizontal: 20, marginBottom: 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15 },
    card: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 15, elevation: 5 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
    matchDetailsContainer: { flexDirection: 'row', marginBottom: 20 },
    detailsTextContainer: { flex: 1 },
    detailLabel: { fontSize: 14, color: '#888', marginTop: 8 },
    detailValue: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
    matchedImage: { width: 100, height: 120, borderRadius: 10, marginLeft: 15, backgroundColor: '#eee' },
    confirmButton: { backgroundColor: '#8B0000', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    rejectButton: { backgroundColor: '#f0f0f0', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    rejectButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
    historyLink: { color: '#8B0000', textAlign: 'center', fontWeight: '500', fontSize: 15, textDecorationLine: 'underline' },
});