import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Image, StyleSheet, Text } from 'react-native';
import { Camera } from 'expo-camera'; // expo-camera
import axios from 'axios';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    (async () => {
      // request permission using expo-camera API
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: false });
        setPhotoUri(photo.uri);
      } catch (err) {
        console.error('takePicture error', err);
      }
    }
  };

  const uploadPhoto = async () => {
    if (!photoUri) return alert('No photo to upload');

    const formData = new FormData();
    formData.append('file', {
      uri: photoUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      const res = await axios.post('http://<YOUR_PC_IP>:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  if (hasPermission === null) {
    return <View><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <Camera
          style={styles.camera}
          ref={cameraRef}
          // Use `type` from Camera.Constants if available, otherwise fallback to 'back'
          type={(Camera.Constants && Camera.Constants.Type && Camera.Constants.Type.back) || 'back'}
        />
      ) : (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      )}

      {!photoUri ? (
        <Button title="Capture Photo" onPress={takePhoto} />
      ) : (
        <>
          <Button title="Upload Photo" onPress={uploadPhoto} />
          <Button title="Retake" onPress={() => setPhotoUri(null)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 1 },
  preview: { flex: 1 },
});
