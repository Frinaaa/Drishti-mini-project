import { Tabs, Stack, Redirect } from 'expo-router'; // ADD Redirect here
import React from 'react';
import TabBarIcon from '../../../components/TabBarIcon';

export default function NgoManagementLayout() {
  return (
    <>
      <Stack.Screen options={{ title: 'NGO Management', tabBarStyle: { display: 'none' } }} />

      {/* 
        ==================================================================
        THIS IS THE FIX. This <Redirect /> component solves the problem.
        It makes 'verify-requests' the default screen for this tab section.
        ==================================================================
      */}
      <Redirect href="/(police)/ngo-management/verify-requests" />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#850a0a',
          tabBarInactiveTintColor: '#A47171',
        }}
      >
        {/* The `index` screen is now gone from the tab bar. */}
        <Tabs.Screen 
          name="verify-requests"
          options={{ 
            title: 'Verify Requests', 
            tabBarIcon: ({ color }) => <TabBarIcon name="shield-checkmark-outline" color={color} /> 
          }}
        />
        <Tabs.Screen 
          name="frozen-ngos"
          options={{ 
            title: 'Frozen NGOs', 
            tabBarIcon: ({ color }) => <TabBarIcon name="snow-outline" color={color} /> 
          }}
        />
        <Tabs.Screen 
          name="pending-ngos"
          options={{ 
            title: 'Pending NGOs', 
            tabBarIcon: ({ color }) => <TabBarIcon name="hourglass-outline" color={color} /> 
          }}
        />
      </Tabs>
    </>
  );
}