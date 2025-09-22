import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Camera } from 'expo-camera'; // Corrected: Removed unused 'CameraType'
import { Ionicons } from '@expo/vector-icons';

// Make sure these import paths are correct for your project structure
// IMPORTANT: Check how your CustomButton is exported. See the note below.
import CustomButton from '../../components/CustomButton';
import { AI_API_URL } from '../../config/api';

// Defines the expected structure of a successful response from the AI server
interface MatchResult {
    match_found: boolean;
    identity?: string;
    confidence?: number;
    message?: string;
    detail?: string;
}

export default function FaceSearchScreen() {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleTakePhoto = async () => {
        if (cameraRef.current && !isLoading) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    exif: false,
                });
                setPhotoUri(photo.uri);
                setError(null);
            } catch (e) {
                console.error("Failed to take picture:", e);
                Alert.alert("Error", "Could not capture photo. Please try again.");
            }
        }
    };

    const handleRetakePhoto = () => {
        setPhotoUri(null);
        setError(null);
    };

    const handleSearch = async () => {
        if (!photoUri) {
            Alert.alert('No Photo Taken', 'Please take a photo before performing a search.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        const filename = photoUri.split('/').pop() || 'capture.jpg';
        const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

        formData.append('file', {
            uri: photoUri,
            name: filename,
            type: fileType,
        } as any);

        try {
            const response = await fetch(`${AI_API_URL}/find_match`, {
                method: 'POST',
                body: formData,
            });

            const result: MatchResult = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || `Request failed with status ${response.status}`);
            }

            if (result.match_found) {
                const confidencePercentage = result.confidence ? (result.confidence * 100).toFixed(2) : 'N/A';
                const reportName = result.identity
                    ? result.identity.split('-').slice(1).join(' ').replace(/_/g, ' ').replace(/\.[^/.]+$/, "")
                    : 'N/A';

                Alert.alert(
                    'Match Found!',
                    `A potential match was found for report: ${reportName}.\n\nConfidence: ${confidencePercentage}%`,
                    [{ text: 'OK' }]
                );
            } else {
                const message = result.message || 'No similar face was found in the missing persons database.';
                Alert.alert('No Match Found', message);
            }
        } catch (e) {
            const errorMessage = (e instanceof Error) ? e.message : 'An unknown error occurred.';
            setError(`Failed to connect to the AI server: ${errorMessage}`);
            Alert.alert('Search Failed', `An error occurred while trying to perform the search: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><ActivityIndicator /></View>;
    }
    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.description}>No access to camera. Please grant permission in your device settings.</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Police Face Search' }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Ionicons name="camera-outline" size={32} color="#3A0000" />
                    <Text style={styles.title}>Live Face Search</Text>
                </View>

                <Text style={styles.description}>
                    {photoUri
                        ? "Review the photo below or retake it."
                        : "Position the person's face within the frame and tap the button to capture."}
                </Text>

                <View style={styles.cameraContainer}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                    ) : (
                        <Camera
                            ref={cameraRef}
                            style={styles.camera}
                            type="front"
                            ratio="1:1"
                        />
                    )}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3A0000" />
                        <Text style={styles.loadingText}>Analyzing image, please wait...</Text>
                    </View>
                ) : (
                    <View style={styles.buttonContainer}>
                        {photoUri ? (
                            <>
                                <CustomButton
                                    title="Retake Photo"
                                    onPress={handleRetakePhoto}
                                    style={{ flex: 1, marginRight: 10, backgroundColor: '#5B4242' }}
                                />
                                <CustomButton
                                    title="Perform Search"
                                    onPress={handleSearch}
                                    style={{ flex: 1, marginLeft: 10 }}
                                />
                            </>
                        ) : (
                            <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={40} color="#FFFBF8" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF8',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3A0000',
        marginTop: 10,
    },
    description: {
        fontSize: 16,
        color: '#5B4242',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    cameraContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E4C4C4',
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: '#F5EAEA',
    },
    camera: {
        flex: 1,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3A0000',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
    },
    loadingContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#3A0000',
    },
});