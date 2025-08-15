import CustomHeader from '../../components/CustomHeader';
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="family-login" options={{ header: (props) => <CustomHeader title={props.options.title!} /> }} />
      <Stack.Screen name="family-signup" options={{  header: (props) => <CustomHeader title={props.options.title!} /> }} />
      <Stack.Screen name="ngo-login" options={{  header: (props) => <CustomHeader title={props.options.title!} /> }} />
      <Stack.Screen name="police-login" options={{  header: (props) => <CustomHeader title={props.options.title!} /> }} />
      <Stack.Screen name="forgot-password" options={{  header: (props) => <CustomHeader title={props.options.title!} /> }} />
      <Stack.Screen name="reset-password" options={{  header: (props) => <CustomHeader title={props.options.title!} /> }} />
    </Stack>
  );
}