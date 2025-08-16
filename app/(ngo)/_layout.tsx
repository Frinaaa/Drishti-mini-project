import React from 'react';
import { Tabs } from 'expo-router';
import TabBarIcon from '../../components/TabBarIcon';
import CustomHeader from '../../components/CustomHeader'; // IMPORTED

export default function NgoTabLayout() {
  return (
    <Tabs
      screenOptions={{
        // UPDATED: Use the custom header for all screens in this tab layout
        header: (props) => <CustomHeader title={props.options.title!} showLogout />,
        tabBarActiveTintColor: '#850a0a',
        tabBarInactiveTintColor: '#A47171',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="ngo-dashboard"
        options={{
          title: 'NGO Dashboard', // More descriptive title
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan-verify"
        options={{
          title: 'Scan & Verify',
          // REMOVED old header properties, now handled by CustomHeader
          tabBarIcon: ({ color }) => <TabBarIcon name="scan-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // REMOVED old header properties
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      {/* --- These screens are part of the navigator but not visible in the tab bar --- */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="my-assignments" options={{ href: null }} />
    </Tabs>
  );
}