import { Tabs } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader'; // IMPORTED
import TabBarIcon from '../../components/TabBarIcon'; // IMPORTED for consistency

export default function PoliceTabLayout() {
  return (
    <Tabs
      screenOptions={{
        // UPDATED: Use the custom header for all screens
        header: (props) => <CustomHeader title={props.options.title!} showLogout />,
        tabBarActiveTintColor: '#3A0000',
        tabBarInactiveTintColor: '#A47171',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0E0E0',
        },
      }}
    >
      <Tabs.Screen
        name="police-dashboard"
        options={{
          title: 'Police Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="face-search"
        options={{
          title: 'Face Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="scan-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="user-profile"
        options={{
          title: 'User Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      
      {/* These screens are part of the police stack but are not shown in the tab bar */}
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="statistics" options={{ href: null, title: 'Statistics' }} />
    </Tabs>
  );
}