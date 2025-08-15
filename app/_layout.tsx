import { Stack } from 'expo-router';
import React from 'react';

// The entire app is now wrapped in a Stack navigator.
// This allows us to navigate to different sections (like auth or dashboards)
// without them being part of a drawer.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Each of these screens is a route group that manages its own navigation */}
      <Stack.Screen name="(main)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(family)" />
      <Stack.Screen name="(ngo)" />
      <Stack.Screen name="(police)" />
    </Stack>
  );
}