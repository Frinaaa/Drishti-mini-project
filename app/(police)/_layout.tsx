// app/(police)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import TabBarIcon from '../../components/TabBarIcon';

export default function PoliceTabLayout() {
  return (
    <Tabs
      // --- FIX #1: This ensures the navigator remembers which tab was last active ---
      // This is important for when you navigate back from a detail screen.
      backBehavior="history"

      screenOptions={{
        // --- FIX #2: Add logic to the header function ---
        header: (props) => {
          // Define a list of the main screens that are visible in the tab bar.
          const mainTabs = [
            'police-dashboard', 
            'alerts', 
            'face-search', 
            'ngo-management'
          ];
          
          // Show the back button ONLY if the current screen is NOT in the mainTabs list.
          // This means screens like 'reports' and 'statistics' will get a back button.
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
      {/* --- NO CHANGES ARE NEEDED BELOW THIS LINE --- */}
      {/* Your original screen definitions are preserved exactly as you had them. */}

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
    </Tabs>
  );
}