import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AI_API_URL } from '../../config/api'; 
import CustomButton from '../../components/CustomButton';

type MatchResponse = {
  match: boolean;
  distance?: number;
  reason?: string;
  error?: string;
};

export default function ScanVerifyScreen() {
  const pickImageAndMatch = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You've refused to allow this app to access your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      
      formData.append('file', {
        uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      try {
        Alert.alert('Matching...', 'Sending image to AI service. Please wait.');
        const response = await fetch(`${AI_API_URL}/match_face`, { 
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data: MatchResponse = await response.json();

        if (response.ok) {
            if(data.match) {
                Alert.alert('Match Found!', `A potential match was found with a distance of ${data.distance?.toFixed(2)}.`);
            } else {
                Alert.alert('No Match', `No match found. Reason: ${data.reason || 'Distance too high'}`);
            }
        } else {
            Alert.alert('API Error', data.error || 'Something went wrong on the server.');
        }

      } catch (error) {
        console.error('Error matching face:', error);
        Alert.alert('Connection Error', 'Could not connect to the AI service.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan & Verify</Text>
      <Text style={styles.info}>
        Use this tool to scan a photo of a person and check if they are in the known database of missing persons.
      </Text>
      <CustomButton
        title="Scan Image for a Match"
        onPress={pickImageAndMatch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#FFFBF8' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#3A0000', marginBottom: 16, textAlign: 'center' },
  info: { fontSize: 16, color: '#5B4242', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});