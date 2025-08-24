// /config/api.ts

import axios from 'axios';

// This file reads environment variables and creates a pre-configured API client.
// The `EXPO_PUBLIC_` prefix is required by Expo.

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL;

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

/*
 * ==================================================================
 * ADDED: Create a pre-configured Axios instance.
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

// We export the new 'api' tool AND the original URLs in case they are needed elsewhere.
export { api, BACKEND_API_URL, AI_API_URL };