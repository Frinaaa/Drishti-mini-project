import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import { AI_API_URL } from '../../config/api'; // Ensure this path is correct

// Define the structure for the API match result
interface MatchResult {
    match_found: boolean;
    report_id?: string;
    confidence?: number;
    message?: string;
    person_name?: string;
    age?: number;
    gender?: string;
    last_seen?: string;
    file_path?: string;
    detail?: string; // To catch error messages from FastAPI
}

// Define the different states our screen can be in
type ScreenState = 'camera' | 'preview' | 'scanning' | 'matchFound';

export default function FaceSearchFlowScreen() {
    // --- STATE MANAGEMENT (No Changes Here) ---
    const [screenState, setScreenState] = useState<ScreenState>('camera');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [gender, setGender] = useState<string>('Female');
    const [facing, setFacing] = useState<'front' | 'back'>('back');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [progress, setProgress] = useState(0);

    const cameraRef = useRef<CameraView | null>(null);
    const router = useRouter();

    // --- HOOKS (No Changes Here) ---
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    useEffect(() => {
        if (screenState === 'scanning') {
            const interval = setInterval(() => {
                setProgress(prev => (prev < 0.9 ? prev + 0.15 : 0.9));
            }, 200);
            const timer = setTimeout(handleSearch, 500);
            return () => { clearInterval(interval); clearTimeout(timer); };
        }
    }, [screenState]);


    // --- ACTION HANDLERS (handleSearch is MODIFIED) ---
    const handleTakePhoto = async () => {
        if (!cameraRef.current) return;
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            setPhotoUri(photo.uri);
            setScreenState('preview');
        } catch (e) {
            Alert.alert("Capture Error", "Could not capture photo.");
        }
    };

    const handleRetake = () => {
        setPhotoUri(null);
        setScreenState('camera');
    };

    const handleContinueSearch = () => {
        setScreenState('scanning');
    };

    // --- MODIFIED handleSearch FUNCTION ---
    const handleSearch = async () => {
        if (!photoUri) return;
        try {
            const base64 = await convertImageToBase64(photoUri);
            const apiResponse = await fetch(`${AI_API_URL}/find_match_react_native`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ file_data: base64 }).toString(),
            });

            // This is the new, robust way to handle the response.
            if (!apiResponse.ok) {
                // If the server responded with an error (like 400),
                // we try to parse its body to get the detailed error message.
                const errorBody: MatchResult = await apiResponse.json();
                // FastAPI sends the error in a 'detail' field.
                throw new Error(errorBody.detail || `Server responded with status: ${apiResponse.status}`);
            }

            // If the response was successful (200 OK), parse the body.
            const result: MatchResult = await apiResponse.json();
            setProgress(1);

            if (result.match_found) {
                setMatchResult(result);
                setScreenState('matchFound');
            } else {
                Alert.alert('No Match Found', result.message || 'This person is not in the database.',
                    [{ text: 'OK', onPress: () => router.push('/(police)/police-dashboard') }]
                );
            }
        } catch (e) {
            // This 'catch' block will now receive the DETAILED error message.
            const errorMessage = (e instanceof Error) ? e.message : 'An unknown error occurred.';
            // The Alert will now show the actual reason, e.g., "No face could be detected..."
            Alert.alert('Search Failed', errorMessage,
                [{ text: 'Try Again', onPress: handleRetake }]
            );
        }
    };
    
    const handleConfirmOrReject = (isConfirm: boolean) => {
        const title = isConfirm ? "Match Confirmed" : "Match Rejected";
        const message = isConfirm ? "Relevant authorities will be notified." : "Thank you. Your feedback will improve the system.";
        Alert.alert(title, message);
        router.push('/(police)/police-dashboard');
    };

    // --- HELPER & RENDER FUNCTIONS (No Changes Here) ---
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

    const renderCameraView = () => (
        <View style={styles.container}>
            <Text style={styles.title}>Search by Face</Text>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity key={g} style={[styles.genderButton, gender === g && styles.genderButtonSelected]} onPress={() => setGender(g)}>
                        <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.cameraOuterContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing={facing} ratio="1:1" />
            </View>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={32} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.flipButton} onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
                    <Ionicons name="camera-reverse-outline" size={28} color="#3A0000" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPreviewView = () => (
        <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview Photo</Text>
            <View style={styles.imageContainer}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.image} />}
            </View>
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>Review the captured image before proceeding.</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                    <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinueSearch}>
                    <Text style={styles.continueButtonText}>Continue Search</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderScanningView = () => (
        <View style={styles.scanningContainer}>
            <View style={styles.scanContainer}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.image} />}
                <View style={styles.overlay}><View style={styles.scanBox} /></View>
            </View>
            <Text style={styles.statusText}>Scanning Face...</Text>
            <Text style={styles.waitText}>Please Wait</Text>
            <Progress.Bar progress={progress} width={null} height={8} color={'#000'} unfilledColor={'#e0e0e0'} borderWidth={0} style={styles.progressBar} />
            <Text style={styles.progressText}>{`${Math.round(progress * 100)}%`}</Text>
        </View>
    );

    const renderMatchFoundView = () => {
        if (!matchResult) return null;
        const confidencePercentage = (matchResult.confidence! * 100).toFixed(0);
        const detectionDate = new Date().toISOString().split('T')[0];
        const detectionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <ScrollView style={styles.matchContainer}>
                <Text style={styles.matchHeaderTitle}>Match Found Alert</Text>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Potential Match Detected!</Text>
                    <View style={styles.matchDetailsContainer}>
                        <View style={styles.detailsTextContainer}>
                            <Text style={styles.detailLabel}>Name:</Text><Text style={styles.detailValue}>{matchResult.person_name || 'Unknown'}</Text>
                            <Text style={styles.detailLabel}>Approx. Age:</Text><Text style={styles.detailValue}>{matchResult.age}</Text>
                            <Text style={styles.detailLabel}>Gender:</Text><Text style={styles.detailValue}>{matchResult.gender}</Text>
                            <Text style={styles.detailLabel}>Match Confidence:</Text><Text style={styles.detailValue}>{confidencePercentage}%</Text>
                            <Text style={styles.detailLabel}>Last Seen:</Text><Text style={styles.detailValue}>{matchResult.last_seen || 'Not specified'}</Text>
                            <Text style={styles.detailLabel}>Detection:</Text><Text style={styles.detailValue}>{`${detectionDate} ${detectionTime}`}</Text>
                        </View>
                        <Image source={{ uri: `${AI_API_URL}/${matchResult.file_path}` }} style={styles.matchedImage} />
                    </View>
                    <TouchableOpacity style={styles.confirmButton} onPress={() => handleConfirmOrReject(true)}>
                        <Text style={styles.buttonText}>Confirm Match</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => handleConfirmOrReject(false)}>
                        <Text style={styles.rejectButtonText}>Reject Match</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    // --- MAIN RENDER LOGIC (No Changes Here) ---
    if (hasPermission === null) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.centerContainer}><Text>No access to camera.</Text></View>;
    }

    switch (screenState) {
        case 'camera': return renderCameraView();
        case 'preview': return renderPreviewView();
        case 'scanning': return renderScanningView();
        case 'matchFound': return renderMatchFoundView();
        default: return renderCameraView();
    }
}

