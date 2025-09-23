import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from './components/CustomButton'; // Assuming you have a custom button component

export default function FaceSearchScreen() {
    const [gender, setGender] = useState<string>('Female');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [facing, setFacing] = useState<'front' | 'back'>('back');
    const [isCapturing, setIsCapturing] = useState(false);
    const cameraRef = useRef<CameraView | null>(null);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleTakePhoto = async () => {
        if (!cameraRef.current || isCapturing) return;
        setIsCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            router.push({
                pathname: '/(police)/preview-photo',
                params: { photoUri: photo.uri, gender },
            });
        } catch (e) {
            Alert.alert("Capture Error", "Could not capture photo. Please try again.");
        } finally {
            setIsCapturing(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.centerContainer}><Text>No access to camera.</Text></View>;
    }

    return (
        <View style={styles.container}>
            
            <Text style={styles.title}>Search by Face</Text>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                        key={g}
                        style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                        onPress={() => setGender(g)}>
                        <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.cameraOuterContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing={facing} ratio="1:1" />
            </View>
            
            {/* The "Upload Photo" button is not needed with the live camera, but you can add it back if you want both options */}
            
            <View style={styles.footer}>
                <TouchableOpacity style={styles.searchButton} onPress={handleTakePhoto}>
                    <Text style={styles.searchButtonText}>Capture Photo</Text>
                </TouchableOpacity>
                 <TouchableOpacity style={styles.flipButton} onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
                    <Ionicons name="camera-reverse-outline" size={28} color="#3A0000" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF8', paddingHorizontal: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginTop: 50, marginBottom: 10 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#3A0000', marginBottom: 20 },
    label: { fontSize: 16, color: '#5B4242', marginBottom: 10 },
    genderContainer: { flexDirection: 'row', marginBottom: 20 },
    genderButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#F5EAEA', marginRight: 10 },
    genderButtonSelected: { backgroundColor: '#3A0000' },
    genderText: { color: '#5B4242' },
    genderTextSelected: { color: '#FFF' },
    cameraOuterContainer: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E4C4C4',
        marginBottom: 20,
        backgroundColor: '#000',
    },
    camera: { flex: 1 },
    footer: {
        paddingBottom: 30,
        alignItems: 'center'
    },
    searchButton: {
        backgroundColor: '#8B0000',
        paddingVertical: 18,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
    },
    searchButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    flipButton: {
        marginTop: 15,
    }
});