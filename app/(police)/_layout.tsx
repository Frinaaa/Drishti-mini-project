import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import TabBarIcon from '../../components/TabBarIcon';

export default function PoliceTabLayout() {
  const router = useRouter();

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
      <Tabs.Screen name="police-dashboard" options={{ title: 'Police Dashboard', tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} /> }} />
      <Tabs.Screen name="face-search" options={{ title: 'Face Search', tabBarIcon: ({ color }) => <TabBarIcon name="scan-circle-outline" color={color} /> }} />
      
      {/* --- THIS IS THE CORRECT, WORKING BUTTON --- */}
      <Tabs.Screen
        // This points to our dummy screen
        name="_ngo-management-redirect" 
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/(police)/ngo-management');
          },
        }}
        options={{
          title: 'NGO Management',
          tabBarLabel: 'NGOs',
          tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />,
        }}
      />
      
      {/* --- THIS IS THE CRUCIAL FIX --- */}
      {/* This HIDES the tab that is automatically created for the folder */}
      <Tabs.Screen
        name="ngo-management"
        options={{
          href: null,
        }}
      />
      
      {/* These screens remain hidden */}
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="statistics" options={{ href: null, title: 'Statistics' }} />
    </Tabs>
  );
}