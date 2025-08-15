import { Drawer } from 'expo-router/drawer';
import React from 'react';

// This is the Drawer layout that now ONLY applies to screens inside the (main) group.
export default function MainLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: '#FFF8F8' },
        headerTintColor: '#2B0000',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: '#850a0a',
        drawerInactiveTintColor: '#333',
        drawerStyle: { backgroundColor: '#FFF8F8' },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Home',
          title: 'Drishti',
        }}
      />
      <Drawer.Screen
        name="aboutUs"
        options={{
          drawerLabel: 'About Us',
          title: 'About Drishti',
        }}
      />
    </Drawer>
  );
}