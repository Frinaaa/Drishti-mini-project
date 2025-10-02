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
import { AI_API_URL } from "../../config/api";
import CustomAlert from "@/components/CustomAlert";

// API response interface
interface MatchResult {
  match_found: boolean;
  confidence: number;
  distance: number;
  matched_image: string;
  file_path: string;
  message: string;
}

// Define the different states our screen can be in
type ScreenState = "camera" | "preview" | "scanning" | "matchFound";

export default function FaceSearchFlowScreen() {
  // --- STATE MANAGEMENT (No Changes Here) ---
  const [screenState, setScreenState] = useState<ScreenState>("camera");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [gender, setGender] = useState<string>("Female");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isApiProcessing, setIsApiProcessing] = useState(false);
  const [searchInitiated, setSearchInitiated] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();

  // CustomAlert state
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
    setAlert((prev) => ({
      ...prev,
      visible: false,
      onCloseCallback: undefined,
    }));
    if (callback) {
      setTimeout(callback, 100); // Small delay to allow modal to close
    }
  };

  // --- HOOKS (No Changes Here) ---
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Streamlined search function
  const handleSearch = useCallback(async () => {
    if (!photoUri) return;

    try {
      setProgress(0.1);
      const base64 = await convertImageToBase64(photoUri);
      setProgress(0.3);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${AI_API_URL}/find_match_react_native`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ file_data: base64 }).toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setProgress(0.8);

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ detail: "Server error" }));
        throw new Error(errorBody.detail || `HTTP ${response.status}`);
      }

      const result: MatchResult = await response.json();
      setProgress(1.0);
      setIsApiProcessing(false);

      if (result.match_found) {
        setMatchResult(result);
        setScreenState("matchFound");
      } else {
        showCustomAlert(
          "No Match Found",
          result.message || "Person not found in database. Sighting logged.",
          "info",
          () => {
            setScreenState("camera");
            router.push("/(police)/police-dashboard");
          }
        );
      }
    } catch (error) {
      setProgress(0);
      setIsApiProcessing(false);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let userMessage = errorMessage;

      if (errorMessage.includes("No face")) {
        userMessage = "No face detected. Please retake with better lighting.";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("timeout")
      ) {
        userMessage = "Network error. Please check connection and try again.";
      }

      showCustomAlert("Search Failed", userMessage, "error", () => {
        setScreenState("camera");
        handleRetake();
      });
    }
  }, [photoUri, router]);

  const handleConfirmOrReject = (isConfirm: boolean) => {
    const title = isConfirm ? "Match Confirmed" : "Match Rejected";
    const message = isConfirm
      ? "Relevant authorities will be notified."
      : "Thank you. Your feedback will improve the system.";
    const alertType = isConfirm ? "success" : "info";
    showCustomAlert(title, message, alertType, () => {
      setSearchInitiated(false);
      setScreenState("camera"); // Reset to camera state
      router.push("/(police)/police-dashboard");
    });
  };

  // --- PROGRESS SIMULATION EFFECT ---
  useEffect(() => {
    if (screenState === "scanning" && !isApiProcessing && searchInitiated) {
      console.log("[FaceSearch] Starting progress simulation");
      // More realistic progress simulation that accounts for actual processing time
      let progressInterval: number;

      const startProgress = () => {
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            // Slower, more realistic progress for actual processing
            if (prev < 0.3) return prev + 0.05; // Face detection phase
            if (prev < 0.7) return prev + 0.03; // Database search phase
            if (prev < 0.9) return prev + 0.02; // Final processing phase
            return 0.9; // Cap at 90% until API takes over
          });
        }, 300) as any;
      };

      startProgress();

      // Start API processing after simulation reaches ~70%
      const apiTimeout = setTimeout(() => {
        console.log("[FaceSearch] Starting API processing");
        setIsApiProcessing(true);
        setSearchInitiated(false); // Prevent re-triggering
        handleSearch();
      }, 2000);

      return () => {
        if (progressInterval) clearInterval(progressInterval);
        if (apiTimeout) clearTimeout(apiTimeout);
      };
    }
  }, [screenState, isApiProcessing, searchInitiated, handleSearch]); // Added searchInitiated and handleSearch to dependencies

  // --- ACTION HANDLERS ---
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
    setScreenState("camera");
    setIsApiProcessing(false);
    setProgress(0);
    setSearchInitiated(false);
  };

  const handleContinueSearch = () => {
    setScreenState("scanning");
    setIsApiProcessing(false);
    setProgress(0);
    setSearchInitiated(true);
  };

  // --- HELPER & RENDER FUNCTIONS ---
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
        {["Male", "Female", "Other"].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              gender === g && styles.genderButtonSelected,
            ]}
            onPress={() => setGender(g)}
          >
            <Text
              style={[
                styles.genderText,
                gender === g && styles.genderTextSelected,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
          Review the captured image before proceeding.
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

  const renderScanningView = () => (
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
      <Text style={styles.statusText}>
        {isApiProcessing ? "Processing with AI..." : "Scanning Face..."}
      </Text>
      <Text style={styles.waitText}>
        {isApiProcessing ? "This may take a few moments" : "Please Wait"}
      </Text>
      <Progress.Bar
        progress={progress}
        width={null}
        height={8}
        color={"#000"}
        unfilledColor={"#e0e0e0"}
        borderWidth={0}
        style={styles.progressBar}
      />
      <Text style={styles.progressText}>{`${Math.round(
        progress * 100
      )}%`}</Text>
    </View>
  );

  const renderMatchFoundView = () => {
    if (!matchResult) return null;

    const confidencePercentage = (matchResult.confidence * 100).toFixed(1);
    const detectionTime = new Date().toLocaleString();
    const imageUrl = `${AI_API_URL}/${matchResult.file_path}`;

    return (
      <ScrollView style={styles.matchContainer}>
        <Text style={styles.matchHeaderTitle}>Match Found!</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Potential Match Detected</Text>

          <View style={styles.matchDetailsContainer}>
            <View style={styles.detailsTextContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confidence:</Text>
                <Text style={[styles.detailValue, styles.confidenceText]}>
                  {confidencePercentage}%
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Matched File:</Text>
                <Text style={styles.detailValue}>
                  {matchResult.matched_image}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Detection Time:</Text>
                <Text style={styles.detailValue}>{detectionTime}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.matchStatusText]}>
                  {matchResult.message}
                </Text>
              </View>
            </View>

            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.matchedImage}
                resizeMode="cover"
                onError={() => console.warn("Failed to load image")}
              />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleConfirmOrReject(true)}
            >
              <Text style={styles.buttonText}>Confirm Match</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleConfirmOrReject(false)}
            >
              <Text style={styles.rejectButtonText}>Reject Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  // --- MAIN RENDER LOGIC (No Changes Here) ---
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text>No access to camera.</Text>
      </View>
    );
  }

  return (
    <>
      {(() => {
        switch (screenState) {
          case "camera":
            return renderCameraView();
          case "preview":
            return renderPreviewView();
          case "scanning":
            return renderScanningView();
          case "matchFound":
            return renderMatchFoundView();
          default:
            return renderCameraView();
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

// --- COMBINED STYLESHEET (No Changes Here) ---
const styles = StyleSheet.create({
  // General & Camera Styles
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
  },
  label: { fontSize: 16, color: "#5B4242", marginBottom: 10 },
  genderContainer: { flexDirection: "row", marginBottom: 20 },
  genderButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#F5EAEA",
    marginRight: 10,
  },
  genderButtonSelected: { backgroundColor: "#3A0000" },
  genderText: { color: "#5B4242" },
  genderTextSelected: { color: "#FFF" },
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
  footer: { paddingBottom: 30, alignItems: "center" },
  captureButton: {
    backgroundColor: "#8B0000",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  flipButton: { marginTop: 15 },
  // Preview Styles
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
  // Scanning Styles
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5EBEB",
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
    borderColor: "#00e676",
    borderRadius: 10,
  },
  statusText: { fontSize: 24, fontWeight: "bold", color: "#333" },
  waitText: { fontSize: 16, color: "#666", marginTop: 8, marginBottom: 30 },
  progressBar: { width: "100%", borderRadius: 4 },
  progressText: { marginTop: 10, fontSize: 14, color: "#333" },
  // Match Found Styles
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
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
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
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flex: 2,
    textAlign: "right",
  },
  confidenceText: {
    color: "#8B0000",
    fontWeight: "bold",
    fontSize: 16,
  },
  matchStatusText: {
    color: "#2E7D32",
    fontStyle: "italic",
  },
  imageWrapper: { marginLeft: 20 },
  matchedImage: {
    width: 100,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#E4C4C4",
  },
  actionButtons: {
    gap: 12,
  },
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
});