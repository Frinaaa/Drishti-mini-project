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
import FamilySignupScreen from './screens/FamilySignupScreen';
import PoliceDashboardScreen from './screens/PoliceDashboardScreen';
import NgoDashboardScreen from './screens/NgoDashboardScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainStack({ navigation }) {
  return (
    <Stack.Navigator initialRouteName="Home">
      
      {/* Home Screen */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.toggleDrawer()}
              style={{ marginLeft: 15 }}
            >
              <Ionicons name="menu" size={28} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Police Flow */}
      <Stack.Screen name="PoliceLogin" component={PoliceLoginScreen} />
      <Stack.Screen
        name="ForgotPasswordPolice"
        component={(props) => <ForgotPasswordScreen {...props} nextScreen="OTPVerificationPolice" />}
        options={{ title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="OTPVerificationPolice"
        component={OTPVerificationScreen}
        options={{ title: 'OTP Verification' }}
      />
      <Stack.Screen
      name="PoliceDashboard"
      component={PoliceDashboardScreen}
      options={{ title: 'Dashboard' }}
      />
    
      {/* NGO Flow */}
      <Stack.Screen name="NGOLogin" component={NGOLoginScreen} />
      <Stack.Screen
        name="ForgotPasswordNGO"
        component={(props) => <ForgotPasswordScreen {...props} nextScreen="OTPVerificationNGO" />}
        options={{ title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="OTPVerificationNGO"
        component={OTPVerificationScreen}
        options={{ title: 'OTP Verification' }}
      />
      <Stack.Screen
      name="NgoDashboard"
      component={NgoDashboardScreen}
      options={{ title: 'NGO Dashboard' }}
      />
      {/* Family Flow */}
      <Stack.Screen name="FamilyLogin" component={FamilyLoginScreen} />
      <Stack.Screen
        name="ForgotPasswordFamily"
        component={(props) => <ForgotPasswordScreen {...props} nextScreen="OTPVerificationFamily" />}
        options={{ title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="OTPVerificationFamily"
        component={OTPVerificationScreen}
        options={{ title: 'OTP Verification' }}
      />
      
      <Stack.Screen
      name="FamilySignup"
      component={FamilySignupScreen}
      options={{ title: 'Sign Up' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTitleAlign: 'center',
          drawerType: 'front',
          drawerStyle: { backgroundColor: '#fff', width: 240 },
        }}
      >
        <Drawer.Screen
          name="Home"
          component={MainStack}
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="About Us" component={AboutUsScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
