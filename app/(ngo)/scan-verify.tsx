// app/(ngo)/scan-verify.tsx
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
  Image,
  // Alert, // We will use CustomAlert instead
  Platform,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { AI_API_URL, BACKEND_API_URL } from "../../config/api";
// --- FIX #1: Import the CustomAlert component ---
import CustomAlert from "../../components/CustomAlert";

// --- (Constants and Types are unchanged) ---
const { width: screenWidth } = Dimensions.get("window");
const CAMERA_VIEW_HEIGHT = 350;
const FRAME_INTERVAL = 300;
const CONNECTION_TIMEOUT = 8000;
const MIN_CONFIDENCE_THRESHOLD = 40;

type StatusType =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "processing"
  | "error"
  | "success"
  | "warning";

interface ReportDetails {
  _id: string;
  person_name: string;
  age: number;
  gender: string;
  last_seen: string;
  description: string;
  status: string;
  reported_at: string;
  pinCode: string;
}

interface FoundMatch {
  filename: string;
  confidence: number;
  file_path: string;
  liveCaptureUri: string;
  reportDetails?: ReportDetails;
  reportId?: string;
}

interface StatusInfo {
  message: string;
  type: StatusType;
  color: string;
  icon?: string;
  animated?: boolean;
}

const STATUS_CONFIG = {
  idle: { color: "#666", bgColor: "#f5f5f5", icon: "radio-button-unchecked" },
  connecting: { color: "#ff9800", bgColor: "#fff3e0", icon: "wifi" },
  connected: { color: "#2196f3", bgColor: "#e3f2fd", icon: "wifi" },
  streaming: { color: "#4caf50", bgColor: "#e8f5e8", icon: "videocam" },
  processing: { color: "#ff9800", bgColor: "#fff3e0", icon: "search" },
  error: { color: "#f44336", bgColor: "#ffebee", icon: "error" },
  success: { color: "#4caf50", bgColor: "#e8f5e8", icon: "check-circle" },
  warning: { color: "#ff9800", bgColor: "#fff3e0", icon: "warning" },
} as const;

// --- (Custom Hooks are unchanged) ---
const useStatusManager = () => {
  const [currentStatus, setCurrentStatus] = useState<StatusInfo>({
    message: "Tap 'Start Live Scan' to begin",
    type: "idle",
    color: STATUS_CONFIG.idle.color,
  });
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  const updateStatus = useCallback(
    (message: string, type: StatusType, animated: boolean = false) => {
      setCurrentStatus({
        message,
        type,
        color: STATUS_CONFIG[type].color,
        animated,
      });
      if (animated) {
        startPulseAnimation();
      }
    },
    [startPulseAnimation]
  );

  return { currentStatus, updateStatus, pulseAnimation };
};

const useWebSocketManager = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const frameSenderIntervalRef = useRef<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const disconnectWebSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsStreaming(false);
  }, []);

  return {
    wsRef,
    frameSenderIntervalRef,
    isStreaming,
    setIsStreaming,
    connectionAttempts,
    setConnectionAttempts,
    disconnectWebSocket,
  };
};

