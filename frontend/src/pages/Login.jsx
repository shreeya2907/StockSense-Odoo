import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, Mail, ArrowRight, ShieldCheck, KeyRound, AlertCircle, Flame } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleAuthButton from '../components/GoogleAuthButton';
import OtpSection from '../components/OtpSection';
import { sendFirebaseEmailOtp, verifyFirebaseEmailOtp } from '../firebase';

export default function Login() {
  const [authMode, setAuthMode] = useState('firebase-otp'); // 'firebase-otp' or 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Request Real-Time Firebase Email OTP
  const handleSendFirebaseOtp = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address first.');
      toast.error('Enter email address first');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      toast.error('Invalid email format');
      return;
    }

    setErrorMsg('');
    setSendingOtp(true);

    try {
      const data = await sendFirebaseEmailOtp(email.trim(), 'login');
      setDispatchedOtp(data.otp);
      setResendCooldown(30);
      toast.success(data.message || 'Firebase 6-digit OTP sent to your email!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch Firebase OTP';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Sign in via Firebase Email OTP
  const handleFirebaseOtpLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    const cleanOtp = (otp || '').replace(/\s+/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit Firebase verification OTP.');
      toast.error('6-digit OTP is required');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const data = await verifyFirebaseEmailOtp(email.trim(), cleanOtp);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name} (${data.user.role})!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Firebase OTP verification failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign in via Standard Password
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered Email Address or Login ID.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        loginOrEmail: email.trim(),
        password,
      });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name} (${res.data.user.role})!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid Email / Login ID or Password';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '12px',
              background: '#EEF2FF',
              color: '#4F46E5',
              marginBottom: '10px',
            }}
          >
            <Boxes size={30} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Stock<span style={{ color: '#4F46E5' }}>Sense</span>
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.86rem', marginTop: '4px' }}>
            Firebase-Secured Warehouse & Inventory Authentication
          </p>
        </div>

        {/* Authentication Mode Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('firebase-otp');
              setErrorMsg('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: authMode === 'firebase-otp' ? '#FFFFFF' : 'transparent',
              color: authMode === 'firebase-otp' ? '#EA580C' : '#64748B',
              boxShadow: authMode === 'firebase-otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Flame size={16} color={authMode === 'firebase-otp' ? '#EA580C' : '#64748B'} /> Firebase OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setErrorMsg('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: authMode === 'password' ? '#FFFFFF' : 'transparent',
              color: authMode === 'password' ? '#4F46E5' : '#64748B',
              boxShadow: authMode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={16} /> Password
          </button>
        </div>

        {/* Direct Error Feedback Alert Box */}
        {errorMsg && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.84rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google OAuth Login */}
        <div style={{ marginBottom: '16px' }}>
          <GoogleAuthButton label="Sign in with Google" />
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '16px 0',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {authMode === 'firebase-otp' ? 'Or Sign In with Firebase Email OTP' : 'Or Sign In with Password'}
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* FIREBASE EMAIL WITH OTP STRICT SIGN-IN */}
        {authMode === 'firebase-otp' ? (
          <form onSubmit={handleFirebaseOtpLogin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '40px' }}
                  placeholder="e.g. siya.bhosale19@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Dedicated Real-Time Firebase OTP Section */}
            <OtpSection
              otp={otp}
              setOtp={setOtp}
              onSendOtp={handleSendFirebaseOtp}
              sending={sendingOtp}
              dispatchedOtp={dispatchedOtp}
              resendCooldown={resendCooldown}
              title="Firebase 6-Digit Verification OTP"
              subtitle="Enter your registered email and click Send OTP."
              isMandatory={true}
              emailValue={email}
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontWeight: 600,
                fontSize: '0.9rem',
                background: '#EA580C',
                borderColor: '#EA580C',
              }}
              disabled={loading}
            >
              {loading ? 'Verifying with Firebase...' : 'Verify Firebase OTP & Sign In'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        ) : (
          /* STANDARD PASSWORD SIGN-IN */
          <form onSubmit={handlePasswordLogin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                Email Address or Login ID
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '40px' }}
                  placeholder="e.g. siya.bhosale19@gmail.com or siyabhosale"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem', margin: 0 }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.8rem', color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontWeight: 600, fontSize: '0.9rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In with Password'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: '#64748B',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '16px',
          }}
        >
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
            Sign up (Mandatory Firebase OTP)
          </Link>
        </div>
      </div>
    </div>
  );
}
