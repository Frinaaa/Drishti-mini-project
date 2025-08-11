import React, { useState } from "react";

<<<<<<< HEAD
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
=======
function SendOtpScreen({ onOtpSent }) {
  const handleSendOtp = () => {
    // Simulate API call to send OTP
    console.log("OTP sent to user!");
    onOtpSent(); // Navigate to OTP page
  };
>>>>>>> 5ad173e60f6c6b0a71c059c64caeba0b17c44c65

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Forgot Password</h2>
      <p>Enter your registered email or phone number</p>
      <input type="text" placeholder="Email / Phone" />
      <br />
      <button
        onClick={handleSendOtp}
        style={{
          backgroundColor: "#880806",
          color: "white",
          padding: "10px 20px",
          marginTop: "20px",
          border: "none",
          cursor: "pointer"
        }}
      >
        Send OTP
      </button>
    </div>
  );
}

<<<<<<< HEAD
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
=======
function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleChange = (value, index) => {
    if (value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
    }
  };

  const handleVerify = () => {
    console.log("Entered OTP:", otp.join(""));
    alert("OTP Verified!");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Reset Password</h2>
      <p>We have sent an OTP to your registered mobile number.</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        {otp.map((digit, i) => (
          <input
            key={i}
            type="text"
            maxLength="1"
            value={digit}
            onChange={(e) => handleChange(e.target.value, i)}
            style={{
              width: "40px",
              height: "40px",
              fontSize: "20px",
              textAlign: "center",
              border: "1px solid #880806",
              borderRadius: "5px"
            }}
          />
        ))}
      </div>
      <br />
      <button
        onClick={handleVerify}
        style={{
          backgroundColor: "#880806",
          color: "white",
          padding: "10px 20px",
          marginTop: "20px",
          border: "none",
          cursor: "pointer"
        }}
      >
        Verify OTP
      </button>
    </div>
>>>>>>> 5ad173e60f6c6b0a71c059c64caeba0b17c44c65
  );
}

export default function App() {
  const [showOtpScreen, setShowOtpScreen] = useState(false);

  return (
    <div>
      {showOtpScreen ? (
        <OtpScreen />
      ) : (
        <SendOtpScreen onOtpSent={() => setShowOtpScreen(true)} />
      )}
    </div>
  );
}
