import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, User, ArrowRight, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleAuthButton from '../components/GoogleAuthButton';
import OtpSection from '../components/OtpSection';

export default function Login() {
  const [authMode, setAuthMode] = useState('otp'); // 'otp' or 'password' - default to OTP to showcase real-time OTP section!
  const [loginId, setLoginId] = useState('');
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

  // Request Real-Time Login OTP
  const handleSendLoginOtp = async () => {
    if (!loginId.trim()) {
      setErrorMsg('Please enter your registered Email Address or Login ID first.');
      toast.error('Enter Email or Login ID first');
      return;
    }

    setErrorMsg('');
    setSendingOtp(true);

    try {
      const res = await api.post('/auth/send-login-otp', {
        loginOrEmail: loginId.trim(),
      });
      setDispatchedOtp(res.data.otp);
      setResendCooldown(30);
      toast.success(res.data.message || 'Real-time OTP dispatched to your email!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch login OTP';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Sign in via Real-Time OTP
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setErrorMsg('Please enter your registered Email Address or Login ID.');
      return;
    }
    const cleanOtp = (otp || '').replace(/\s+/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit real-time OTP code.');
      toast.error('6-digit OTP is required');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login-with-otp', {
        loginOrEmail: loginId.trim(),
        otp: cleanOtp,
      });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name} (${res.data.user.role})!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'OTP verification failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign in via Password
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!loginId.trim()) {
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
        loginOrEmail: loginId.trim(),
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

  const fillDemo = () => {
    setLoginId('demo01');
    setPassword('Password@123');
    setAuthMode('password');
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
            Real-Time Inventory & Warehouse Intelligence
          </p>
        </div>

        {/* Real-Time Sign-In Mode Switch Tabs */}
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
              setAuthMode('otp');
              setErrorMsg('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: authMode === 'otp' ? '#FFFFFF' : 'transparent',
              color: authMode === 'otp' ? '#4F46E5' : '#64748B',
              boxShadow: authMode === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={16} /> Real-Time OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setErrorMsg('');
            }}
            style={{
              padding: '8px 12px',
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

        {/* Explicit Error Feedback Alert Box */}
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
            {authMode === 'otp' ? 'Or Sign In with Real-Time OTP' : 'Or Sign In with Password'}
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* REAL-TIME OTP SIGN-IN FORM */}
        {authMode === 'otp' ? (
          <form onSubmit={handleOtpLogin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                Email Address or Login ID
              </label>
              <div style={{ position: 'relative' }}>
                <User
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
                  placeholder="e.g. siya.bhosale19@gmail.com or demo01"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Dedicated Real-Time OTP Section */}
            <OtpSection
              otp={otp}
              setOtp={setOtp}
              onSendOtp={handleSendLoginOtp}
              sending={sendingOtp}
              dispatchedOtp={dispatchedOtp}
              resendCooldown={resendCooldown}
              title="Real-Time 6-Digit Login OTP"
              subtitle="Enter your Email/ID above and click Send OTP to authenticate."
              isMandatory={true}
              emailValue={loginId}
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontWeight: 600, fontSize: '0.9rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        ) : (
          /* PASSWORD SIGN-IN FORM */
          <form onSubmit={handlePasswordLogin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                Email Address or Login ID
              </label>
              <div style={{ position: 'relative' }}>
                <User
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
                  placeholder="e.g. siya.bhosale19@gmail.com or demo01"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
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

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={fillDemo}
            className="btn btn-secondary btn-sm"
            style={{
              width: '100%',
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              color: '#475569',
              fontSize: '0.8rem',
              padding: '8px',
            }}
          >
            ⚡ Auto-fill Demo Credentials (demo01)
          </button>
        </div>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: '#64748B',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '16px',
          }}
        >
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
            Sign up (Mandatory OTP)
          </Link>
        </div>
      </div>
    </div>
  );
}