// --- COMBINED STYLESHEET (No Changes Here) ---
const styles = StyleSheet.create({
    // General & Camera Styles
    container: { flex: 1, backgroundColor: '#FFFBF8', paddingHorizontal: 20, paddingTop: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#3A0000', marginBottom: 20 },
    label: { fontSize: 16, color: '#5B4242', marginBottom: 10 },
    genderContainer: { flexDirection: 'row', marginBottom: 20 },
    genderButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#F5EAEA', marginRight: 10 },
    genderButtonSelected: { backgroundColor: '#3A0000' },
    genderText: { color: '#5B4242' },
    genderTextSelected: { color: '#FFF' },
    cameraOuterContainer: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#E4C4C4', marginBottom: 20, backgroundColor: '#000' },
    camera: { flex: 1 },
    footer: { paddingBottom: 30, alignItems: 'center' },
    captureButton: { backgroundColor: '#8B0000', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    flipButton: { marginTop: 15 },
    // Preview Styles
    previewContainer: { flex: 1, backgroundColor: '#FFFBF8', padding: 20, justifyContent: 'space-between' },
    previewTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    imageContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', marginBottom: 20, maxHeight: '60%' },
    image: { width: '100%', height: '100%', resizeMode: 'contain' },
    infoBox: { padding: 15, backgroundColor: '#F5EAEA', borderRadius: 10, marginBottom: 30 },
    infoText: { textAlign: 'center', color: '#5B4242', fontSize: 14, lineHeight: 20 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 },
    retakeButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center', marginRight: 10 },
    retakeButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
    continueButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: '#8B0000', alignItems: 'center', marginLeft: 10 },
    continueButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    // Scanning Styles
    scanningContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EBEB', padding: 40 },
    scanContainer: { width: 250, height: 250, borderRadius: 15, overflow: 'hidden', marginBottom: 30 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanBox: { width: '85%', height: '85%', borderWidth: 4, borderColor: '#00e676', borderRadius: 10 },
    statusText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    waitText: { fontSize: 16, color: '#666', marginTop: 8, marginBottom: 30 },
    progressBar: { width: '100%', borderRadius: 4 },
    progressText: { marginTop: 10, fontSize: 14, color: '#333' },
    // Match Found Styles
    matchContainer: { flex: 1, backgroundColor: '#FFFBF8', paddingTop: 20 },
    matchHeaderTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    card: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    matchDetailsContainer: { flexDirection: 'row', marginBottom: 20 },
    detailsTextContainer: { flex: 1 },
    detailLabel: { fontSize: 14, color: '#888', marginTop: 8 },
    detailValue: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
    matchedImage: { width: 100, height: 120, borderRadius: 10, marginLeft: 15, backgroundColor: '#eee' },
    confirmButton: { backgroundColor: '#8B0000', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    rejectButton: { backgroundColor: '#f0f0f0', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    rejectButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});