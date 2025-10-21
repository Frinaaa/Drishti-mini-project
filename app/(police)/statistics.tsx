import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
// ... other imports
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../../config/api';

// 1. Import the new libraries
// CORRECTED IMPORTS
import Print from 'expo-print';
import Sharing from 'expo-sharing';
console.log("Is Print module loaded?", Print);
// --- TYPE DEFINITIONS (Unchanged) ---
type StatisticsData = {
  totalReports: number;
  foundCount: number;
  missingCount: number;
  categoryStats: {
    total: number;
    children: number;
    male: number;
    female: number;
    other: number;
  };
};

// --- HELPER COMPONENTS (Unchanged) ---
const StatCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const HorizontalBar = ({ label, value, maxValue }: { label: string; value: number; maxValue: number }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.horizontalBarContainer}>
      <Text style={styles.horizontalBarLabel}>{label}</Text>
      <View style={styles.horizontalBarBackground}>
        <View style={[styles.horizontalBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.horizontalBarValue}>{value}</Text>
    </View>
  );
};

// --- MAIN SCREEN COMPONENT ---
export default function PoliceStatisticsScreen() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 2. Add state for PDF generation feedback
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    // ... (Your existing fetchStatistics useEffect remains exactly the same)
    const fetchStatistics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) { router.replace('/(auth)/police-login'); return; }
        const response = await fetch(`${BACKEND_API_URL}/api/reports/statistics`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || 'Failed to fetch statistics.');
        }
        const data: StatisticsData = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching statistics:", err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatistics();
  }, []);
  
  // 3. Create the function to generate HTML content for the PDF
  const generatePdfHtml = (data: StatisticsData): string => {
    const reportDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; color: #3A0000; margin: 40px; }
            h1 { text-align: center; border-bottom: 2px solid #F0E0E0; padding-bottom: 10px; }
            p { text-align: center; color: #5B4242; font-size: 12px; }
            .card { border: 1px solid #F0E0E0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            h2 { color: #3A0000; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #F0E0E0; }
            th { color: #A47171; font-weight: normal; }
            td { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>Missing Person Case Statistics</h1>
          <p>Report generated on: ${reportDate}</p>

          <div class="card">
            <h2>Overall Statistics</h2>
            <table>
              <tr>
                <th>Total Reports Submitted</th>
                <td>${data.totalReports}</td>
              </tr>
            </table>
          </div>

          <div class="card">
            <h2>Case Status Overview</h2>
            <table>
              <tr><th>Active Missing Cases</th><td>${data.missingCount}</td></tr>
              <tr><th>Resolved (Found) Cases</th><td>${data.foundCount}</td></tr>
            </table>
          </div>

          <div class="card">
            <h2>Active Cases Demographics</h2>
            <table>
              <tr><th>Total Active Cases</th><td>${data.categoryStats.total}</td></tr>
              <tr><th>Children (&lt;18)</th><td>${data.categoryStats.children}</td></tr>
              <tr><th>Adult Male</th><td>${data.categoryStats.male}</td></tr>
              <tr><th>Adult Female</th><td>${data.categoryStats.female}</td></tr>
              <tr><th>Adult Other</th><td>${data.categoryStats.other}</td></tr>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    console.log("1. Export button pressed. Platform:", Platform.OS);

    if (Platform.OS === 'web') {
      Alert.alert("Feature Not Available", "PDF export is only available on the mobile app.");
      return;
    }

    if (!stats) {
      console.log("2. Export failed: stats object is null.");
      Alert.alert("Error", "Statistics data is not available.");
      return;
    }
    
    setIsGeneratingPdf(true);

    try {
      console.log("3. Generating HTML content...");
      const htmlContent = generatePdfHtml(stats);
      
      console.log("4. Calling Print.printToFileAsync...");
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log("5. PDF generated successfully at URI:", uri);

      const isSharingAvailable = await Sharing.isAvailableAsync();
      console.log("6. Is sharing available on this device?", isSharingAvailable);

      if (!isSharingAvailable) {
        Alert.alert("Error", "Sharing is not available on this device.");
        setIsGeneratingPdf(false); // Make sure to stop loading
        return;
      }
      
      console.log("7. Calling Sharing.shareAsync...");
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Statistics' });
      console.log("8. Sharing dialog should have opened.");

    } catch (error) {
      console.error("--- PDF EXPORT FAILED ---:", error);
      Alert.alert("Error", "An error occurred while creating the PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
};
  // --- RENDER LOGIC ---
    if (isLoading) {
      return (
        <>
          <Stack.Screen options={{ title: 'Case Statistics' }} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3A0000" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        </>
      );
    }
  
    if (error) {
      return (
        <>
          <Stack.Screen options={{ title: 'Case Statistics' }} />
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load statistics</Text>
            <Text style={styles.errorSubText}>{error}</Text>
          </View>
        </>
      );
    }
  
    if (!stats) {
      return (
        <>
          <Stack.Screen options={{ title: 'Case Statistics' }} />
          <View style={styles.centered}>
            <Text style={styles.loadingText}>No statistics available.</Text>
          </View>
        </>
      );
    }
    
    const foundVsMissingTotal = stats.foundCount + stats.missingCount;
    const foundHeight = foundVsMissingTotal > 0 ? (stats.foundCount / foundVsMissingTotal) * 100 : 0;
    const missingHeight = foundVsMissingTotal > 0 ? (stats.missingCount / foundVsMissingTotal) * 100 : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Case Statistics' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerContainer}>
           <Text style={styles.introText}>
            A clear overview of missing person cases through easy-to-read data visualizations.
          </Text>
           {/* 5. Update the button to use the new function and show feedback */}
           <TouchableOpacity 
              style={[styles.exportButton, isGeneratingPdf && styles.exportButtonDisabled]}
              onPress={handleExportPdf}
              disabled={isGeneratingPdf}
           >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#3A0000" />
                ) : (
                  <Ionicons name="download-outline" size={20} color="#3A0000" />
                )}
                <Text style={styles.exportButtonText}>
                  {isGeneratingPdf ? 'Generating...' : 'Export as PDF'}
                </Text>
           </TouchableOpacity>
        </View>

        {/* The rest of your JSX (StatCards, etc.) remains exactly the same */}
        <StatCard title="Overall Statistics">
          <Text style={styles.statLabel}>Total Reports Submitted</Text>
          <Text style={styles.mainStatValue}>{stats.totalReports}</Text>
        </StatCard>
        <StatCard title="Found vs Missing">
          <Text style={styles.statLabel}>Total Resolved vs. Active Cases</Text>
          <Text style={styles.subStatValue}>{foundVsMissingTotal}</Text>
          <View style={styles.verticalBarChartContainer}><View style={styles.barWrapper}><View style={[styles.verticalBar, { height: `${foundHeight}%` }]} /><Text style={styles.barLabel}>Found ({stats.foundCount})</Text></View><View style={styles.barWrapper}><View style={[styles.verticalBar, { height: `${missingHeight}%` }]} /><Text style={styles.barLabel}>Missing ({stats.missingCount})</Text></View></View>
        </StatCard>
        <StatCard title="Category-wise Stats">
           <Text style={styles.statLabel}>Active Missing Cases by Category</Text>
           <Text style={styles.subStatValue}>{stats.categoryStats.total}</Text>
            <View style={styles.horizontalBarsSection}><HorizontalBar label="Children" value={stats.categoryStats.children} maxValue={stats.categoryStats.total} /><HorizontalBar label="Male" value={stats.categoryStats.male} maxValue={stats.categoryStats.total} /><HorizontalBar label="Female" value={stats.categoryStats.female} maxValue={stats.categoryStats.total} /><HorizontalBar label="Other" value={stats.categoryStats.other} maxValue={stats.categoryStats.total} /></View>
        </StatCard>

      </ScrollView>
    </>
  );
}


// --- STYLES ---
// Add one new style for the disabled button state
const styles = StyleSheet.create({
  // ... (all your existing styles remain here)
  container: { flex: 1, backgroundColor: '#FFFBF8' },
  scrollContent: { padding: 20 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#5B4242' },
  headerContainer: { marginBottom: 20, alignItems: 'center' },
  introText: { fontSize: 16, color: '#5B4242', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0E0E0', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  exportButtonText: { marginLeft: 8, color: '#3A0000', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F0E0E0', shadowColor: '#A47171', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#3A0000', marginBottom: 16 },
  statLabel: { fontSize: 14, color: '#A47171', marginBottom: 4 },
  mainStatValue: { fontSize: 48, fontWeight: 'bold', color: '#3A0000' },
  subStatValue: { fontSize: 36, fontWeight: 'bold', color: '#3A0000', marginBottom: 20 },
  verticalBarChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, marginTop: 10 },
  barWrapper: { alignItems: 'center', width: '40%' },
  verticalBar: { width: 40, backgroundColor: '#E4C4C4', borderRadius: 8 },
  barLabel: { marginTop: 8, fontSize: 14, color: '#5B4242' },
  horizontalBarsSection: { marginTop: 10 },
  horizontalBarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  horizontalBarLabel: { width: 70, fontSize: 14, color: '#5B4242' },
  horizontalBarBackground: { flex: 1, height: 10, backgroundColor: '#F5EAEA', borderRadius: 5, marginHorizontal: 10, overflow: 'hidden' },
  horizontalBarFill: { height: '100%', backgroundColor: '#8B5757', borderRadius: 5 },
  horizontalBarValue: { fontSize: 14, fontWeight: '600', color: '#3A0000', minWidth: 25, textAlign: 'right' },
  errorText: { fontSize: 22, fontWeight: 'bold', color: '#3A0000', marginTop: 10 },
  errorSubText: { fontSize: 16, color: '#5B4242', textAlign: 'center', paddingHorizontal: 30, marginTop: 5 },
  
  // New style for disabled button
  exportButtonDisabled: {
    opacity: 0.6,
  },
});