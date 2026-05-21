import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Key, ArrowRight, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { resendOTP } from '../api/auth.js';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, register, verifyOtp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab state: 'login' | 'register' | 'otp'
  const [activeTab, setActiveTab] = useState('login');
  
  // Forms inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  
  // Timer & loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const otpInputsRef = useRef([]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectPath = searchParams.get('redirect') === 'upload' ? '/?upload=true' : '/';
      navigate(redirectPath);
    }
  }, [user, navigate, searchParams]);

  // Handle redirect code for google authentication callback error
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      toast.error('Google Sign-In failed. Please try again.');
    }
  }, [searchParams]);

  // Handle OTP timer
  useEffect(() => {
    let timer;
    if (isTimerRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, countdown]);

  const startOTPTimer = () => {
    setCountdown(300);
    setIsTimerRunning(true);
  };

  const handleGoogleLogin = () => {
    // Forward directly to passport oauth route on server
    window.location.href = 'http://localhost:5001/api/auth/google';
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter email and password.');
    }
    
    setIsSubmitting(true);
    try {
      const data = await login(email, password);
      toast.success('Logged in successfully!');
      const redirect = searchParams.get('redirect');
      navigate(redirect === 'upload' ? '/?upload=true' : '/');
    } catch (err) {
      const resData = err.response?.data;
      if (err.response?.status === 403 && resData?.unverified) {
        setUnverifiedEmail(resData.email || email);
        if (resData?.otp) {
          setDevOtp(resData.otp);
          toast.success(`Dev OTP: ${resData.otp}`);
        }
        setActiveTab('otp');
        startOTPTimer();
        toast.error('Account not verified. Verification code sent.');
      } else {
        toast.error(resData?.error || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      return toast.error('Please fill in all registration fields.');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    setIsSubmitting(true);
    try {
      const data = await register(name, email, password);
      setUnverifiedEmail(email);
      if (data?.otp) {
        setDevOtp(data.otp);
        toast.success(`Dev OTP: ${data.otp}`);
      }
      setActiveTab('otp');
      startOTPTimer();
      toast.success('Verification code sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Input management
  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1); // Get last digit
    setOtpDigits(newOtp);

    // Auto-advance focus
    if (value !== '' && index < 5) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otpDigits[index] === '' && index > 0) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(pasteData)) {
      const digits = pasteData.split('');
      setOtpDigits(digits);
      // Focus last box
      otpInputsRef.current[5].focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      return toast.error('Please enter the 6-digit OTP code.');
    }

    setIsSubmitting(true);
    try {
      await verifyOtp(unverifiedEmail, otp);
      toast.success('Email verified successfully! Welcome to StoryScape.');
      const redirect = searchParams.get('redirect');
      navigate(redirect === 'upload' ? '/?upload=true' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const data = await resendOTP(unverifiedEmail);
      if (data?.otp) {
        setDevOtp(data.otp);
        toast.success(`Dev OTP: ${data.otp}`);
      }
      startOTPTimer();
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0].focus();
      toast.success('A new verification code was sent.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend code.');
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-background min-h-screen relative p-6 overflow-hidden">
      {/* Animated Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-float-orb-1 z-0 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[120px] animate-float-orb-2 z-0 pointer-events-none" />

      {/* Floating Glass-morphism Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#151518]/70 border border-white/5 backdrop-blur-xl rounded-3xl p-8 z-10 shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Brand Logo & Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wider">StoryScape</h1>
          <p className="text-muted text-xs mt-1 font-medium">Step inside the realm of immersive stories</p>
        </div>

        {/* Tab switch navigation (Only if not in OTP verification) */}
        {activeTab !== 'otp' && (
          <div className="relative flex bg-background/80 border border-white/5 p-1 rounded-xl mb-6">
            <motion.div
              layoutId="activeTabBg"
              className="absolute top-1 bottom-1 bg-primary rounded-lg shadow-md"
              initial={false}
              animate={{
                left: activeTab === 'login' ? '4px' : 'calc(50% + 2px)',
                right: activeTab === 'login' ? 'calc(50% + 2px)' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('login')}
              className={`w-1/2 text-center py-2 text-xs font-bold z-10 transition-colors duration-200 ${
                activeTab === 'login' ? 'text-white' : 'text-muted hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`w-1/2 text-center py-2 text-xs font-bold z-10 transition-colors duration-200 ${
                activeTab === 'register' ? 'text-white' : 'text-muted hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form Containers */}
        <AnimatePresence mode="wait">
          {activeTab === 'login' && (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-muted font-bold tracking-wider uppercase block">Password</label>
                  <a href="#forgot" className="text-[10px] text-accent hover:underline font-bold">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>

              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-white/5 w-full absolute z-0" />
                <span className="bg-[#151518] px-3 text-[10px] text-muted font-bold tracking-widest uppercase z-10">OR CONTINUE WITH</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/5 font-bold py-3 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {/* SVG Google G Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.106C18.23 1.844 15.48 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.743-.075-1.309-.17-1.859H12.24z"/>
                </svg>
                Continue with Google
              </button>
            </motion.form>
          )}

          {activeTab === 'register' && (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleRegisterSubmit}
              className="space-y-4"
            >
              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white pl-11 pr-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </motion.form>
          )}

          {activeTab === 'otp' && (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleOtpSubmit}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-sm font-bold text-white">Verification Code</h3>
                <p className="text-muted text-[11px] mt-1.5 font-medium">We sent a 6-digit OTP code to <br/><span className="text-accent">{unverifiedEmail}</span></p>
                {devOtp && (
                  <p className="text-[11px] mt-2 text-accent font-semibold">Dev OTP: {devOtp}</p>
                )}
              </div>

              {/* 6 Digit Individual boxes */}
              <div className="flex justify-between gap-2 my-6" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    className="w-12 h-14 bg-background text-white text-center font-extrabold text-lg border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl transition-all duration-200"
                    required
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-xs font-semibold px-1">
                {isTimerRunning ? (
                  <span className="text-muted text-[11px] font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-accent animate-pulse" /> Expires in {formatTime(countdown)}
                  </span>
                ) : (
                  <span className="text-red-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Code expired
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isTimerRunning}
                  className={`text-[11px] font-bold ${
                    isTimerRunning ? 'text-muted cursor-not-allowed' : 'text-accent hover:underline'
                  }`}
                >
                  Resend OTP
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setOtpDigits(['', '', '', '', '', '']);
                  }}
                  className="text-muted hover:text-white text-[11px] font-bold"
                >
                  ← Back to register
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
