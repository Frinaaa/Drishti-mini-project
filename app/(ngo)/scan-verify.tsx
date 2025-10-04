// app/ngo/scan-verify.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Camera } from 'expo-camera'; // Correct import for new versions
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// !! IMPORTANT: Replace with your AI server's actual IP address and port !!
const AI_SERVER_URL = "http://192.168.1.10:8000"; // Example: Use your computer's local IP
const API_BASE_URL = "http://192.168.1.10:3000"; // !! Your main backend URL for serving images !!

export default function ScanVerifyScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef<camera>(null);
  
  // State for camera and permissions
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  
  // State for match results
  const [matchResult, setMatchResult] = useState<any>(null);
  const [cctvCapturedFaceUri, setCctvCapturedFaceUri] = useState<string | null>(null);
  
  // State for user feedback
  const [statusMessage, setStatusMessage] = useState("Tap 'Start Scanning' to begin");
  const [backendError, setBackendError] = useState<string | null>(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const sendFrameForMatching = async () => {
    if (!cameraRef.current || isProcessingFrame) return;

    setIsProcessingFrame(true);
    setBackendError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });

      if (!photo.base64) {
        setIsProcessingFrame(false);
        return;
      }

      // We use FormData because it's robust for sending file data
      const formData = new FormData();
      formData.append('file_data', photo.base64);

      setStatusMessage("Searching database...");

      const response = await fetch(`${AI_SERVER_URL}/find_match_react_native`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();

      if (!response.ok) {
        setBackendError(result.detail || "An unknown server error occurred.");
        // If a face isn't detected, it's not a critical error, just feedback
        if (response.status === 400) {
            setStatusMessage(result.detail);
        }
      } else {
        if (result.match_found) {
          // We found a match! Stop scanning and show the result.
          console.log("Match Found:", result);
          setIsScanning(false);
          setMatchResult(result);
          setCctvCapturedFaceUri(photo.uri);
          setStatusMessage(result.message || "Match Found!");
        } else {
          // No match found, continue scanning
          setStatusMessage("No match found. Keep scanning...");
          setMatchResult(null);
          setCctvCapturedFaceUri(null);
        }
      }
    } catch (error) {
      console.error("Error sending frame to AI server:", error);
      setBackendError("Network Error. Check AI server IP and connection.");
    } finally {
      // Wait a moment before allowing the next scan
      setTimeout(() => setIsProcessingFrame(false), 1000);
    }
  };

  useEffect(() => {
    let scanTimeout: NodeJS.Timeout | null = null;
    if (isScanning && hasPermission && !isProcessingFrame) {
      // Continuously call the function with a delay
      scanTimeout = setTimeout(sendFrameForMatching, 1500);
    }
    return () => {
      if (scanTimeout) clearTimeout(scanTimeout);
    };
  }, [isScanning, hasPermission, isProcessingFrame]); // This loop runs the scanner

  const toggleScanning = () => {
    if (isScanning) {
      setIsScanning(false);
      setStatusMessage("Scanning Paused.");
    } else {
      setIsScanning(true);
      setStatusMessage("Starting live scan...");
      // Reset previous results
      setMatchResult(null);
      setCctvCapturedFaceUri(null);
      setBackendError(null);
    }
  };

  // Render loading/error states first
  if (hasPermission === null) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#800000" /></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>Camera permission is required to scan.</Text></View>;
  }
  
  const matchedImageUri = matchResult?.file_path 
    ? `${API_BASE_URL}/${matchResult.file_path}`.replace(/\\/g, '/')
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.header}>Live Face Detection</Text>
      <TouchableOpacity onPress={() => Alert.alert("Help", "This screen continuously scans faces in the live video and compares them against all missing person reports in the database.")} style={styles.helpButton}>
        <Ionicons name="help-circle-outline" size={24} color="#000" />
      </TouchableOpacity>

      {/* Live Camera Feed */}
      <View style={styles.cameraContainer}>
        <Camera ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraOverlayText}>{isScanning ? "Scanning..." : "Ready to Scan"}</Text>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={toggleScanning}>
          <Text style={styles.scanButtonText}>{isScanning ? "Stop Scanning" : "Start Live Scan"}</Text>
        </TouchableOpacity>
      </View>

      {/* Results Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scan Results</Text>
        <View style={styles.resultsContainer}>
            {/* Left side: Live captured face */}
            <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Live Captured Face</Text>
                {cctvCapturedFaceUri ? (
                    <Image source={{ uri: cctvCapturedFaceUri }} style={styles.faceImage} />
                ) : (
                    <View style={styles.placeholderImage}><Ionicons name="camera-outline" size={40} color="#ccc" /></View>
                )}
            </View>
            {/* Right side: Matched report photo */}
            <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Matched Report Photo</Text>
                {matchedImageUri ? (
                    <Image source={{ uri: matchedImageUri }} style={styles.faceImage} />
                ) : (
                    <View style={styles.placeholderImage}><Ionicons name="person-outline" size={40} color="#ccc" /></View>
                )}
            </View>
        </View>
        
        {/* Status and Confidence Info */}
        <View style={styles.matchInfo}>
            {isScanning && isProcessingFrame && <ActivityIndicator size="small" color="#800000" />}
            <Text style={styles.statusMessage}>{statusMessage}</Text>
            {matchResult?.confidence && (
                <Text style={styles.matchConfidenceText}>
                    Confidence: {Math.round(matchResult.confidence * 100)}%
                </Text>
            )}
            {backendError && <Text style={styles.errorText}>Error: {backendError}</Text>}
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.continueButton, matchResult ? styles.continueButtonEnabled : styles.continueButtonDisabled]}
        disabled={!matchResult}
        onPress={() => Alert.alert("Match Confirmed", `Details for match with ${matchResult.matched_image} can be shown here.`)}
      >
        <Text style={styles.continueButtonText}>View Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 50 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  backButton: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 40, left: 20, zIndex: 10, padding: 5 },
  helpButton: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 40, right: 20, zIndex: 10, padding: 5 },
  cameraContainer: { width: '100%', height: 350, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 20, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  camera: { ...StyleSheet.absoluteFillObject },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  cameraOverlayText: { color: '#fff', fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
  scanButton: { position: 'absolute', bottom: 20, backgroundColor: '#800000', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, zIndex: 1, elevation: 5 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#555' },
  resultsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  resultBox: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
  resultLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  faceImage: { width: 120, height: 120, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#e0e0e0' },
  placeholderImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  matchInfo: { alignItems: 'center', marginTop: 20, minHeight: 60, width: '100%' },
  statusMessage: { fontSize: 16, fontWeight: '500', color: '#333', textAlign: 'center' },
  matchConfidenceText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginTop: 5 },
  errorText: { fontSize: 14, color: '#d32f2f', marginTop: 5, textAlign: 'center', fontWeight: 'bold' },
  continueButton: { paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  continueButtonEnabled: { backgroundColor: '#800000' },
  continueButtonDisabled: { backgroundColor: '#ccc' },
  continueButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});