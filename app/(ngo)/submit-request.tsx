// app/(ngo)/submit-request.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import CustomButton from '../../components/CustomButton';
// CORRECTED IMPORT: The path is now three levels up, and it correctly imports 'api'.
import { api } from '../../config/api';

const SubmitRequestScreen = () => {
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [document, setDocument] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const pickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your files.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets) {
      setDocument(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!location || !contact) {
      Alert.alert('Error', 'Please fill out location and contact information.');
      return;
    }
    setIsSubmitting(true);

    let documentData = null;
    if (document) {
      const base64 = await FileSystem.readAsStringAsync(document.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      documentData = {
        fileBase64: base64,
        fileName: document.fileName || document.uri.split('/').pop(),
      };
    }

    try {
      // This now works because 'api' is our configured Axios instance.
      const response = await api.post('/api/requests/submit', {
        location,
        contact,
        documentData,
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Your request has been submitted successfully.');
        router.back();
      }
    } catch (error) {
      console.error('Request submission failed:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Submit New Request</Text>
      <TextInput style={styles.input} placeholder="Location (Address/Area)" value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Contact Number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
      <CustomButton title="Select Supporting Document" onPress={pickDocument} />
      {document && <Text style={styles.fileText}>Selected: {document.fileName || document.uri.split('/').pop()}</Text>}
      <View style={{ marginTop: 20 }}>
        <CustomButton title={isSubmitting ? "Submitting..." : "Submit Request"} onPress={handleSubmit} disabled={isSubmitting} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { height: 50, borderColor: 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10 },
  fileText: { marginTop: 10, fontStyle: 'italic', color: 'gray' },
});

export default SubmitRequestScreen;