// /config/api.ts

import axios from 'axios';
import Constants from 'expo-constants';

// ==================================================================
// STEP 1: DEFINE A HELPER FUNCTION TO GET THE LOCAL IP
// ==================================================================
/**
 * Gets the local IP address of the development machine.
 * This is used to connect to local servers from a physical mobile device.
 * In production, this will be undefined.
 */
const getLocalIp = () => {
  // The 'hostUri' property is a string like '192.168.1.100:8081'
  // It's the address of the machine running the Expo development server.
  const hostUri = Constants.expoConfig?.hostUri;
  // We want to extract just the IP address, so we split by ':' and take the first part.
  return hostUri?.split(':')[0];
};

// ==================================================================
// STEP 2: READ BASE URLS FROM ENVIRONMENT VARIABLES
// ==================================================================
let BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;
let AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL;

// --- Error Checks (Unchanged) ---
if (!BACKEND_API_URL) {
  throw new Error(
    "FATAL ERROR: EXPO_PUBLIC_BACKEND_API_URL is not defined. Please check your .env file."
  );
}
if (!AI_API_URL) {
  throw new Error(
    "FATAL ERROR: EXPO_PUBLIC_AI_API_URL is not defined. Please check your .env file."
  );
}

// ==================================================================
// STEP 3: DYNAMICALLY REPLACE 'localhost' IN DEVELOPMENT
// WHY: This is the core logic. If we are in development mode (__DEV__ is a
// global variable set by Metro), we try to get the local IP. If found,
// we replace any instance of 'localhost' with that IP. This allows the
// app on a physical device to find the servers running on your computer.
// ==================================================================
if (__DEV__) {
  const localIp = getLocalIp();
  if (localIp) {
    console.log(`[API Config] Development mode detected. Rewriting 'localhost' to '${localIp}'`);
    BACKEND_API_URL = BACKEND_API_URL.replace('localhost', localIp);
    AI_API_URL = AI_API_URL.replace('localhost', localIp);
  }
}

console.log(`[API Config] Backend URL set to: ${BACKEND_API_URL}`);
console.log(`[API Config] AI URL set to: ${AI_API_URL}`);


/*
 * ==================================================================
 * Create a pre-configured Axios instance. (Unchanged)
 * WHY: This creates a reusable 'api' tool that is already set up
 * with our backend URL. Now, instead of typing the full URL for every
 * API call, we can just do `api.post('/submit')`.
 * ==================================================================
 */
const api = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We export the new 'api' tool AND the final URLs in case they are needed elsewhere.
export { api, BACKEND_API_URL, AI_API_URL };