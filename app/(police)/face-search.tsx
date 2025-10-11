import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Progress from "react-native-progress";
import { AI_API_URL, BACKEND_API_URL } from "../../config/api"; // Import both URLs
import CustomAlert from "@/components/CustomAlert";

// --- UPDATED TYPES ---
// AI server's initial response
interface AiMatchResult {
  match_found: boolean;
  confidence: number;
  distance: number;
  matched_image: string; // Just the filename
  file_path: string; // Relative path for image URL
  message: string;
}

// Report details from our main backend
interface ReportDetails {
  _id: string;
  person_name: string;
  age: number;
  gender: string;
  last_seen: string;
  status: string;
}

// Combined result for displaying in the UI
interface FullMatchDetails {
  confidence: number;
  aiMessage: string;
  imageUrl: string;
  details: ReportDetails;
}

type ScreenState = "camera" | "preview" | "scanning" | "matchFound";

export default function FaceSearchFlowScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("camera");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<FullMatchDetails | null>(null);
  const [progress, setProgress] = useState(0);

  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info",
    onCloseCallback: undefined as (() => void) | undefined,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
    onOk?: () => void
  ) => {
    setAlert({ visible: true, title, message, type, onCloseCallback: onOk });
  };

  const hideAlert = () => {
    const callback = alert.onCloseCallback;
    setAlert((prev) => ({ ...prev, visible: false, onCloseCallback: undefined }));
    if (callback) setTimeout(callback, 100);
  };

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted");
    });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!photoUri) return;

    let progressInterval: any = null;

    try {
      // --- Step 1: Start Progress Simulation ---
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 0.4) return prev + 0.05; // Preparing & sending photo
          if (prev < 0.8) return prev + 0.02; // AI Server is processing
          return 0.9; // Waiting for final details
        });
      }, 250);

      // --- Step 2: Call AI Server ---
      const base64 = await convertImageToBase64(photoUri);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      const aiResponse = await fetch(`${AI_API_URL}/find_match_react_native`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ file_data: base64 }).toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.json().catch(() => ({ detail: "AI Server error" }));
        throw new Error(errorBody.detail || `AI Server responded with status ${aiResponse.status}`);
      }

      const aiResult: AiMatchResult = await aiResponse.json();

      if (!aiResult.match_found) {
        clearInterval(progressInterval);
        showCustomAlert("No Match Found", aiResult.message || "Person not found in database. Sighting logged.", "info", () => router.push("/(police)/police-dashboard"));
        return;
      }

      // --- Step 3: Match Found, Now Get Full Details from Main Backend ---
      const detailsResponse = await fetch(`${BACKEND_API_URL}/api/reports/by-filename/${aiResult.matched_image}`);
      if (!detailsResponse.ok) {
        throw new Error("Match found by AI, but could not retrieve report details from the main server.");
      }
      
      const reportDetails: ReportDetails = await detailsResponse.json();
      
      // --- Step 4: Combine Results and Update UI ---
      clearInterval(progressInterval);
      setProgress(1.0);

      setMatchResult({
        confidence: aiResult.confidence,
        aiMessage: aiResult.message,
        imageUrl: `${AI_API_URL}/${aiResult.file_path}`,
        details: reportDetails,
      });
      setScreenState("matchFound");

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      setProgress(0);

      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      let userMessage = `An unexpected error occurred: ${errorMessage}`;
      
      if (error instanceof Error && error.name === 'AbortError') {
        userMessage = "The request timed out. The server might be busy or your network connection is unstable. Please try again.";
      } else if (errorMessage.includes("No face")) {
        userMessage = "No face was detected in the photo. Please capture a clearer picture with better lighting.";
      }

      showCustomAlert("Search Failed", userMessage, "error", handleRetake);
    }
  }, [photoUri, router]);

  useEffect(() => {
    if (screenState === "scanning") {
      handleSearch();
    }
  }, [screenState, handleSearch]);

  const handleConfirmOrReject = (isConfirm: boolean) => {
    const title = isConfirm ? "Match Confirmed" : "Match Rejected";
    const message = isConfirm
      ? `The status for "${matchResult?.details.person_name}" will be updated and relevant parties notified.`
      : "Thank you for your feedback. This result will be dismissed.";
    const alertType = isConfirm ? "success" : "info";

    showCustomAlert(title, message, alertType, () => {
      // Here you could call the /api/reports/found/:id endpoint if confirming
      handleRetake();
      router.push("/(police)/police-dashboard");
    });
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setPhotoUri(photo.uri);
      setScreenState("preview");
    } catch {
      showCustomAlert("Capture Error", "Could not capture photo.", "error");
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setMatchResult(null);
    setProgress(0);
    setScreenState("camera");
  };

  const handleContinueSearch = () => {
    setScreenState("scanning");
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

  const renderCameraView = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Search by Face</Text>
      <View style={styles.cameraOuterContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} ratio="1:1" />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
          <Ionicons name="camera" size={32} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.flipButton} onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}>
          <Ionicons name="camera-reverse-outline" size={28} color="#3A0000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewView = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Preview Photo</Text>
      <View style={styles.imageContainer}>{photoUri && <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />}</View>
      <View style={styles.infoBox}><Text style={styles.infoText}>Ensure the face is clear and well-lit before proceeding.</Text></View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}><Text style={styles.retakeButtonText}>Retake</Text></TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueSearch}><Text style={styles.continueButtonText}>Continue Search</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderScanningView = () => {
    const statusMessage = progress < 0.4 ? "Analyzing photo..." : "Searching database with AI...";
    return (
      <View style={styles.scanningContainer}>
        <View style={styles.scanContainer}>{photoUri && <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />}<View style={styles.overlay}><View style={styles.scanBox} /></View></View>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <Text style={styles.waitText}>This may take a few moments</Text>
        <Progress.Bar progress={progress} width={null} height={8} color={"#8B0000"} unfilledColor={"#e0e0e0"} borderWidth={0} style={styles.progressBar} />
        <Text style={styles.progressText}>{`${Math.round(progress * 100)}%`}</Text>
      </View>
    );
  };

  const renderMatchFoundView = () => {
    if (!matchResult) return null;
    const confidencePercentage = (matchResult.confidence * 100).toFixed(1);

    return (
      <ScrollView style={styles.matchContainer}>
        <Text style={styles.matchHeaderTitle}>Match Found!</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Potential Match: {matchResult.details.person_name}</Text>
          <View style={styles.matchDetailsContainer}>
            <View style={styles.detailsTextContainer}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Confidence:</Text><Text style={[styles.detailValue, styles.confidenceText]}>{confidencePercentage}%</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Name:</Text><Text style={styles.detailValue}>{matchResult.details.person_name}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Age:</Text><Text style={styles.detailValue}>{matchResult.details.age}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Gender:</Text><Text style={styles.detailValue}>{matchResult.details.gender}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Status:</Text><Text style={[styles.detailValue, styles.matchStatusText]}>{matchResult.details.status}</Text></View>
            </View>
            <View style={styles.imageWrapper}><Image source={{ uri: matchResult.imageUrl }} style={styles.matchedImage} resizeMode="cover" /></View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.confirmButton} onPress={() => handleConfirmOrReject(true)}><Text style={styles.buttonText}>Confirm Match</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => handleConfirmOrReject(false)}><Text style={styles.rejectButtonText}>Reject Match</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (hasPermission === null) return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
  if (hasPermission === false) return <View style={styles.centerContainer}><Text>No access to camera.</Text></View>;

  return (
    <>
      {(() => {
        switch (screenState) {
          case "camera": return renderCameraView();
          case "preview": return renderPreviewView();
          case "scanning": return renderScanningView();
          case "matchFound": return renderMatchFoundView();
          default: return renderCameraView();
        }
      })()}
      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={hideAlert} />
    </>
  );
}

