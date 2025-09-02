import { Tabs } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import TabBarIcon from '../../components/TabBarIcon';

export default function PoliceTabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: (props) => <CustomHeader title={props.options.title!} showLogout />,
        tabBarActiveTintColor: '#3A0000',
        tabBarInactiveTintColor: '#A47171',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F0E0E0' },
      }}
    >
      <Tabs.Screen name="police-dashboard" options={{ title: 'Police Dashboard', tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} /> }} />
      <Tabs.Screen name="face-search" options={{ title: 'Face Search', tabBarIcon: ({ color }) => <TabBarIcon name="scan-circle-outline" color={color} /> }} />
      
      {/* 
        ==================================================================
        UPDATED: This now directly points to the `ngo-management.tsx` file.
        The redirect pattern for nested folders is no longer needed.
        ==================================================================
      */}
      <Tabs.Screen
        name="ngo-management" // This MUST match the file name: ngo-management.tsx
        options={{
          title: 'NGO Management',
          tabBarLabel: 'NGOs',
          tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />,
        }}
      />
      
      {/* These screens remain hidden */}
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="statistics" options={{ href: null, title: 'Statistics' }} />
    </Tabs>
  );
}