import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Progress from 'react-native-progress';
import { AI_API_URL } from '../../config/api'; // Ensure this path is correct

export default function ScanningFaceScreen() {
    const { photoUri, gender } = useLocalSearchParams<{ photoUri: string; gender: string }>();
    const router = useRouter();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => (prev < 0.9 ? prev + 0.15 : 0.9));
        }, 200);

        const timer = setTimeout(handleSearch, 500);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, []);

    const handleSearch = async () => {
        if (!photoUri) return;
        try {
            const base64 = await convertImageToBase64(photoUri);
            const apiResponse = await fetch(`${AI_API_URL}/find_match_react_native`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ file_data: base64 }).toString(),
            });

            const result = await apiResponse.json();
            setProgress(1);

            if (!apiResponse.ok) {
                throw new Error(result.detail || `Server error: ${apiResponse.status}`);
            }

            if (result.match_found) {
                router.replace({
                    pathname: '/(police)/match-found',
                    params: { ...result, searchedPhotoUri: photoUri },
                });
            } else {
                Alert.alert('No Match Found', result.message || 'This person is not in the missing persons database.',
                    [{ text: 'OK', onPress: () => router.push('/(police)/police-dashboard') }]
                );
                // Optional: Store the unmatched photo in the backend
                // await fetch(`${AI_API_URL}/store_unmatched_face`, { ... });
            }
        } catch (e) {
            const errorMessage = (e instanceof Error) ? e.message : 'An unknown error occurred.';
            Alert.alert('Search Failed', `Could not connect to the AI server: ${errorMessage}`,
                [{ text: 'Try Again', onPress: () => router.back() }]
            );
        }
    };

    const convertImageToBase64 = async (uri: string): Promise<string> => {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.scanContainer}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.image} />}
                <View style={styles.overlay}>
                    <View style={styles.scanBox} />
                </View>
            </View>

            <Text style={styles.statusText}>Scanning Face...</Text>
            <Text style={styles.waitText}>Please Wait</Text>

            <Progress.Bar
                progress={progress}
                width={null}
                height={8}
                color={'#000'}
                unfilledColor={'#e0e0e0'}
                borderWidth={0}
                style={styles.progressBar}
            />
            <Text style={styles.progressText}>{`${Math.round(progress * 100)}%`}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EBEB', padding: 40 },
    scanContainer: { width: 250, height: 250, borderRadius: 15, overflow: 'hidden', marginBottom: 30 },
    image: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanBox: { width: '85%', height: '85%', borderWidth: 4, borderColor: '#00e676', borderRadius: 10 },
    statusText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    waitText: { fontSize: 16, color: '#666', marginTop: 8, marginBottom: 30 },
    progressBar: { width: '100%', borderRadius: 4 },
    progressText: { marginTop: 10, fontSize: 14, color: '#333' },
});