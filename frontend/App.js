import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './screens/HomeScreen';
import AboutUsScreen from './screens/AboutUsScreen';
import PoliceLoginScreen from './screens/PoliceLogin';
import NGOLoginScreen from './screens/NgoLoginScreen';
import FamilyLoginScreen from './screens/FamilyLoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Function to add hamburger to all stack screens
const withHamburger = (navigation) => ({
  headerLeft: () => (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{ marginRight: 10 }}
    >
      <Ionicons name="menu" size={28} color="#333" />
    </TouchableOpacity>
  )
});

function MainStack({ navigation }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Welcome to Drishti',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="PoliceLogin"
        component={PoliceLoginScreen}
        options={{
          title: 'Police Login',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="NGOLogin"
        component={NGOLoginScreen}
        options={{
          title: 'NGO Login',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="FamilyLogin"
        component={FamilyLoginScreen}
        options={{
          title: 'Family Login',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="ForgotPasswordPolice"
        component={ForgotPasswordScreen}
        options={{
          title: 'Forgot Password (Police)',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="OTPVerificationPolice"
        component={OTPVerificationScreen}
        options={{
          title: 'Verify OTP (Police)',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="ForgotPasswordNGO"
        component={ForgotPasswordScreen}
        options={{
          title: 'Forgot Password (NGO)',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="OTPVerificationNGO"
        component={OTPVerificationScreen}
        options={{
          title: 'Verify OTP (NGO)',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="ForgotPasswordFamily"
        component={ForgotPasswordScreen}
        options={{
          title: 'Forgot Password (Family)',
          ...withHamburger(navigation),
        }}
      />
      <Stack.Screen
        name="OTPVerificationFamily"
        component={OTPVerificationScreen}
        options={{
          title: 'Verify OTP (Family)',
          ...withHamburger(navigation),
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Drawer.Screen name="Home" component={MainStack} />
        <Drawer.Screen
          name="About Us"
          component={AboutUsScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'About Us',
            ...withHamburger(navigation),
          })}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
