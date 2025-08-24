import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader'; // Make sure this path is correct
import TabBarIcon from '../../components/TabBarIcon';   // Make sure this path is correct

export default function PoliceTabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        header: (props) => <CustomHeader title={props.options.title!} showLogout />,
        tabBarActiveTintColor: '#3A0000',
        tabBarInactiveTintColor: '#A47171',
      }}
    >
      <Tabs.Screen name="police-dashboard" options={{ title: 'Police Dashboard', tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} /> }} />
      
      {/* This is the visible "NGOs" button that triggers the navigation */}
      <Tabs.Screen
        name="_ngo-management-redirect" 
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Stop the default action
            router.push('/(police)/ngo-management'); // Manually navigate to the nested section
          },
        }}
        options={{
          title: 'NGO Management',
          tabBarLabel: 'NGOs',
          tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />
        }}
      />
      
      {/* This hides the actual folder from the main tab bar to prevent duplicates */}
      <Tabs.Screen name="ngo-management" options={{ href: null }} />
      
      {/* Other hidden screens */}
      <Tabs.Screen name="face-search" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="statistics" options={{ href: null }} />
    </Tabs>
  );
}