// app/(family)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import TabBarIcon from '../../components/TabBarIcon';
import CustomHeader from '../../components/CustomHeader';

export default function FamilyTabLayout() {
  return (
    <Tabs
      // --- THIS IS THE CRITICAL FIX ---
      // This prop tells the navigator to remember the last active tab (e.g., Profile)
      // when you navigate back, instead of resetting to the first tab (Dashboard).
      backBehavior="history"

      // Your existing screenOptions are correct.
      screenOptions={{
        header: (props) => {
          const showBackButton = ['notifications', 'edit-profile', 'privacy-settings', 'aboutUs', 'submit-report'].includes(props.route.name);
          return <CustomHeader title={props.options.title || 'Dashboard'} showLogout showBackButton={showBackButton} />;
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
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      {/* The rest of this file remains exactly as you had it. */}
      {/* No other changes are needed here. */}
      
      <Tabs.Screen
        name="family-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          href: null,
        }}
      />
      <Tabs.Screen
        name="submit-report"
        options={{
          title: 'Submit Report',
          href: null
        }}
        />
      <Tabs.Screen
        name="aboutUs"
        options={{
          title: 'About Us',
          href: null,
        }}
        />
      <Tabs.Screen
        name="privacy-settings"
        options={{
          title: 'Privacy Settings',
          href: null
        }}
        />
    </Tabs>
  );
}