import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './screens/HomeScreen';
import AboutUsScreen from './screens/AboutUsScreen';

import PoliceLoginScreen from './screens/PoliceLogin';
import NGOLoginScreen from './screens/NgoLoginScreen';
import FamilyLoginScreen from './screens/FamilyLoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer menu toggle icon
function screenOptionsWithMenu({ navigation }) {
  return {
    headerLeft: () => (
      <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginLeft: 15 }}>
        <Ionicons name="menu" size={28} color="#000" />
      </TouchableOpacity>
    ),
    headerStyle: { backgroundColor: '#fff' },
    headerTintColor: '#000',
    headerTitleStyle: { fontWeight: 'bold' },
  };
}

// Stack Navigator for main app flow
function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#000',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Home */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '' }}
      />

      {/* ------------------ POLICE ------------------ */}
      <Stack.Screen
        name="PoliceLogin"
        component={PoliceLoginScreen}
        options={{ title: '', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="ForgotPasswordPolice"
        component={ForgotPasswordScreen}
        options={{ title: 'Police - Forgot Password', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="OTPVerificationPolice"
        component={OTPVerificationScreen}
        options={{ title: 'Police - OTP Verification', headerBackTitleVisible: false }}
      />

      {/* ------------------ NGO ------------------ */}
      <Stack.Screen
        name="NGOLogin"
        component={NGOLoginScreen}
        options={{ title: '', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="ForgotPasswordNGO"
        component={ForgotPasswordScreen}
        options={{ title: 'NGO - Forgot Password', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="OTPVerificationNGO"
        component={OTPVerificationScreen}
        options={{ title: 'NGO - OTP Verification', headerBackTitleVisible: false }}
      />

      {/* ------------------ FAMILY ------------------ */}
      <Stack.Screen
        name="FamilyLogin"
        component={FamilyLoginScreen}
        options={{ title: '', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="ForgotPasswordFamily"
        component={ForgotPasswordScreen}
        options={{ title: 'Family - Forgot Password', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="OTPVerificationFamily"
        component={OTPVerificationScreen}
        options={{ title: 'Family - OTP Verification', headerBackTitleVisible: false }}
      />
    </Stack.Navigator>
  );
}

// Drawer with menu items
export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="HomeDrawer"
        screenOptions={({ navigation }) => screenOptionsWithMenu({ navigation })}
      >
        <Drawer.Screen name="Home" component={MainStack} options={{ headerShown: false }} />
        <Drawer.Screen name="About Us" component={AboutUsScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
