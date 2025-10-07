import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, ScrollView, Dimensions } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AI_API_URL } from '../../config/api';

const { width: screenWidth } = Dimensions.get('window');
const CAMERA_VIEW_HEIGHT = 400;

export default function ScanVerifyScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameSenderIntervalRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Tap 'Start Live Scan' to begin");
  
  // FIX: Add state to track if the camera component is ready
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [faceBox, setFaceBox] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [lastPhotoDims, setLastPhotoDims] = useState({ width: 1, height: 1 });

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
    return () => disconnectWebSocket();
  }, []);
  
  // FIX: This new useEffect hook manages the sending interval.
  // It will only start the interval when BOTH the stream is active AND the camera is ready.
  useEffect(() => {
    if (isStreaming && isCameraReady) {
      // All conditions are met, start sending frames.
      frameSenderIntervalRef.current = setInterval(sendFrame, 300);
      console.log("Camera and WebSocket are ready. Starting frame sender.");
    }

    // This cleanup function will run if isStreaming or isCameraReady becomes false.
    return () => {
      if (frameSenderIntervalRef.current) {
        clearInterval(frameSenderIntervalRef.current);
        frameSenderIntervalRef.current = null;
        console.log("Stopping frame sender.");
      }
    };
  }, [isStreaming, isCameraReady]); // Re-run this logic if these states change

  const disconnectWebSocket = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsStreaming(false); // This will trigger the useEffect cleanup
  };

 const connectWebSocket = () => {
    if (!AI_API_URL) {
      setStatusMessage("API URL not configured.");
      return;
    }
    const wsUrl = AI_API_URL.replace(/^http/, 'ws') + '/ws/live_stream';
    wsRef.current = new WebSocket(wsUrl);
    setStatusMessage('Connecting...');

    // FIX: Add a timeout to handle connection failures
    const connectionTimeout = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        setStatusMessage("Connection failed. Check server & firewall.");
        wsRef.current?.close();
        setIsStreaming(false);
      }
    }, 5000); // 5-second timeout

    wsRef.current.onopen = () => {
      // FIX: Clear the timeout if the connection succeeds
      clearTimeout(connectionTimeout);
      setStatusMessage('Connection established. Waiting for camera...');
      setIsStreaming(true);
    };

    wsRef.current.onmessage = (event) => { /* ... unchanged ... */ };

    wsRef.current.onerror = (error) => {
      clearTimeout(connectionTimeout); // Clear timeout on error too
      console.error('WebSocket error:', error);
      setStatusMessage('Connection Error.');
      setIsStreaming(false);
    };

    wsRef.current.onclose = () => {
      clearTimeout(connectionTimeout); // And on close
      setStatusMessage("Stream Ended. Tap 'Start' to reconnect.");
      setIsStreaming(false);
      setFaceBox(null);
    };
  };

  const sendFrame = async () => {
    // We can be more confident this will work now because the interval
    // doesn't start until the camera is ready.
    if (cameraRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, base64: true });
      if (photo?.base64) {
        setLastPhotoDims({ width: photo.width, height: photo.height });
        wsRef.current.send(photo.base64);
      }
    }
  };

  const toggleStreaming = () => {
    if (isStreaming) {
      disconnectWebSocket();
    } else {
      connectWebSocket();
    }
  };

  if (hasPermission === null) return <View style={styles.container}><ActivityIndicator size="large" color="#800000" /></View>;
  if (hasPermission === false) return <View style={styles.container}><Text>No access to camera.</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Live Face Scan</Text>

        <View style={styles.cameraContainer}>
          {/* FIX: Add the onCameraReady prop here */}
          <CameraView 
            ref={cameraRef} 
            style={styles.camera} 
            facing="back"
            onCameraReady={() => {
              console.log("Camera is now ready.");
              setIsCameraReady(true);
            }}
          />
          
          <View style={StyleSheet.absoluteFill}>
            {faceBox && (
              <View
                style={[ styles.faceBox, { top: faceBox.top, left: faceBox.left, width: faceBox.width, height: faceBox.height } ]}
              />
            )}
            {matchResult?.match_found && (
                <View style={styles.matchOverlay}>
                    <Text style={styles.matchText}>
                        MATCH: {matchResult.matched_image} ({(matchResult.confidence * 100).toFixed(1)}%)
                    </Text>
                </View>
            )}
          </View>

          <TouchableOpacity style={styles.scanButton} onPress={toggleStreaming}>
            <Text style={styles.scanButtonText}>{isStreaming ? "Stop Scan" : "Start Live Scan"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>Scan Status</Text>
            {isStreaming && !faceBox && <ActivityIndicator style={{marginBottom: 10}} size="small" color="#800000" />}
            <Text style={styles.statusMessage}>
                {isStreaming ? (faceBox ? 'Face Detected' : 'Searching for Face...') : statusMessage}
            </Text>
        </View>
    </ScrollView>
  );
}

// Styles are unchanged
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  backButton: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 40, left: 20, zIndex: 10 },
  cameraContainer: { width: '100%', height: CAMERA_VIEW_HEIGHT, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 20, elevation: 3 },
  camera: { flex: 1 },
  scanButton: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#800000', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, zIndex: 1, elevation: 5 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  faceBox: { position: 'absolute', borderWidth: 2, borderColor: '#00FF00', borderRadius: 5 },
  matchOverlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0, 255, 0, 0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  matchText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#555' },
  statusMessage: { fontSize: 16, fontWeight: '500', color: '#333' },
});