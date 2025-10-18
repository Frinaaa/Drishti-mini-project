// app/(police)/face-search.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Progress from "react-native-progress";
import * as Haptics from "expo-haptics";
import { AI_API_URL, BACKEND_API_URL } from "../../config/api";
import CustomAlert from "@/components/CustomAlert";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
interface AiMatchResult {
  match_found: boolean;
  confidence: number;
  distance: number;
  matched_image: string;
  file_path: string;
  message: string;
}

interface ReportDetails {
  _id: string;
  person_name: string;
  age: number;
  gender: string;
  last_seen: string;
  status: string;
}

interface FullMatchDetails {
  confidence: number;
  aiMessage: string;
  imageUrl: string;
  details: ReportDetails;
}

type ScreenState = "camera" | "preview" | "scanning" | "matchFound";

// --- Constants ---
const AI_TIMEOUT = 80000; // 60 seconds
const BACKEND_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;
const IMAGE_QUALITY = 0.3;
const PROGRESS_STEPS = { START: 0, IMAGE_CONVERTED: 0.2, AI_REQUESTED: 0.3, AI_PROCESSING: 0.5, AI_COMPLETE: 0.7, FETCHING_DETAILS: 0.8, COMPLETE: 1.0 };

export default function FaceSearchFlowScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("camera");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [photoData, setPhotoData] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<FullMatchDetails | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scanAnimationRef = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const [alert, setAlert] = useState({ visible: false, title: "", message: "", type: "info" as "success" | "error" | "info", onCloseCallback: undefined as (() => void) | undefined });

  const triggerHaptic = useCallback((type: "success" | "warning" | "error" | "light") => { if (Platform.OS === "ios" || Platform.OS === "android") { switch (type) { case "success": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break; case "warning": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break; case "error": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break; case "light": Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break; } } }, []);
  const showCustomAlert = useCallback((title: string, message: string, type: "success" | "error" | "info" = "info", onOk?: () => void) => { const hapticType = type === "success" ? "success" : type === "error" ? "error" : "warning"; triggerHaptic(hapticType); setAlert({ visible: true, title, message, type, onCloseCallback: onOk }); }, [triggerHaptic]);
  const hideAlert = useCallback(() => { const callback = alert.onCloseCallback; setAlert((prev) => ({ ...prev, visible: false, onCloseCallback: undefined })); if (callback) setTimeout(callback, 100); }, [alert.onCloseCallback]);

  useEffect(() => { Camera.requestCameraPermissionsAsync().then(({ status }) => { setHasPermission(status === "granted"); }); }, []);
  useEffect(() => { if (screenState === "scanning") { Animated.loop(Animated.sequence([Animated.timing(scanAnimationRef, { toValue: 1, duration: 2000, useNativeDriver: true }), Animated.timing(scanAnimationRef, { toValue: 0, duration: 2000, useNativeDriver: true })])).start(); setElapsedTime(0); timerIntervalRef.current = setInterval(() => { setElapsedTime((prev) => prev + 1); }, 1000); } else { scanAnimationRef.setValue(0); if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } setElapsedTime(0); } return () => { if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); } }; }, [screenState, scanAnimationRef]);
  useEffect(() => { return () => { if (abortControllerRef.current) { abortControllerRef.current.abort(); } }; }, []);

  const handleRetake = useCallback(() => { if (abortControllerRef.current) { abortControllerRef.current.abort(); } setPhotoData(null); setMatchResult(null); setProgress(0); setIsLoading(false); setRetryCount(0); setStatusMessage(""); setScreenState("camera"); triggerHaptic("light"); }, [triggerHaptic]);

  const handleSearch = useCallback(async (currentRetry = 0) => {
    if (!photoData || !isLoading) return;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    try {
      setProgress(PROGRESS_STEPS.START);
      setStatusMessage("Preparing image...");
      const base64 = await convertImageToBase64(photoData);
      if (signal.aborted) return;
      setProgress(PROGRESS_STEPS.IMAGE_CONVERTED);
      setStatusMessage("Connecting to AI server...");
      const aiTimeoutId = setTimeout(() => { abortControllerRef.current?.abort(); }, AI_TIMEOUT);
      setProgress(PROGRESS_STEPS.AI_REQUESTED);
      setStatusMessage("Sending to AI server...");
      const progressInterval = setInterval(() => { setProgress((prev) => (prev < 0.6 ? prev + 0.02 : prev)); }, 500);
      const aiResponse = await fetch(`${AI_API_URL}/find_match_react_native`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ file_data: base64 }).toString(), signal });
      clearInterval(progressInterval);
      clearTimeout(aiTimeoutId);
      if (signal.aborted) return;
      setProgress(PROGRESS_STEPS.AI_PROCESSING);
      setStatusMessage("Processing AI response...");
      if (!aiResponse.ok) { const errorBody = await aiResponse.json().catch(() => ({ detail: `Server error: ${aiResponse.status}` })); throw new Error(errorBody.detail || `AI Server error: ${aiResponse.status}`); }
      const aiResult: AiMatchResult = await aiResponse.json();
      if (signal.aborted) return;
      setProgress(PROGRESS_STEPS.AI_COMPLETE);
      setStatusMessage("AI analysis complete!");
      if (!aiResult.match_found) { setProgress(PROGRESS_STEPS.COMPLETE); setIsLoading(false); showCustomAlert("No Match Found", aiResult.message || "No matching person found.", "info", handleRetake); return; }
      setProgress(PROGRESS_STEPS.FETCHING_DETAILS);
      setStatusMessage("Loading report details...");
      const detailsTimeoutId = setTimeout(() => { abortControllerRef.current?.abort(); }, BACKEND_TIMEOUT);
      const detailsResponse = await fetch(`${BACKEND_API_URL}/api/reports/by-filename/${aiResult.matched_image}`, { signal });
      clearTimeout(detailsTimeoutId);
      if (signal.aborted) return;
      if (!detailsResponse.ok) { const errorText = await detailsResponse.text().catch(() => "Unknown error"); throw new Error(`Failed to load report details (${detailsResponse.status}): ${errorText}`); }
      const reportDetails: ReportDetails = await detailsResponse.json();
      setProgress(PROGRESS_STEPS.COMPLETE);
      setStatusMessage("Match found!");
      setIsLoading(false);
      setMatchResult({ confidence: aiResult.confidence, aiMessage: aiResult.message, imageUrl: `${AI_API_URL}/${aiResult.file_path}`, details: reportDetails });
      setScreenState("matchFound");
      triggerHaptic("success");
    } catch (error) {
      if (signal.aborted && error instanceof Error && error.name === "AbortError") { console.log("Search cancelled"); return; }
      setProgress(0); setIsLoading(false); setStatusMessage(""); console.error("Face search failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let userMessage = "An unexpected error occurred during the search.";
      if (error instanceof Error && error.name === "AbortError") { if (currentRetry < MAX_RETRIES) { setStatusMessage(`Retrying... (${currentRetry + 1}/${MAX_RETRIES})`); setRetryCount(currentRetry + 1); setTimeout(() => handleSearch(currentRetry + 1), 1500); return; } userMessage = "The AI server is taking too long to respond. Please try again."; }
      else if (errorMessage.toLowerCase().includes("no face")) { userMessage = "No clear face detected in the image."; }
      else if (errorMessage.includes("Failed to load report details")) { userMessage = "A match was found, but the report details couldn't be loaded."; }
      else if (errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("fetch")) { userMessage = "Network connection issue. Check your internet and try again."; }
      else if (errorMessage.includes("AI Server error")) { userMessage = "The AI service is temporarily unavailable."; }
      showCustomAlert("Search Failed", userMessage, "error", handleRetake);
    }
  }, [photoData, isLoading, handleRetake, showCustomAlert, triggerHaptic]);

  useEffect(() => { if (screenState === "scanning") { handleSearch(); } }, [screenState, handleSearch]);

  const handleConfirmOrReject = useCallback(async (isConfirm: boolean) => {
    if (!matchResult) return;

    if (!isConfirm) {
      triggerHaptic("light");
      showCustomAlert("Match Rejected", "The match result has been dismissed.", "info", handleRetake);
      return;
    }

    if (matchResult.details.status === "Found") {
      showCustomAlert("Already Found", "This person has already been marked as 'Found'.", "info");
      return;
    }

    if (isConfirming) return;
    setIsConfirming(true);

    try {
      triggerHaptic("light");
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error("Authentication token is missing.");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);

      const response = await fetch(`${BACKEND_API_URL}/api/reports/found/${matchResult.details._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ source: 'Police Face Search' }), // Send the correct source
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || "Failed to update report status.");

      showCustomAlert("Match Confirmed!", data.msg, "success", () => {
        router.replace("/(police)/reports");
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      showCustomAlert("Confirmation Failed", `Could not update the report status. ${errorMessage}`, "error");
    } finally {
      setIsConfirming(false);
    }
  }, [matchResult, isConfirming, showCustomAlert, handleRetake, router, triggerHaptic]);

  const handleTakePhoto = useCallback(async () => { if (!cameraRef.current) return; try { triggerHaptic("light"); const photo = await cameraRef.current.takePictureAsync({ quality: IMAGE_QUALITY, base64: true, exif: false }); setPhotoData(photo); setScreenState("preview"); } catch (error) { console.error("Camera capture error:", error); showCustomAlert("Capture Error", "Failed to capture photo.", "error"); } }, [triggerHaptic, showCustomAlert]);
  const handleContinueSearch = useCallback(() => { triggerHaptic("light"); setIsLoading(true); setRetryCount(0); setScreenState("scanning"); }, [triggerHaptic]);
  const handleCancelSearch = useCallback(() => { if (abortControllerRef.current) { abortControllerRef.current.abort(); } triggerHaptic("light"); setIsLoading(false); setProgress(0); setStatusMessage(""); setScreenState("preview"); }, [triggerHaptic]);
  const convertImageToBase64 = useCallback(async (photo: any): Promise<string> => { try { if (photo.base64) return photo.base64; if (photo.uri) { const response = await fetch(photo.uri); if (!response.ok) throw new Error("Failed to fetch image from URI"); const blob = await response.blob(); return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; const base64Data = result.replace(/^data:image\/[a-z]+;base64,/, ""); resolve(base64Data); }; reader.onerror = () => reject(new Error("Failed to read image as base64")); reader.readAsDataURL(blob); }); } throw new Error("Invalid photo object"); } catch (error) { console.error("Image conversion error:", error); throw new Error(`Failed to convert image: ${error instanceof Error ? error.message : "Unknown error"}`); } }, []);

  const renderCameraView = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Search by Face</Text>
      <View style={styles.cameraOuterContainer}><CameraView ref={cameraRef} style={styles.camera} facing={facing} ratio="1:1" /></View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}><Ionicons name="camera" size={32} color="#FFF" /></TouchableOpacity>
        <TouchableOpacity style={styles.flipButton} onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}><Ionicons name="camera-reverse-outline" size={28} color="#3A0000" /></TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewView = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Preview Photo</Text>
      <View style={styles.imageContainer}>{photoData?.uri && <Image source={{ uri: photoData.uri }} style={styles.image} resizeMode="contain" />}</View>
      <View style={styles.infoBox}><Text style={styles.infoText}>Ensure the face is clear and well-lit.</Text></View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}><Text style={styles.retakeButtonText}>Retake</Text></TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueSearch}><Text style={styles.continueButtonText}>Continue Search</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderScanningView = () => {
    const scanBoxTranslate = scanAnimationRef.interpolate({ inputRange: [0, 1], outputRange: [-100, 100] });
    const getHelperText = () => { if (progress < 0.3) return "Preparing image..."; if (progress < 0.6) return "AI is analyzing the face (may take 30-60s)"; if (progress < 0.8) return "Almost done, fetching details..."; return "Finalizing results..."; };
    return (
      <View style={styles.scanningContainer}>
        <View style={styles.scanContainer}>{photoData?.uri && <Image source={{ uri: photoData.uri }} style={styles.image} resizeMode="contain" />}<View style={styles.overlay}><View style={styles.scanBox}><Animated.View style={[styles.scanLine, { transform: [{ translateY: scanBoxTranslate }] }]} /></View></View></View>
        <Text style={styles.statusText}>{statusMessage || "Analyzing face..."}</Text>
        {retryCount > 0 && <Text style={styles.retryText}>Retry attempt {retryCount} of {MAX_RETRIES}</Text>}
        <Text style={styles.waitText}>{getHelperText()}</Text>
        <Progress.Bar progress={progress} width={null} height={10} color={"#8B0000"} unfilledColor={"#e0e0e0"} borderWidth={0} borderRadius={5} style={styles.progressBar} />
        <View style={styles.progressInfo}><Text style={styles.progressText}>{Math.round(progress * 100)}%</Text><Text style={styles.timerText}>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, "0")}</Text></View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}><Ionicons name="close-circle-outline" size={20} color="#666" /><Text style={styles.cancelButtonText}>Cancel Search</Text></TouchableOpacity>
      </View>
    );
  };

  const renderMatchFoundView = useMemo(() => {
    if (!matchResult) return null;
    const confidencePercentage = (matchResult.confidence * 100).toFixed(1);
    const isAlreadyFound = matchResult.details.status === "Found";
    const isHighConfidence = matchResult.confidence >= 0.8;
    return (
      <ScrollView style={styles.matchContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.successBadge}><Ionicons name="checkmark-circle" size={60} color="#2E7D32" /><Text style={styles.matchHeaderTitle}>Match Found!</Text></View>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>{matchResult.details.person_name}</Text>{isHighConfidence && <View style={styles.highConfidenceBadge}><Ionicons name="shield-checkmark" size={16} color="#FFF" /><Text style={styles.highConfidenceText}>High Match</Text></View>}</View>
          <View style={styles.matchDetailsContainer}>
            <View style={styles.detailsTextContainer}>
              <View style={styles.detailRow}><Ionicons name="analytics" size={18} color="#8B0000" /><Text style={styles.detailLabel}>Confidence:</Text><Text style={[styles.detailValue, styles.confidenceText]}>{confidencePercentage}%</Text></View>
              <View style={styles.detailRow}><Ionicons name="person" size={18} color="#666" /><Text style={styles.detailLabel}>Name:</Text><Text style={styles.detailValue}>{matchResult.details.person_name}</Text></View>
              <View style={styles.detailRow}><Ionicons name="calendar" size={18} color="#666" /><Text style={styles.detailLabel}>Age:</Text><Text style={styles.detailValue}>{matchResult.details.age} years</Text></View>
              <View style={styles.detailRow}><Ionicons name="male-female" size={18} color="#666" /><Text style={styles.detailLabel}>Gender:</Text><Text style={styles.detailValue}>{matchResult.details.gender}</Text></View>
              <View style={styles.detailRow}><Ionicons name={isAlreadyFound ? "checkmark-done-circle" : "time"} size={18} color={isAlreadyFound ? "#2E7D32" : "#B8860B"} /><Text style={styles.detailLabel}>Status:</Text><Text style={[styles.detailValue, isAlreadyFound ? styles.foundStatusText : styles.matchStatusText]}>{matchResult.details.status}</Text></View>
            </View>
            <View style={styles.imageWrapper}><Image source={{ uri: matchResult.imageUrl }} style={styles.matchedImage} resizeMode="cover" /><Text style={styles.imageLabel}>From Database</Text></View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.confirmButton, (isAlreadyFound || isConfirming) && styles.disabledButton]} onPress={() => handleConfirmOrReject(true)} disabled={isAlreadyFound || isConfirming}>
              {isConfirming ? <ActivityIndicator color="#fff" /> : <Ionicons name={isAlreadyFound ? "lock-closed" : "checkmark-circle"} size={20} color="#FFF" />}
              <Text style={styles.buttonText}>{isAlreadyFound ? "Already Found" : "Confirm Match"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => handleConfirmOrReject(false)} disabled={isConfirming}><Ionicons name="close-circle-outline" size={20} color="#666" /><Text style={styles.rejectButtonText}>Reject Match</Text></TouchableOpacity>
            <TouchableOpacity style={styles.searchAgainButton} onPress={handleRetake} disabled={isConfirming}><Ionicons name="camera-outline" size={20} color="#8B0000" /><Text style={styles.searchAgainButtonText}>Search Again</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }, [matchResult, isConfirming, handleConfirmOrReject, handleRetake]);

  if (hasPermission === null) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#8B0000" /><Text style={styles.loadingText}>Requesting permissions...</Text></View>;
  if (hasPermission === false) return <View style={styles.centerContainer}><Ionicons name="camera-outline" size={60} color="#999" /><Text style={styles.errorText}>Camera access denied</Text><Text style={styles.errorSubtext}>Please grant camera permission in your device settings.</Text></View>;

  return (
    <>
      {(() => { switch (screenState) { case "camera": return renderCameraView(); case "preview": return renderPreviewView(); case "scanning": return renderScanningView(); case "matchFound": return renderMatchFoundView; default: return renderCameraView(); } })()}
      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF8", paddingHorizontal: 20, paddingTop: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFBF8", padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, color: "#5B4242" },
  errorText: { marginTop: 20, fontSize: 20, fontWeight: "bold", color: "#3A0000", textAlign: "center" },
  errorSubtext: { marginTop: 10, fontSize: 14, color: "#666", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#3A0000", marginBottom: 20, textAlign: "center" },
  cameraOuterContainer: { flex: 1, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: "#E4C4C4", marginBottom: 20, backgroundColor: "#000" },
  camera: { flex: 1 },
  footer: { paddingBottom: 30, alignItems: "center", position: "relative", width: "100%" },
  captureButton: { backgroundColor: "#8B0000", width: 70, height: 70, borderRadius: 35, justifyContent: "center", alignItems: "center", elevation: 4 },
  flipButton: { position: "absolute", right: 20, bottom: 45 },
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
  scanBox: { width: "85%", height: "85%", borderWidth: 4, borderColor: "#8B0000", borderRadius: 10, overflow: "hidden" },
  scanLine: { width: "100%", height: 3, backgroundColor: "#8B0000", shadowColor: "#8B0000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 5 },
  statusText: { fontSize: 20, fontWeight: "bold", color: "#3A0000", textAlign: "center", marginTop: 20 },
  retryText: { fontSize: 14, color: "#B8860B", textAlign: "center", marginTop: 8, fontStyle: "italic" },
  waitText: { fontSize: 15, color: "#5B4242", marginTop: 8, marginBottom: 25, textAlign: "center" },
  progressBar: { width: "100%", borderRadius: 5, marginTop: 5 },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 15, paddingHorizontal: 10 },
  progressText: { fontSize: 18, fontWeight: "700", color: "#3A0000" },
  timerText: { fontSize: 16, fontWeight: "500", color: "#666", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  matchContainer: { flex: 1, backgroundColor: "#FFFBF8", padding: 20 },
  successBadge: { alignItems: "center", marginBottom: 25 },
  matchHeaderTitle: { fontSize: 26, fontWeight: "bold", textAlign: "center", color: "#2E7D32", marginTop: 10 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, marginBottom: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  cardTitle: { fontSize: 22, fontWeight: "bold", color: "#3A0000", flex: 1 },
  highConfidenceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#2E7D32", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  highConfidenceText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  matchDetailsContainer: { flexDirection: "row", marginBottom: 25, gap: 15 },
  detailsTextContainer: { flex: 1 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: "#f9f9f9", borderRadius: 8, gap: 8 },
  detailLabel: { fontSize: 14, color: "#666", fontWeight: "500", flex: 1 },
  detailValue: { fontSize: 14, color: "#333", fontWeight: "600", flex: 1.5, textAlign: "right" },
  confidenceText: { color: "#8B0000", fontWeight: "bold", fontSize: 16 },
  matchStatusText: { color: "#B8860B", fontStyle: "italic" },
  foundStatusText: { color: "#2E7D32", fontStyle: "italic", fontWeight: "bold" },
  imageWrapper: { justifyContent: "center", alignItems: "center" },
  matchedImage: { width: 110, height: 130, borderRadius: 12, backgroundColor: "#f5f5f5", borderWidth: 3, borderColor: "#E4C4C4" },
  imageLabel: { fontSize: 11, color: "#999", marginTop: 6, fontStyle: "italic" },
  actionButtons: { gap: 12 },
  confirmButton: { flexDirection: "row", backgroundColor: "#8B0000", paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8, elevation: 2, shadowColor: "#8B0000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rejectButton: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ddd", gap: 8 },
  rejectButtonText: { color: "#666", fontSize: 16, fontWeight: "500" },
  searchAgainButton: { flexDirection: "row", backgroundColor: "transparent", paddingVertical: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#8B0000", gap: 8 },
  searchAgainButtonText: { color: "#8B0000", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#cccccc", borderColor: "#999999", elevation: 0, shadowOpacity: 0 },
  cancelButton: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginTop: 25, borderWidth: 1, borderColor: "#ddd", alignItems: "center", justifyContent: "center", gap: 8 },
  cancelButtonText: { color: "#666", fontSize: 15, fontWeight: "500" },
});