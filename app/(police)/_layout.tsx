import { Tabs } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import TabBarIcon from '../../components/TabBarIcon';

export default function PoliceTabLayout() {
  // NOTE: The router and complex listeners are no longer needed here.
  
  return (
    <Tabs
      screenOptions={{
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
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="alerts" 
        options={{ 
          title: 'Alerts', 
          tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="face-search" 
        options={{ 
          title: 'Face Search', 
          tabBarIcon: ({ color }) => <TabBarIcon name="scan-circle-outline" color={color} /> 
        }} 
      />
      
      {/* --- This is the simplified and correct tab --- */}
      {/* It now directly points to the ngo-management screen, and the name/icon will be applied correctly. */}
      <Tabs.Screen
        name="ngo-management"
        options={{
          title: 'NGO Management',
          tabBarLabel: 'NGOs', // This name will now appear correctly
          tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />, // This icon will now appear correctly
        }}
      />
      
      {/* These screens are correctly hidden as they are navigated to from other screens. */}
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="statistics" options={{ href: null, title: 'Statistics' }} />
    </Tabs>
  );
}