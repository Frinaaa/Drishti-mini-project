import React from 'react';
import { Tabs } from 'expo-router';
import TabBarIcon from '../../components/TabBarIcon';
import CustomHeader from '../../components/CustomHeader'; // Import the new header

export default function FamilyTabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Use the custom header for ALL tabs in this layout
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
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
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
       {/* --- These screens are NOT tabs. They are screens that can be navigated to from within the Profile tab. --- */}
      {/* By defining them here with href: null, we tell the Tabs navigator they exist but shouldn't be a bottom tab. */}
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="submit-report" 
        options={{ 
          href: null

         }} 
        />
         {/* --- THIS IS THE NEWLY ADDED BLOCK THAT FIXES THE PROBLEM --- */}
      <Tabs.Screen
        name="aboutUs" // This must match your filename: aboutUs.tsx
        options={{
          href: null, // This is the magic property that hides the tab
        }}
        />
        <Tabs.Screen
        name="privacy-settings" 
        options={{ 
          href: null

         }} 
        />
    </Tabs>
  );
}