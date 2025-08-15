import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

// Define the props for our custom icon component
type TabBarIconProps = {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
};

/**
 * A reusable component to display an Ionicons icon in the tab bar.
 */
export default function TabBarIcon({ name, color }: TabBarIconProps) {
  // You can adjust the default size here for all tabs
  return <Ionicons name={name} size={26} color={color} />;
}