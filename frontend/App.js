import React from 'react';
<<<<<<< HEAD
<<<<<<< HEAD
import { StyleSheet, Text, View } from 'react-native';
=======
import { TouchableOpacity } from 'react-native';
=======
>>>>>>> parent of ba6a5d1 (as)
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import PoliceLoginScreen from './screens/PoliceLoginScreen';
import NGOLoginScreen from './screens/NGOLoginScreen';
import FamilyLoginScreen from './screens/FamilyLoginScreen';

const Stack = createNativeStackNavigator();

<<<<<<< HEAD
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
>>>>>>> parent of 75e7d00 (aa)

// Drawer with menu items
=======
>>>>>>> parent of ba6a5d1 (as)
export default function App() {
  return (
<<<<<<< HEAD
    <View style={styles.container}>
      <Text>Hello, Expo + React Native!</Text>
    </View>
=======
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PoliceLogin" component={PoliceLoginScreen} />
        <Stack.Screen name="NGOLogin" component={NGOLoginScreen} />
        <Stack.Screen name="FamilyLogin" component={FamilyLoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
>>>>>>> parent of 75e7d00 (aa)
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