// --- Main Component ---
export default function ScanVerifyScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const {
    wsRef,
    frameSenderIntervalRef,
    isStreaming,
    setIsStreaming,
    connectionAttempts,
    setConnectionAttempts,
    disconnectWebSocket,
  } = useWebSocketManager();
  const { currentStatus, updateStatus, pulseAnimation } = useStatusManager();

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [foundMatches, setFoundMatches] = useState<FoundMatch[]>([]);
  const [faceBox, setFaceBox] = useState<any>(null);
  const [lastPhotoDims, setLastPhotoDims] = useState({ width: 1, height: 1 });

  // --- FIX #2: Add state management for the CustomAlert ---
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info",
    onCloseCallback: undefined as (() => void) | undefined,
  });

  const showAlert = (
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
    if (callback) setTimeout(callback, 100);
  };
  // --- END OF FIX ---

  const sendFrame = useCallback(async () => {
    if (cameraRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
        });
        if (photo?.base64) {
          setLastPhotoDims({ width: photo.width, height: photo.height });
          wsRef.current.send(photo.base64);
        }
      } catch {
        console.warn("Error sending frame");
      }
    }
  }, [cameraRef, wsRef]);

  const fetchReportDetails = useCallback(
    async (filename: string): Promise<ReportDetails | null> => {
      try {
        const response = await fetch(
          `${BACKEND_API_URL}/api/reports/by-filename/${filename}`
        );
        if (!response.ok) {
          console.warn(`Could not fetch details for ${filename}`);
          return null;
        }
        const reportDetails: ReportDetails = await response.json();
        return reportDetails;
      } catch (error) {
        console.error("Error fetching report details:", error);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    Camera.requestCameraPermissionsAsync();
    return () => {
      disconnectWebSocket();
      if (frameSenderIntervalRef.current) {
        clearInterval(frameSenderIntervalRef.current);
      }
    };
  }, [disconnectWebSocket, frameSenderIntervalRef]);

  useEffect(() => {
    if (isStreaming && isCameraReady) {
      frameSenderIntervalRef.current = setInterval(sendFrame, FRAME_INTERVAL);
    }
    return () => {
      if (frameSenderIntervalRef.current) {
        clearInterval(frameSenderIntervalRef.current);
      }
    };
  }, [isStreaming, isCameraReady, sendFrame, frameSenderIntervalRef]);

  const connectWebSocket = useCallback(() => {
    // ... (connectWebSocket logic is unchanged)
    if (!AI_API_URL) {
      updateStatus("API URL not configured. Check config/api.js", "error");
      return;
    }

    const wsUrl = AI_API_URL.replace(/^http/, "ws") + "/ws/live_stream";
    wsRef.current = new WebSocket(wsUrl);
    updateStatus("🔄 Connecting to server...", "connecting", true);

    const connectionTimeout = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        updateStatus(
          `❌ Connection failed (${connectionAttempts} attempts). Check server & network.`,
          "error"
        );
        wsRef.current?.close();
        setIsStreaming(false);
      }
    }, CONNECTION_TIMEOUT);

    wsRef.current.onopen = () => {
      clearTimeout(connectionTimeout);
      setConnectionAttempts(0);
      updateStatus("✅ Connected! Analyzing faces...", "connected");
      setTimeout(() => {
        updateStatus(
          "📹 Streaming active - Position face in camera",
          "streaming"
        );
      }, 1000);
      setIsStreaming(true);
    };

    wsRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.face_detected && data.face_box) {
          const { width: photoWidth, height: photoHeight } = lastPhotoDims;
          const scaleX = screenWidth / photoWidth;
          const scaleY = CAMERA_VIEW_HEIGHT / photoHeight;
          setFaceBox({
            top: data.face_box.y * scaleY,
            left: data.face_box.x * scaleX,
            width: data.face_box.width * scaleX,
            height: data.face_box.height * scaleY,
          });

          if (data.match_result?.match_found) {
            updateStatus("🎯 Processing match result...", "processing", true);
          } else if (
            data.match_result === null ||
            (data.match_result && !data.match_result.match_found)
          ) {
            updateStatus(
              "✅ Face detected - Scanning database images...",
              "processing"
            );
          } else {
            updateStatus(
              "👤 Face detected - Scanning database...",
              "processing",
              true
            );
          }
        } else {
          setFaceBox(null);
          updateStatus("🔍 Looking for faces...", "streaming");
        }

        const newMatch = data.match_result;
        if (newMatch?.match_found) {
          const confidencePercentage = newMatch.confidence * 100;
          if (confidencePercentage >= MIN_CONFIDENCE_THRESHOLD) {
            const isAlreadyFound = foundMatches.some(
              (m) => m.filename === newMatch.filename
            );
            if (!isAlreadyFound) {
              updateStatus(
                `🎯 Match found! Confidence: ${confidencePercentage.toFixed(
                  1
                )}%`,
                "success",
                true
              );

              const reportDetails = await fetchReportDetails(newMatch.filename);
              const photo = await cameraRef.current?.takePictureAsync({
                quality: 0.7,
              });

              if (photo) {
                const matchWithDetails = {
                  ...newMatch,
                  liveCaptureUri: photo.uri,
                  reportDetails,
                  reportId: reportDetails?._id,
                };
                setFoundMatches((prev) => [matchWithDetails, ...prev]);
              }
            }
          } else {
            updateStatus(
              `⚠️ Potential match (${confidencePercentage.toFixed(
                1
              )}%) - below ${MIN_CONFIDENCE_THRESHOLD}% threshold`,
              "warning"
            );
          }
        }
      } catch {
        updateStatus("⚠️ Processing error - continuing...", "warning");
      }
    };

    wsRef.current.onerror = (error) => {
      clearTimeout(connectionTimeout);
      updateStatus("❌ Connection error. Check network and server.", "error");
      setIsStreaming(false);
    };

    wsRef.current.onclose = (event) => {
      clearTimeout(connectionTimeout);
      const reason =
        event.code === 1000 ? "Server closed connection" : "Connection lost";
      updateStatus(`🔌 ${reason} - Tap to reconnect`, "warning");
      setIsStreaming(false);
      setFaceBox(null);
    };
  }, [
    updateStatus,
    connectionAttempts,
    setIsStreaming,
    setConnectionAttempts,
    lastPhotoDims,
    foundMatches,
    fetchReportDetails,
    cameraRef,
    wsRef,
  ]);

  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      disconnectWebSocket();
      updateStatus("⏹️ Scan stopped. Tap 'Start' to begin.", "idle");
    } else {
      setFoundMatches([]);
      connectWebSocket();
    }
  }, [isStreaming, disconnectWebSocket, updateStatus, connectWebSocket]);

  // --- FIX #3: Refactor handleConfirmOrReject to use the new showAlert function ---
  const handleConfirmOrReject = useCallback(
    async (isConfirm: boolean, matchToRemove: FoundMatch) => {
      if (!isConfirm) {
        showAlert(
          "Match Rejected",
          "Thank you for your feedback. This result will be dismissed.",
          "info",
          () => {
            setFoundMatches((prev) =>
              prev.filter((m) => m.filename !== matchToRemove.filename)
            );
          }
        );
        return;
      }

      if (matchToRemove.reportDetails?.status === "Found") {
        showAlert(
          "Already Found",
          "This report has already been marked as 'Found'. No further action is needed.",
          "info"
        );
        return;
      }

      if (matchToRemove.reportId) {
        try {
          const response = await fetch(
            `${BACKEND_API_URL}/api/reports/found/${matchToRemove.reportId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
            }
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.msg || "Failed to update report status.");
          }

          showAlert("Match Confirmed!", data.msg, "success", () => {
            setFoundMatches((prev) =>
              prev.filter((m) => m.reportId !== matchToRemove.reportId)
            );
            router.push("/(ngo)/ngo-dashboard");
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "An unknown error occurred.";
          showAlert(
            "Confirmation Failed",
            `Could not update the report. Reason: ${errorMessage}`,
            "error"
          );
        }
      } else {
        showAlert(
          "Confirmation Error",
          "Cannot confirm match because the report ID is missing.",
          "error"
        );
      }
    },
    [setFoundMatches, router]
  );
  // --- END OF FIX ---

  const StatusCard = useMemo(
    () => (
      // ... (StatusCard logic is unchanged)
      <View
        style={[
          styles.statusCard,
          { backgroundColor: STATUS_CONFIG[currentStatus.type].bgColor },
        ]}
      >
        <View style={styles.statusHeader}>
          <MaterialIcons
            name={STATUS_CONFIG[currentStatus.type].icon as any}
            size={20}
            color={STATUS_CONFIG[currentStatus.type].color}
            style={styles.statusIcon}
          />
          <Text
            style={[
              styles.cardTitle,
              { color: STATUS_CONFIG[currentStatus.type].color },
            ]}
          >
            {isStreaming ? "Live Scanning" : "Scan Status"}
          </Text>
        </View>
        <Animated.Text
          style={[
            styles.statusMessage,
            {
              color: STATUS_CONFIG[currentStatus.type].color,
              transform: currentStatus.animated
                ? [{ scale: pulseAnimation }]
                : [{ scale: 1 }],
            },
          ]}
        >
          {currentStatus.message}
        </Animated.Text>
      </View>
    ),
    [currentStatus, isStreaming, pulseAnimation]
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Live Face Scan</Text>

        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={StyleSheet.absoluteFill}>
            {faceBox && (
              <View
                style={[
                  styles.faceBox,
                  {
                    top: faceBox.top,
                    left: faceBox.left,
                    width: faceBox.width,
                    height: faceBox.height,
                  },
                ]}
              />
            )}
          </View>
          <TouchableOpacity style={styles.scanButton} onPress={toggleStreaming}>
            <Text style={styles.scanButtonText}>
              {isStreaming ? "Stop Scan" : "Start Live Scan"}
            </Text>
          </TouchableOpacity>
        </View>

        {StatusCard}

        {foundMatches.length > 0 && (
          <View style={styles.matchListContainer}>
            <Text style={styles.matchListHeader}>
              Found Matches ({foundMatches.length})
            </Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchListScrollView}
            >
              {foundMatches.map((match, index) => (
                <MatchCard
                  key={`${match.reportId || match.filename}-${index}`}
                  match={match}
                  onAction={handleConfirmOrReject}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
      {/* --- FIX #4: Render the CustomAlert component --- */}
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

const MatchCard = React.memo(
  ({
    match,
    onAction,
  }: {
    match: FoundMatch;
    onAction: (isConfirm: boolean, match: FoundMatch) => void;
  }) => {
    const confidencePercentage = useMemo(
      () => (match.confidence * 100).toFixed(1),
      [match.confidence]
    );
    const matchedImageUri = useMemo(
      () => `${AI_API_URL}/${match.file_path}`,
      [match.file_path]
    );

    const isAlreadyFound = match.reportDetails?.status === "Found";

    return (
      <View style={styles.resultsCard}>
        <View style={styles.imageComparisonContainer}>
          <View style={styles.imageBox}>
            <Text style={styles.imageLabel}>Live Capture</Text>
            <Image
              source={{ uri: match.liveCaptureUri }}
              style={styles.resultImage}
            />
          </View>
          <View style={styles.imageBox}>
            <Text style={styles.imageLabel}>Database Record</Text>
            <Image
              source={{ uri: matchedImageUri }}
              style={styles.resultImage}
            />
          </View>
        </View>
        {match.reportDetails && (
          <View style={styles.reportDetailsContainer}>
            <Text style={styles.reportTitle}>
              {match.reportDetails.person_name}
            </Text>
            <View style={styles.reportInfo}>
              <Text style={styles.reportText}>
                Age: {match.reportDetails.age} | Gender:{" "}
                {match.reportDetails.gender}
              </Text>
              <Text
                style={[
                  styles.reportText,
                  isAlreadyFound && { color: "#2E7D32", fontWeight: "bold" },
                ]}
              >
                Status: {match.reportDetails.status}
              </Text>
              <Text style={styles.reportText} numberOfLines={2}>
                Last Seen: {match.reportDetails.last_seen}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Confidence:</Text>
          <Text style={[styles.detailValue, styles.confidenceText]}>
            {confidencePercentage}%
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              isAlreadyFound && styles.disabledButton,
            ]}
            onPress={() => onAction(true, match)}
            disabled={isAlreadyFound}
          >
            <Text style={styles.buttonText}>
              {isAlreadyFound ? "Already Found" : "✓ Confirm Match"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => onAction(false, match)}
          >
            <Text style={styles.rejectButtonText}>✗ Not a Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);
MatchCard.displayName = "MatchCard";

const styles = StyleSheet.create({
  // ... (all other styles are unchanged)
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 60 : 40,
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 15 : 0,
    left: 0,
    zIndex: 10,
    padding: 5,
  },
  cameraContainer: {
    width: "100%",
    height: CAMERA_VIEW_HEIGHT,
    backgroundColor: "#000",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
  },
  camera: { flex: 1 },
  scanButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#800000",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    zIndex: 1,
    elevation: 5,
  },
  scanButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  faceBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#00FF00",
    borderRadius: 5,
  },
  statusCard: {
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  statusMessage: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  matchListContainer: { marginTop: 10 },
  matchListHeader: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  matchListScrollView: { paddingBottom: 10 },
  resultsCard: {
    width: screenWidth * 0.85,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginRight: 15,
  },
  imageComparisonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  imageBox: { alignItems: "center" },
  imageLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  resultImage: {
    width: 110,
    height: 130,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  reportDetailsContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
    marginBottom: 6,
  },
  reportInfo: {
    gap: 2,
  },
  reportText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: { fontSize: 14, color: "#666", fontWeight: "500" },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
    flexShrink: 1,
  },
  confidenceText: { color: "#2e7d32", fontSize: 16 },
  actionButtons: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#8B0000",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rejectButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  rejectButtonText: { color: "#666", fontSize: 16, fontWeight: "500" },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
});