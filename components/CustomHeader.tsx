import { useRouter, useNavigation } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomHeaderProps {
  title: string;
  showLogout?: boolean;
  showBackButton?: boolean;
}

export default function CustomHeader({ title, showLogout = false, showBackButton = true }: CustomHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();

  const handleLogout = () => {
    // FIX: The path to the landing page is now inside the (main) group.
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.left}>
          {showBackButton && navigation.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#2B0000" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.right}>
          {showLogout && (
            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={24} color="#2B0000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFF8F8',
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0E0',
  },
  left: {
    width: 50,
  },
  right: {
    width: 50,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2B0000',
  },
});