import { Tabs, Stack } from 'expo-router';
import React from 'react';
import TabBarIcon from '../../../components/TabBarIcon';

export default function NgoManagementLayout() {
  return (
    <>
      {/* --- THIS IS THE KEY CHANGE --- */}
      {/* This configures the header AND tells the parent tab bar to hide */}
      <Stack.Screen 
        options={{ 
          title: 'NGO Management',
          // This line hides the main police tab bar when this screen is active.
          tabBarStyle: { display: 'none' },
        }} 
      />

      {/* This is the nested tab bar for the NGO section */}
      <Tabs
        screenOptions={{
          headerShown: false, // This is correct, hide inner headers
          tabBarActiveTintColor: '#850a0a',
          tabBarInactiveTintColor: '#A47171',
          tabBarStyle: {
            backgroundColor: '#F8F9FA',
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Add NGO', tabBarIcon: ({ color }) => <TabBarIcon name="person-add-outline" color={color} /> }}/>
        <Tabs.Screen name="verify-ngo" options={{ title: 'Verify NGO', tabBarIcon: ({ color }) => <TabBarIcon name="shield-checkmark-outline" color={color} /> }}/>
        <Tabs.Screen name="frozen-ngos" options={{ title: 'Frozen NGOs', tabBarIcon: ({ color }) => <TabBarIcon name="snow-outline" color={color} /> }}/>
        <Tabs.Screen name="pending-ngos" options={{ title: 'Pending NGOs', tabBarIcon: ({ color }) => <TabBarIcon name="hourglass-outline" color={color} /> }}/>
      </Tabs>
    </>
  );
}