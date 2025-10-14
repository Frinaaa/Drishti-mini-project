// app/(police)/face-search.tsx
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
import { AI_API_URL, BACKEND_API_URL } from "../../config/api";
import CustomAlert from "@/components/CustomAlert";

// --- Types (Unchanged) ---
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
  
  const handleRetake = () => {
    setPhotoUri(null);
    setMatchResult(null);
    setProgress(0);
    setScreenState("camera");
  };

  const handleSearch = useCallback(async () => {
    if (!photoUri) return;
    setProgress(0);

    try {
      setProgress(0.1);
      const base64 = await convertImageToBase64(photoUri);
      setProgress(0.2);

      const aiController = new AbortController();
      const aiTimeoutId = setTimeout(() => aiController.abort(), 45000);

      setProgress(0.3);
      const aiResponse = await fetch(`${AI_API_URL}/find_match_react_native`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ file_data: base64 }).toString(),
        signal: aiController.signal,
      });
      clearTimeout(aiTimeoutId);
      setProgress(0.7);

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.json().catch(() => ({ detail: "AI Server error" }));
        throw new Error(errorBody.detail || `AI Server responded with status ${aiResponse.status}`);
      }

      const aiResult: AiMatchResult = await aiResponse.json();
      setProgress(0.8);

      if (!aiResult.match_found) {
        setProgress(1.0);
        showCustomAlert(
          "No Match Found",
          aiResult.message || "Person not found in verified reports.",
          "info",
          handleRetake
        );
        return;
      }

      const detailsController = new AbortController();
      const detailsTimeoutId = setTimeout(() => detailsController.abort(), 10000);

      const detailsResponse = await fetch(
        `${BACKEND_API_URL}/api/reports/by-filename/${aiResult.matched_image}`,
        { signal: detailsController.signal }
      );
      clearTimeout(detailsTimeoutId);
      setProgress(0.9);

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text().catch(() => "Unknown backend error");
        throw new Error(`Backend server error (${detailsResponse.status}): ${errorText}`);
      }

      const reportDetails: ReportDetails = await detailsResponse.json();
      setProgress(1.0);

      setMatchResult({
        confidence: aiResult.confidence,
        aiMessage: aiResult.message,
        imageUrl: `${AI_API_URL}/${aiResult.file_path}`,
        details: reportDetails,
      });
      setScreenState("matchFound");

    } catch (error) {
      setProgress(0);
      console.error("Face search process failed:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let userMessage = "An unexpected error occurred during the search.";

      if (error instanceof Error && error.name === "AbortError") {
        userMessage = "AI analysis timed out. This can happen if the server is busy or during the first scan of the day. Please try again.";
      } else if (errorMessage.includes("No face detected")) {
        userMessage = "No face detected in the image. Please capture a clearer picture.";
      } else if (errorMessage.includes("Backend server error") || errorMessage.includes("Report not found")) {
        userMessage = "A match was found by the AI, but the corresponding report details could not be loaded from the database.";
      } else if (errorMessage.includes("AI Server")) {
        userMessage = "The AI analysis service is currently unavailable. Please try again later.";
      }

      showCustomAlert("Search Failed", userMessage, "error", handleRetake);
    }
  }, [photoUri]);

  useEffect(() => {
    if (screenState === "scanning") {
      handleSearch();
    }
  }, [screenState, handleSearch]);

  const handleConfirmOrReject = async (isConfirm: boolean) => {
    if (!matchResult) return;

    // The "Reject" action is purely a UI dismissal. It resets the state.
    if (!isConfirm) {
      showCustomAlert( "Match Rejected", "Thank you for your feedback. The result has been dismissed.", "info", handleRetake );
      return;
    }

    // The "Confirm" action only proceeds if the report is NOT already found.
    if (matchResult.details.status === 'Found') {
        showCustomAlert("Already Found", "This report has already been marked as 'Found'. No further action is needed.", "info");
        return;
    }

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/reports/found/${matchResult.details._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || "Failed to update report status.");
      }
      showCustomAlert("Match Confirmed!", data.msg, "success", () => {
        router.replace("/(police)/police-dashboard");
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      showCustomAlert("Confirmation Failed", `Could not update the report. Reason: ${errorMessage}`, "error");
    }
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
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          ratio="1:1"
        />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakePhoto}
        >
          <Ionicons name="camera" size={32} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() =>
            setFacing((current) => (current === "back" ? "front" : "back"))
          }
        >
          <Ionicons name="camera-reverse-outline" size={28} color="#3A0000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewView = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Preview Photo</Text>
      <View style={styles.imageContainer}>
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Ensure the face is clear and well-lit before proceeding.
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueSearch}
        >
          <Text style={styles.continueButtonText}>Continue Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScanningView = () => {
    const statusMessage =
      progress < 0.4 ? "Analyzing photo..." : "Searching database with AI...";
    return (
      <View style={styles.scanningContainer}>
        <View style={styles.scanContainer}>
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={styles.image}
              resizeMode="contain"
            />
          )}
          <View style={styles.overlay}>
            <View style={styles.scanBox} />
          </View>
        </View>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <Text style={styles.waitText}>This may take a few moments</Text>
        <Progress.Bar
          progress={progress}
          width={null}
          height={8}
          color={"#8B0000"}
          unfilledColor={"#e0e0e0"}
          borderWidth={0}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>{`${Math.round(
          progress * 100
        )}%`}</Text>
      </View>
    );
  };

  const renderMatchFoundView = () => {
    if (!matchResult) return null;
    const confidencePercentage = (matchResult.confidence * 100).toFixed(1);
    
    // --- THIS IS THE FIX ---
    // A variable to check the status and control the button's appearance and behavior.
    const isAlreadyFound = matchResult.details.status === 'Found';

    return (
      <ScrollView style={styles.matchContainer}>
        <Text style={styles.matchHeaderTitle}>Match Found!</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Potential Match: {matchResult.details.person_name}
          </Text>
          <View style={styles.matchDetailsContainer}>
            <View style={styles.detailsTextContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confidence:</Text>
                <Text style={[styles.detailValue, styles.confidenceText]}>
                  {confidencePercentage}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {matchResult.details.person_name}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age:</Text>
                <Text style={styles.detailValue}>
                  {matchResult.details.age}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender:</Text>
                <Text style={styles.detailValue}>
                  {matchResult.details.gender}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, isAlreadyFound ? styles.foundStatusText : styles.matchStatusText]}>
                  {matchResult.details.status}
                </Text>
              </View>
            </View>
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: matchResult.imageUrl }}
                style={styles.matchedImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <View style={styles.actionButtons}>
            {/* The "Confirm" button is now disabled and styled differently if the person is already found */}
            <TouchableOpacity
              style={[styles.confirmButton, isAlreadyFound && styles.disabledButton]}
              onPress={() => handleConfirmOrReject(true)}
              disabled={isAlreadyFound}
            >
              <Text style={styles.buttonText}>{isAlreadyFound ? 'Already Found' : 'Confirm Match'}</Text>
            </TouchableOpacity>
            
            {/* The "Reject" button is unchanged and works as expected (dismisses the view) */}
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleConfirmOrReject(false)}
            >
              <Text style={styles.rejectButtonText}>Reject Match</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.searchAgainButton}
              onPress={handleRetake}
            >
              <Text style={styles.searchAgainButtonText}>Search Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (hasPermission === null)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  if (hasPermission === false)
    return (
      <View style={styles.centerContainer}>
        <Text>No access to camera.</Text>
      </View>
    );

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
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />
    </>
  );
}

