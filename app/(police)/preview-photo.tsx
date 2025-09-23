import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PreviewPhotoScreen() {
    const { photoUri, gender } = useLocalSearchParams<{ photoUri: string; gender: string }>();
    const router = useRouter();

    const handleContinueSearch = () => {
        router.push({
            pathname: '/(police)/scanning-face',
            params: { photoUri, gender },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Preview Photo</Text>
            </View>

            <View style={styles.imageContainer}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.image} />}
            </View>

            <View style={styles.infoBox}>
                 <Text style={styles.infoPercentage}>100%</Text>
                <Text style={styles.infoText}>Scroll up to zoom in, scroll down to zoom out</Text>
                <Text style={styles.infoText}>Drag to reposition the zoomed image within its container</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.retakeButton} onPress={() => router.back()}>
                    <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinueSearch}>
                    <Text style={styles.continueButtonText}>Continue Search</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginLeft: 15 },
    imageContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
    image: { width: '100%', height: '100%', resizeMode: 'contain' },
    infoBox: { padding: 15, backgroundColor: '#F5EAEA', borderRadius: 10, marginBottom: 30 },
    infoPercentage: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#3A0000' },
    infoText: { textAlign: 'center', color: '#5B4242', fontSize: 14, lineHeight: 20 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    retakeButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center', marginRight: 10 },
    retakeButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
    continueButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: '#8B0000', alignItems: 'center', marginLeft: 10 },
    continueButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});