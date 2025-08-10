import React, { useState } from 'react';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleResetPassword = async () => {
    if (!email || !otp || !newPassword) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      alert(data.message);

    } catch (error) {
      console.error(error);
      alert("Error resetting password");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Reset Password</h2>
      <input
        type="email"
        placeholder="Enter your Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Enter New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <button onClick={handleResetPassword}>Reset Password</button>
    </div>
  );
}
