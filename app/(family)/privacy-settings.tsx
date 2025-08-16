import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacySettingsScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Privacy Settings', headerShown: true }} />
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#3A0000" style={styles.icon} />
                    <View style={styles.textContainer}>
                        <Text style={styles.sectionTitle}>Data Security</Text>
                        <Text style={styles.bodyText}>
                            All personal information and report details are encrypted and stored securely. Access is restricted to authorized personnel only.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Ionicons name="share-social-outline" size={24} color="#3A0000" style={styles.icon} />
                    <View style={styles.textContainer}>
                        <Text style={styles.sectionTitle}>Information Sharing</Text>
                        <Text style={styles.bodyText}>
                            Your data is shared only with verified police authorities and partner NGOs for the sole purpose of locating the missing person. We do not sell or share your data with third-party advertisers.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Ionicons name="trash-outline" size={24} color="#3A0000" style={styles.icon} />
                    <View style={styles.textContainer}>
                        <Text style={styles.sectionTitle}>Data Deletion</Text>
                        <Text style={styles.bodyText}>
                            You can request the deletion of your account and all associated data at any time by contacting our support team through the app.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF8',
        padding: 20,
    },
    section: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F0E0E0',
    },
    icon: {
        marginRight: 15,
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3A0000',
        marginBottom: 5,
    },
    bodyText: {
        fontSize: 15,
        color: '#5B4242',
        lineHeight: 22,
    },
});