import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
    ActivityIndicator, Platform, ScrollView, Dimensions 
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AI_API_URL } from '../../config/api';

// --- Constants and Types ---
const { width: screenWidth } = Dimensions.get('window');
const CAMERA_VIEW_HEIGHT = 350;

interface FoundMatch {
    filename: string;
    confidence: number;
    file_path: string;
    liveCaptureUri: string;
}

// --- Main Component ---
export default function ScanVerifyScreen() {
    const navigation = useNavigation();
    const cameraRef = useRef<CameraView>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const frameSenderIntervalRef = useRef<number | null>(null);

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Tap 'Start Live Scan' to begin");
    const [isCameraReady, setIsCameraReady] = useState(false);

    const [foundMatches, setFoundMatches] = useState<FoundMatch[]>([]);
    
    const [faceBox, setFaceBox] = useState<any>(null);
    const [lastPhotoDims, setLastPhotoDims] = useState({ width: 1, height: 1 });

    useEffect(() => {
        Camera.requestCameraPermissionsAsync().then(({ status }) => { setHasPermission(status === 'granted'); });
        return () => disconnectWebSocket();
    }, []);

    useEffect(() => {
        if (isStreaming && isCameraReady) {
            frameSenderIntervalRef.current = setInterval(sendFrame, 300);
        }
        return () => {
            if (frameSenderIntervalRef.current) clearInterval(frameSenderIntervalRef.current);
        };
    }, [isStreaming, isCameraReady]);

    const disconnectWebSocket = () => {
        wsRef.current?.close();
        wsRef.current = null;
        setIsStreaming(false);
    };

    const connectWebSocket = () => {
        if (!AI_API_URL) { setStatusMessage("API URL not configured."); return; }
        const wsUrl = AI_API_URL.replace(/^http/, 'ws') + '/ws/live_stream';
        wsRef.current = new WebSocket(wsUrl);
        setStatusMessage('Connecting...');

        const connectionTimeout = setTimeout(() => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
                setStatusMessage("Connection failed. Check server & firewall.");
                wsRef.current?.close();
                setIsStreaming(false);
            }
        }, 5000);

        wsRef.current.onopen = () => {
            clearTimeout(connectionTimeout);
            setStatusMessage('Connection established. Streaming...');
            setIsStreaming(true);
        };

        wsRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.face_detected && data.face_box) {
                const { width: photoWidth, height: photoHeight } = lastPhotoDims;
                const scaleX = screenWidth / photoWidth;
                const scaleY = CAMERA_VIEW_HEIGHT / photoHeight;
                setFaceBox({ top: data.face_box.y * scaleY, left: data.face_box.x * scaleX, width: data.face_box.width * scaleX, height: data.face_box.height * scaleY });
            } else { setFaceBox(null); }

            const newMatch = data.match_result;
            if (newMatch?.match_found) {
                const isAlreadyFound = foundMatches.some(m => m.filename === newMatch.filename);
                if (!isAlreadyFound) {
                    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
                    if (photo) {
                        setFoundMatches(prev => [{ ...newMatch, liveCaptureUri: photo.uri }, ...prev]);
                    }
                }
            }
        };
        
        wsRef.current.onerror = (error) => { console.error('WebSocket error:', error); clearTimeout(connectionTimeout); setStatusMessage('Connection Error.'); setIsStreaming(false); };
        wsRef.current.onclose = () => { clearTimeout(connectionTimeout); setStatusMessage("Stream Ended."); setIsStreaming(false); setFaceBox(null); };
    };

    const sendFrame = async () => {
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
            setStatusMessage("Scan stopped. Tap 'Start' to begin.");
        } else {
            setFoundMatches([]);
            connectWebSocket();
        }
    };
    
    const handleConfirmOrReject = (isConfirm: boolean, matchToRemove: FoundMatch) => {
        const title = isConfirm ? "Match Confirmed" : "Match Rejected";
        const message = isConfirm ? `Notifying authorities about the match with ${matchToRemove.filename}.` : "Thank you for your feedback.";
        Alert.alert(title, message, [{ text: "OK", onPress: () => {
            setFoundMatches(prev => prev.filter(m => m.filename !== matchToRemove.filename));
        }}]);
    };
    
    if (hasPermission === null) return <ActivityIndicator />;
    if (hasPermission === false) return <Text>No camera access</Text>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.header}>Live Face Scan</Text>
            
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" onCameraReady={() => setIsCameraReady(true)} />
                <View style={StyleSheet.absoluteFill}>
                    {faceBox && <View style={[styles.faceBox, { top: faceBox.top, left: faceBox.left, width: faceBox.width, height: faceBox.height }]} />}
                </View>
                <TouchableOpacity style={styles.scanButton} onPress={toggleStreaming}>
                    <Text style={styles.scanButtonText}>{isStreaming ? "Stop Scan" : "Start Live Scan"}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statusCard}>
                <Text style={styles.cardTitle}>Scan Status</Text>
                <Text style={styles.statusMessage}>{isStreaming ? (faceBox ? 'Face Detected' : 'Searching for Face...') : statusMessage}</Text>
            </View>

            {foundMatches.length > 0 && (
                <View style={styles.matchListContainer}>
                    <Text style={styles.matchListHeader}>Found Matches ({foundMatches.length})</Text>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchListScrollView}>
                        {foundMatches.map((match, index) => (
                            <MatchCard key={`${match.filename}-${index}`} match={match} onAction={handleConfirmOrReject} />
                        ))}
                    </ScrollView>
                </View>
            )}
        </ScrollView>
    );
}