// --- STYLES (NO CHANGES HERE) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF8", paddingHorizontal: 20, paddingTop: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#3A0000", marginBottom: 20, textAlign: 'center' },
  cameraOuterContainer: { flex: 1, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: "#E4C4C4", marginBottom: 20, backgroundColor: "#000" },
  camera: { flex: 1 },
  footer: { paddingBottom: 30, alignItems: "center" },
  captureButton: { backgroundColor: "#8B0000", width: 70, height: 70, borderRadius: 35, justifyContent: "center", alignItems: "center", elevation: 4 },
  flipButton: { position: 'absolute', right: 20, bottom: 45 },
  previewContainer: { flex: 1, backgroundColor: "#FFFBF8", padding: 20, justifyContent: "space-between" },
  previewTitle: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20, color: "#3A0000" },
  imageContainer: { flex: 1, borderRadius: 15, overflow: "hidden", marginBottom: 20, maxHeight: "60%" },
  image: { width: "100%", height: "100%" },
  infoBox: { padding: 15, backgroundColor: "#F5EAEA", borderRadius: 10, marginBottom: 30 },
  infoText: { textAlign: "center", color: "#5B4242", fontSize: 14, lineHeight: 20 },
  buttonContainer: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 20 },
  retakeButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: "#f0f0f0", alignItems: "center", marginRight: 10 },
  retakeButtonText: { color: "#333", fontSize: 16, fontWeight: "bold" },
  continueButton: { flex: 1, paddingVertical: 18, borderRadius: 10, backgroundColor: "#8B0000", alignItems: "center", marginLeft: 10 },
  continueButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  scanningContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFBF8", padding: 40 },
  scanContainer: { width: 250, height: 250, borderRadius: 15, overflow: "hidden", marginBottom: 30 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanBox: { width: "85%", height: "85%", borderWidth: 4, borderColor: "#8B0000", borderRadius: 10 },
  statusText: { fontSize: 24, fontWeight: "bold", color: "#3A0000", textAlign: 'center' },
  waitText: { fontSize: 16, color: "#5B4242", marginTop: 8, marginBottom: 30 },
  progressBar: { width: "100%", borderRadius: 4 },
  progressText: { marginTop: 10, fontSize: 14, color: "#3A0000" },
  matchContainer: { flex: 1, backgroundColor: "#FFFBF8", padding: 20 },
  matchHeaderTitle: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#3A0000", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 20, fontWeight: "bold", color: "#3A0000", marginBottom: 20, textAlign: "center" },
  matchDetailsContainer: { flexDirection: "row", marginBottom: 25 },
  detailsTextContainer: { flex: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  detailLabel: { fontSize: 14, color: "#666", fontWeight: "500", flex: 1 },
  detailValue: { fontSize: 14, color: "#333", flex: 2, textAlign: "right" },
  confidenceText: { color: "#8B0000", fontWeight: "bold", fontSize: 16 },
  matchStatusText: { color: "#2E7D32", fontStyle: "italic" },
  imageWrapper: { marginLeft: 20, justifyContent: 'center' },
  matchedImage: { width: 100, height: 120, borderRadius: 12, backgroundColor: "#f5f5f5", borderWidth: 2, borderColor: "#E4C4C4" },
  actionButtons: { gap: 12 },
  confirmButton: { backgroundColor: "#8B0000", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rejectButton: { backgroundColor: "#f5f5f5", paddingVertical: 15, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#ddd" },
  rejectButtonText: { color: "#666", fontSize: 16, fontWeight: "500" },
});