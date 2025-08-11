// backend-mock/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// In-memory stores (DEV ONLY)
const otpStore = new Map(); // identifier -> { otp, expiresAt, tries }
const users = {
  // sample user for police login testing
  'police@test.com': { role: 'Police Officer', password: '123456' },
};

// helpers
function genOtp() {
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

app.post('/send-otp', (req, res) => {
  const { identifier, role } = req.body;
  if (!identifier) return res.status(400).json({ success: false, message: 'identifier required' });

  const otp = genOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;
  otpStore.set(identifier, { otp, expiresAt, tries: 0, role });

  console.log(`[DEV] OTP for ${identifier} (role=${role}): ${otp}`);
  // DEV: return OTP so testing is easy. REMOVE this in production.
  return res.json({ success: true, message: 'OTP sent (dev)', otp });
});

app.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ success: false, message: 'identifier and otp required' });

  const rec = otpStore.get(identifier);
  if (!rec) return res.status(400).json({ success: false, message: 'no otp requested' });
  if (Date.now() > rec.expiresAt) { otpStore.delete(identifier); return res.status(400).json({ success: false, message: 'otp expired' }); }
  if (rec.tries >= 5) { otpStore.delete(identifier); return res.status(429).json({ success: false, message: 'too many attempts' }); }

  if (rec.otp === otp) {
    otpStore.delete(identifier);
    return res.json({ success: true, message: 'verified' });
  } else {
    rec.tries += 1;
    otpStore.set(identifier, rec);
    return res.status(400).json({ success: false, message: 'invalid otp' });
  }
});

app.post('/reset-password', (req, res) => {
  const { identifier, role, newPassword } = req.body;
  if (!identifier || !newPassword) return res.status(400).json({ success:false, message:'identifier and newPassword required' });

  // DEV: Accept any identifier (real logic would update DB)
  console.log(`[DEV] Reset password for ${identifier} (role=${role}). New password: ${newPassword}`);
  return res.json({ success:true, message:'Password reset successful' });
});

app.post('/police-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'email and password required' });

  const u = users[email];
  if (u && u.password === password) return res.json({ success:true, message:'Login success', role: u.role });
  return res.status(401).json({ success:false, message:'Invalid credentials' });
});

app.listen(PORT, () => console.log(`Mock backend running on http://localhost:${PORT}`));
