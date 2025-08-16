// /config/api.ts

// This file centralizes API configuration by reading from environment variables.
// The `EXPO_PUBLIC_` prefix is required by Expo to expose these variables to your client-side code.

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL;

// This check provides a clear error during development if the .env file is missing or misconfigured.
if (!BACKEND_API_URL) {
  throw new Error(
    "FATAL ERROR: EXPO_PUBLIC_BACKEND_API_URL is not defined. Please create a .env file in the project root."
  );
}

if (!AI_API_URL) {
    throw new Error(
      "FATAL ERROR: EXPO_PUBLIC_AI_API_URL is not defined. Please create a .env file in the project root."
    );
  }

export { BACKEND_API_URL, AI_API_URL };