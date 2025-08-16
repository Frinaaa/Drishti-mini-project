import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function MyAssignmentsScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'My Assignments', headerShown: true }} />
            <View style={styles.container}>
                <Text style={styles.title}>Assigned Cases</Text>
                <Text>This screen will list all missing person cases assigned to you.</Text>
            </View>
        </>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFBF8' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
});