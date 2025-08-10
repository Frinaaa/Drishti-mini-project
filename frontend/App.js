import React, { useState } from "react";

function SendOtpScreen({ onOtpSent }) {
  const handleSendOtp = () => {
    // Simulate API call to send OTP
    console.log("OTP sent to user!");
    onOtpSent(); // Navigate to OTP page
  };

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
