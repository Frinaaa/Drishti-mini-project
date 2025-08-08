import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import PoliceLoginScreen from './screens/PoliceLoginScreen';
import NGOLoginScreen from './screens/NGOLoginScreen';
import FamilyLoginScreen from './screens/FamilyLoginScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PoliceLogin" component={PoliceLoginScreen} />
        <Stack.Screen name="NGOLogin" component={NGOLoginScreen} />
        <Stack.Screen name="FamilyLogin" component={FamilyLoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