// --- Sub-Component for Rendering Each Match Card ---
const MatchCard = ({ match, onAction }: { match: FoundMatch, onAction: (isConfirm: boolean, match: FoundMatch) => void }) => {
    const confidencePercentage = (match.confidence * 100).toFixed(1);
    const matchedImageUri = `${AI_API_URL}/${match.file_path}`;

    return (
        <View style={styles.resultsCard}>
            <View style={styles.imageComparisonContainer}>
                <View style={styles.imageBox}><Text style={styles.imageLabel}>Live Capture</Text><Image source={{ uri: match.liveCaptureUri }} style={styles.resultImage} /></View>
                <View style={styles.imageBox}><Text style={styles.imageLabel}>Database Record</Text><Image source={{ uri: matchedImageUri }} style={styles.resultImage} /></View>
            </View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Matched File:</Text><Text style={styles.detailValue} numberOfLines={1}>{match.filename}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Confidence:</Text><Text style={[styles.detailValue, styles.confidenceText]}>{confidencePercentage}%</Text></View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.confirmButton} onPress={() => onAction(true, match)}><Text style={styles.buttonText}>Confirm</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => onAction(false, match)}><Text style={styles.rejectButtonText}>Reject</Text></TouchableOpacity>
            </View>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    contentContainer: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 60 : 40, paddingBottom: 100 },
    header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    backButton: { position: 'absolute', top: Platform.OS === 'android' ? 15 : 0, left: 0, zIndex: 10, padding: 5 },
    cameraContainer: { width: '100%', height: CAMERA_VIEW_HEIGHT, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 20, elevation: 3 },
    camera: { flex: 1 },
    scanButton: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#800000', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, zIndex: 1, elevation: 5 },
    scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    faceBox: { position: 'absolute', borderWidth: 2, borderColor: '#00FF00', borderRadius: 5 },
    statusCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, alignItems: 'center', justifyContent: 'center', elevation: 2, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 5, color: '#555' },
    statusMessage: { fontSize: 16, fontWeight: '500', color: '#333' },
    matchListContainer: { marginTop: 10 },
    matchListHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    matchListScrollView: { paddingBottom: 10 },
    resultsCard: { width: screenWidth * 0.85, backgroundColor: "#fff", borderRadius: 15, padding: 15, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginRight: 15 },
    imageComparisonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    imageBox: { alignItems: 'center' },
    imageLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
    resultImage: { width: 110, height: 130, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    detailLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
    detailValue: { fontSize: 14, color: '#333', fontWeight: 'bold', flexShrink: 1 },
    confidenceText: { color: '#2e7d32', fontSize: 16 },
    actionButtons: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
    confirmButton: { flex: 1, backgroundColor: "#8B0000", paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: 'bold' },
    rejectButton: { flex: 1, backgroundColor: "#f5f5f5", paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    rejectButtonText: { color: "#666", fontSize: 16, fontWeight: '500' },
});