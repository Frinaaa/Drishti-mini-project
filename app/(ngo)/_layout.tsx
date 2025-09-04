// app/(ngo)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import TabBarIcon from '../../components/TabBarIcon';
import CustomHeader from '../../components/CustomHeader';

export default function NgoTabLayout() {
  return (
    <Tabs
      // --- FIX #1: This prop fixes the back navigation history ---
      // It ensures the back button returns to the last active tab (Profile)
      // instead of resetting to the first tab (Dashboard).
      backBehavior="history"

      screenOptions={{
        // --- FIX #2: Add logic inside your existing header function ---
        header: (props) => {
          // Define a list of all screens that are NOT main tabs and should have a back button.
          const detailScreens = [
            'my-assignments', 
            'edit-profile', 
            'notifications', 
            'submit-reports', 
            'recent-uploads', 
            'report-detail', 
            'submit-request'
          ];
          
          // Check if the current screen's name is in our list of detail screens.
          const showBackButton = detailScreens.includes(props.route.name);

          // Render the header, passing `true` or `false` to the `showBackButton` prop.
          return <CustomHeader 
            title={props.options.title || 'NGO Portal'} // Use a default title if none is set
            showLogout 
            showBackButton={showBackButton} 
          />;
        },
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
      {/* --- NO CHANGES ARE NEEDED BELOW THIS LINE --- */}
      {/* Your original screen definitions are preserved exactly as you had them. */}

      <Tabs.Screen
        name="ngo-dashboard"
        options={{
          title: 'NGO Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan-verify"
        options={{
          title: 'Scan & Verify',
          tabBarIcon: ({ color }) => <TabBarIcon name="scan-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      
      {/* These screens are correctly hidden and do not need to be changed. */}
      {/* The header logic above will automatically handle their back buttons. */}
      <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
      <Tabs.Screen name="my-assignments" options={{ href: null, title: 'My Assignments' }} />
      <Tabs.Screen name="submit-reports" options={{ href: null, title: 'Submit Report' }} />
      <Tabs.Screen name="recent-uploads" options={{ href: null, title: 'Recent Uploads' }} />
      <Tabs.Screen name="report-detail" options={{ href: null, title: 'Report Detail' }} />
      <Tabs.Screen name="submit-request" options={{ href: null, title: 'Submit Request' }} />
    </Tabs>
  );
}