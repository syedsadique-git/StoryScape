import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'storyscape_super_secret_jwt_key_12345';

// Configure SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTPEmail(email, otp) {
  const isDev = !process.env.SMTP_USER || process.env.SMTP_USER.includes('your_email');
  
  if (isDev) {
    console.log('\x1b[33m%s\x1b[0m', `==========================================`);
    console.log('\x1b[33m%s\x1b[0m', `[DEV OTP BYPASS] Email: ${email}`);
    console.log('\x1b[33m%s\x1b[0m', `[DEV OTP BYPASS] OTP Code: ${otp}`);
    console.log('\x1b[33m%s\x1b[0m', `==========================================`);
    return;
  }

  const mailOptions = {
    from: `"StoryScape" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'StoryScape Verification OTP',
    text: `Your StoryScape verification code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: 'Inter', sans-serif; padding: 30px; background-color: #0D0D0F; color: #F9FAFB; max-width: 500px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
        <h2 style="color: #7C3AED; text-align: center; margin-bottom: 20px;">StoryScape</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #F9FAFB;">Verify your email to start exploring immersive stories. Your 6-digit OTP code is:</p>
        <div style="font-size: 36px; font-weight: 800; color: #A78BFA; background-color: #151518; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px solid rgba(255,255,255,0.08); letter-spacing: 6px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 20px;">This OTP is valid for 5 minutes. If you did not register for StoryScape, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// Passport Google Strategy setup (safely checks credentials)
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientId !== 'your_google_client_id' && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email associated with Google profile'));

        let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(profile.id, email);

        if (!user) {
          const id = uuidv4();
          const name = profile.displayName || email.split('@')[0];
          const avatar = profile.photos?.[0]?.value || '';
          db.prepare(`
            INSERT INTO users (id, name, email, google_id, avatar_url, is_verified, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
          `).run(id, name, email, profile.id, avatar, Date.now());
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        } else if (!user.google_id) {
          // Link existing user
          db.prepare('UPDATE users SET google_id = ?, avatar_url = ?, is_verified = 1 WHERE id = ?').run(
            profile.id,
            profile.photos?.[0]?.value || '',
            user.id
          );
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        }
        return done(null, user);
      }
    )
  );
}

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999).toString(); // 6 digits, cryptographically secure
    const otp_expires_at = Date.now() + 5 * 60 * 1000; // 5 min expiry
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, is_verified, otp, otp_expires_at, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(id, name, email, password_hash, otp, otp_expires_at, Date.now());

    await sendOTPEmail(email, otp);

    return res.json({ message: 'OTP sent to email', email });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (Date.now() > user.otp_expires_at) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    db.prepare('UPDATE users SET is_verified = 1, otp = NULL, otp_expires_at = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    return res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      // Regenerate OTP and send
      const otp = crypto.randomInt(100000, 999999).toString();
      const otp_expires_at = Date.now() + 5 * 60 * 1000;
      db.prepare('UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?').run(otp, otp_expires_at, user.id);
      await sendOTPEmail(email, otp);
      return res.status(403).json({ error: 'Account not verified. OTP sent.', email, unverified: true });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otp_expires_at = Date.now() + 5 * 60 * 1000;
    
    db.prepare('UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?').run(otp, otp_expires_at, user.id);
    await sendOTPEmail(email, otp);

    return res.json({ message: 'Verification code resent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Server error resending OTP' });
  }
});

// Get current user profile (protected)
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// Passport routes
router.get('/google', (req, res, next) => {
  if (!googleClientId || googleClientId === 'your_google_client_id') {
    return res.status(400).json({ error: 'Google OAuth is not configured on this server' });
  }
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/login', session: false }, (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
      }
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?token=${token}`);
    })(req, res, next);
  }
);

export default router;
