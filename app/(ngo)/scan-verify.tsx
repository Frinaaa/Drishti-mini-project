// app/ngo/scan-verify.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Camera, CameraType, FaceDetectionResult } from 'expo-camera'; // Import FaceDetectionResult
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you have vector icons installed
import { Buffer } from 'buffer'; // You might need to install 'buffer' if not already there: npm install buffer

// Define the type for route parameters
type ScanVerifyRouteParams = {
  reportId: string;
  missingPersonName: string;
  familyPhotoUrl: string; // The URL to the family photo
};

type ScanVerifyRouteProp = RouteProp<Record<string, ScanVerifyRouteParams>, 'ScanVerify'>;

const AI_SERVER_URL = "http://YOUR_AI_SERVER_IP:8000"; // !! IMPORTANT: Replace with your AI server's actual IP !!

export default function ScanVerifyScreen() {
  const navigation = useNavigation();
  const route = useRoute<ScanVerifyRouteProp>();
  const { reportId, missingPersonName, familyPhotoUrl } = route.params ?? {
  reportId: "",
  missingPersonName: "",
  familyPhotoUrl: "",
};


  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [cctvCapturedFaceUri, setCctvCapturedFaceUri] = useState<string | null>(null);
  const [scanningMessage, setScanningMessage] = useState("Scanning... Please Wait");
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false); // To prevent sending too many requests

  // State to hold the base64 of the family photo for sending to backend
  const [familyPhotoBase64, setFamilyPhotoBase64] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // Pre-process the family photo into base64 once
      try {
        const fileInfo = await FileSystem.getInfoAsync(familyPhotoUrl);
        if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(familyPhotoUrl, { encoding: FileSystem.EncodingType.Base64 });
            setFamilyPhotoBase64(base64);
            console.log("Family photo pre-processed to base64 successfully.");
        } else {
            console.error("Family photo URL does not exist:", familyPhotoUrl);
            Alert.alert("Error", "Family photo not found. Please check the report.");
        }
      } catch (error) {
        console.error("Failed to read family photo for base64 conversion:", error);
        Alert.alert("Error", "Failed to load family photo for comparison.");
      }
    })();
  }, [familyPhotoUrl]);

  // Function to capture and send a frame to the AI server
  const sendFrameForVerification = async () => {
    if (!cameraRef.current || isProcessingFrame || !familyPhotoBase64) {
      return;
    }
    
    setIsProcessingFrame(true);
    setBackendError(null); // Clear previous errors

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5, // Adjust quality as needed for performance vs accuracy
        base64: true,
        skipProcessing: true, // Skip Expo's internal processing for faster capture
      });

      if (!photo.base64) {
        setIsProcessingFrame(false);
        return;
      }

      // Convert base64 to Blob/FormData for FastAPI
      const formData = new FormData();
      formData.append('live_face_data', photo.base64);
      formData.append('family_photo_data', familyPhotoBase64);

      setScanningMessage("Analyzing frame...");

      const response = await fetch(`${AI_SERVER_URL}/verify_two_faces`, {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data', // Important for FormData
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setBackendError(result.detail || "An unknown error occurred.");
        setScanningMessage(`Error: ${result.detail || "Please try again."}`);
        setMatchConfidence(null);
        setCctvCapturedFaceUri(null);
      } else {
        if (result.match_found) {
          setMatchConfidence(result.confidence);
          setCctvCapturedFaceUri(photo.uri); // Use the captured photo as the "CCTV" image
          setScanningMessage(`Match found for ${missingPersonName}!`);
        } else {
          setMatchConfidence(result.confidence); // Still show confidence even if below threshold
          setCctvCapturedFaceUri(null); // Clear if no confident match
          setScanningMessage("No confident match found. Keep scanning...");
        }
        setBackendError(null);
      }

    } catch (error) {
      console.error("Error sending frame to AI server:", error);
      setBackendError("Network or server error. Please check AI server.");
      setScanningMessage("Network error. Retrying...");
    } finally {
      setIsProcessingFrame(false);
    }
  };

  // Interval for sending frames
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isScanning && hasPermission === true && familyPhotoBase64) {
      interval = setInterval(() => {
        sendFrameForVerification();
      }, 2000); // Send a frame every 2 seconds. Adjust as needed.
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, hasPermission, familyPhotoBase64, isProcessingFrame]); // Re-run if these change

  const toggleScanning = () => {
    if (!familyPhotoBase64) {
        Alert.alert("Error", "Family photo not loaded for comparison.");
        return;
    }
    setIsScanning(prev => !prev);
    if (!isScanning) { // If starting to scan
      setScanningMessage("Scanning... Please Wait");
      setMatchConfidence(null);
      setCctvCapturedFaceUri(null);
      setBackendError(null);
    } else { // If stopping scan
      setScanningMessage("Scanning Paused.");
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.header}>Face Scanning</Text>
      <TouchableOpacity onPress={() => Alert.alert("Help", "This screen scans for the missing person's face in live video.")} style={styles.helpButton}>
        <Ionicons name="help-circle-outline" size={24} color="#000" />
      </TouchableOpacity>

      {/* Uploaded by Family */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uploaded by Family</Text>
        <Image
          source={{ uri: familyPhotoUrl }}
          style={styles.faceImage}
          resizeMode="contain"
        />
        <Text style={styles.missingPersonText}>Missing Person: {missingPersonName}</Text>
      </View>

      {/* Live Camera Feed */}
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.front} // You might want to use CameraType.back for public scanning
          // You could potentially use onFacesDetected if you want to highlight faces in real-time
          // However, for verification, sending frames to the backend is more robust.
        >
          {/* Overlay for scan animation or instructions */}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraOverlayText}>
              {isScanning ? "Align face in view" : "Tap to start scanning"}
            </Text>
          </View>
        </Camera>
        <TouchableOpacity style={styles.scanButton} onPress={toggleScanning}>
            <Text style={styles.scanButtonText}>
                {isScanning ? "Stop Scanning" : "Start Scanning"}
            </Text>
        </TouchableOpacity>
      </View>

      {/* CCTV-Captured Face */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CCTV-Captured Face</Text>
        {cctvCapturedFaceUri ? (
          <Image
            source={{ uri: cctvCapturedFaceUri }}
            style={styles.faceImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="camera" size={60} color="#ccc" />
            <Text style={styles.placeholderText}>No face captured yet</Text>
          </View>
        )}

        <View style={styles.matchInfo}>
          {isScanning && isProcessingFrame && !backendError ? (
            <ActivityIndicator size="small" color="#800000" />
          ) : (
            <>
              <Text style={styles.scanningStatus}>{scanningMessage}</Text>
              {matchConfidence !== null && (
                <Text style={styles.matchConfidenceText}>
                  Match Confidence: {Math.round(matchConfidence * 100)}%
                </Text>
              )}
              {backendError && (
                <Text style={styles.errorText}>Error: {backendError}</Text>
              )}
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, matchConfidence !== null && matchConfidence >= 0.7 ? styles.continueButtonEnabled : styles.continueButtonDisabled]}
        onPress={() => Alert.alert("Continue", "Action to be defined for continuing with this match.")}
        disabled={matchConfidence === null || matchConfidence < 0.7} // Enable only if confident match
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20, // Adjust for status bar on Android
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 40, // Adjust for status bar
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  helpButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 40, // Adjust for status bar
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  faceImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  missingPersonText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    fontWeight: '500',
  },
  cameraContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanButton: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: '#800000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 1,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#888',
    marginTop: 5,
  },
  matchInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  scanningStatus: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 5,
    textAlign: 'center',
  },
  matchConfidenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#008000', // Green for good match
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f', // Red for error
    marginTop: 5,
    textAlign: 'center',
  },
  continueButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  continueButtonEnabled: {
    backgroundColor: '#800000',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});