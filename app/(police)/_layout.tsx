// app/(police)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import TabBarIcon from '../../components/TabBarIcon';
import Toast from 'react-native-toast-message'; 

export default function PoliceTabLayout() {
  // --- FIX: Wrap the entire return statement in a React Fragment <>...</> ---
  return (
    <>
      <Tabs
        // This ensures the navigator remembers which tab was last active.
        backBehavior="history"

        screenOptions={{
          header: (props) => {
            // Define a list of the main screens that are visible in the tab bar.
            const mainTabs = [
              'police-dashboard', 
              'alerts', 
              'face-search', 
              'ngo-management'
            ];
            
            // Show the back button ONLY if the current screen is NOT in the mainTabs list.
            const showBackButton = !mainTabs.includes(props.route.name);

            // Render the header, passing the correct value to the showBackButton prop.
            return <CustomHeader 
              title={props.options.title || 'Police Portal'} 
              showLogout 
              showBackButton={showBackButton} 
            />;
          },
          tabBarActiveTintColor: '#3A0000',
          tabBarInactiveTintColor: '#A47171',
          tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F0E0E0' },
        }}
      >
        {/* --- Screen Definitions (Unchanged) --- */}
        <Tabs.Screen name="police-dashboard" options={{ title: 'Police Dashboard', tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} /> }} />
        <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} /> }} />
        <Tabs.Screen name="face-search" options={{ title: 'Face Search', tabBarIcon: ({ color }) => <TabBarIcon name="scan-circle-outline" color={color} /> }} />
        
        <Tabs.Screen
          name="ngo-management"
          options={{
            title: 'NGO Management',
            tabBarLabel: 'NGOs',
            tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />,
          }}
        />
        
        {/* These screens remain hidden from the tab bar. */}
        {/* The header logic above will automatically give them a back button. */}
        <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
        <Tabs.Screen name="statistics" options={{ href: null, title: 'Statistics' }} />
        <Tabs.Screen name="add-admin" options={{ href: null, title: 'Add New Admin' }} />
        <Tabs.Screen name="preview-photo" options={{ href: null, title: 'Preview Photo' }} />
        <Tabs.Screen name="scanning-face" options={{ href: null, title: 'Scanning Face' }} />
        <Tabs.Screen name="match-found" options={{ href: null, title: 'Match Found' }} />
      </Tabs>

      {/* --- FIX: Toast component is now correctly placed outside the navigator --- */}
      <Toast />
    </>
  );
}