const styles = StyleSheet.create({
  //... (all other styles are unchanged)
  container: {
    flex: 1,
    backgroundColor: "#FFFBF8",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3A0000",
    marginBottom: 20,
    textAlign: "center",
  },
  cameraOuterContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E4C4C4",
    marginBottom: 20,
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  footer: {
    paddingBottom: 30,
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  captureButton: {
    backgroundColor: "#8B0000",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  flipButton: { position: "absolute", right: 20, bottom: 45 },
  previewContainer: {
    flex: 1,
    backgroundColor: "#FFFBF8",
    padding: 20,
    justifyContent: "space-between",
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#3A0000",
  },
  imageContainer: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    maxHeight: "60%",
  },
  image: { width: "100%", height: "100%" },
  infoBox: {
    padding: 15,
    backgroundColor: "#F5EAEA",
    borderRadius: 10,
    marginBottom: 30,
  },
  infoText: {
    textAlign: "center",
    color: "#5B4242",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    marginRight: 10,
  },
  retakeButtonText: { color: "#333", fontSize: 16, fontWeight: "bold" },
  continueButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 10,
    backgroundColor: "#8B0000",
    alignItems: "center",
    marginLeft: 10,
  },
  continueButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFBF8",
    padding: 40,
  },
  scanContainer: {
    width: 250,
    height: 250,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 30,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanBox: {
    width: "85%",
    height: "85%",
    borderWidth: 4,
    borderColor: "#8B0000",
    borderRadius: 10,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3A0000",
    textAlign: "center",
  },
  waitText: { fontSize: 16, color: "#5B4242", marginTop: 8, marginBottom: 30 },
  progressBar: { width: "100%", borderRadius: 4 },
  progressText: { marginTop: 10, fontSize: 14, color: "#3A0000" },
  matchContainer: { flex: 1, backgroundColor: "#FFFBF8", padding: 20 },
  matchHeaderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3A0000",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3A0000",
    marginBottom: 20,
    textAlign: "center",
  },
  matchDetailsContainer: { flexDirection: "row", marginBottom: 25 },
  detailsTextContainer: { flex: 1 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: { fontSize: 14, color: "#666", fontWeight: "500", flex: 1 },
  detailValue: { fontSize: 14, color: "#333", flex: 2, textAlign: "right" },
  confidenceText: { color: "#8B0000", fontWeight: "bold", fontSize: 16 },
  matchStatusText: { color: "#B8860B", fontStyle: "italic" }, // Dark Golden Rod for pending/verified
  foundStatusText: { color: "#2E7D32", fontStyle: "italic", fontWeight: 'bold' }, // Green and bold for found
  imageWrapper: { marginLeft: 20, justifyContent: "center" },
  matchedImage: {
    width: 100,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#E4C4C4",
  },
  actionButtons: { gap: 12 },
  confirmButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rejectButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  rejectButtonText: { color: "#666", fontSize: 16, fontWeight: "500" },
  searchAgainButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#8B0000",
  },
  searchAgainButtonText: {
    color: "#8B0000",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Added style for the disabled button
  disabledButton: {
    backgroundColor: '#cccccc',
    borderColor: '#999999'
  },
});