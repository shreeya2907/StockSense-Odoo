import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, User, Mail, ShieldCheck, KeyRound, RotateCw, Copy, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Signup() {
  const [formData, setFormData] = useState({
    loginId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Fill Details -> 2: Verify Mandatory 6-Digit OTP
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [copied, setCopied] = useState(false);

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

  const validateStep1 = () => {
    const errs = {};
    if (!formData.loginId || formData.loginId.length < 6 || formData.loginId.length > 12) {
      errs.loginId = 'Login ID must be 6–12 characters long';
    }
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errs.email = 'Valid email address is required';
    }
    if (!formData.password || formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else {
      const hasUpper = /[A-Z]/.test(formData.password);
      const hasLower = /[a-z]/.test(formData.password);
      const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);
      if (!hasUpper || !hasLower || !hasSpecial) {
        errs.password = 'Must contain uppercase, lowercase, and a special character';
      }
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Send Sign-Up OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await api.post('/auth/send-signup-otp', {
        loginId: formData.loginId,
        email: formData.email,
        name: formData.name,
      });

      setDispatchedOtp(res.data.otp);
      setStep(2);
      setResendCooldown(30);
      toast.success('6-digit OTP verification code dispatched!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch verification code';
      toast.error(msg);
      setErrors((prev) => ({ ...prev, form: msg }));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !formData.email) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/send-signup-otp', {
        loginId: formData.loginId,
        email: formData.email,
        name: formData.name,
      });
      setDispatchedOtp(res.data.otp);
      setResendCooldown(30);
      toast.info('New 6-digit OTP code sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Create Account
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        loginId: formData.loginId,
        email: formData.email,
        name: formData.name,
        password: formData.password,
        otp: otp.trim(),
      });

      login(res.data.user, res.data.token);
      toast.success(`Account verified! Welcome, ${res.data.user.name} (${res.data.user.role})`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP code';
      toast.error(msg);
      setErrors((prev) => ({ ...prev, otp: msg }));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.info('OTP copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSiya = formData.name.toLowerCase().includes('siya') || formData.email.toLowerCase().includes('siya');

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
          maxWidth: '460px',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
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
            {step === 1 ? <Boxes size={28} /> : <KeyRound size={28} />}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {step === 1 ? 'Create Account' : 'Verify 6-Digit OTP'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.84rem', marginTop: '4px' }}>
            {step === 1
              ? 'Join the StockSense inventory operations network'
              : `Mandatory verification code dispatched to ${formData.email}`}
          </p>
        </div>

        {errors.form && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            {errors.form}
          </div>
        )}

        {step === 1 ? (
          <>
            {/* Google OAuth Sign Up */}
            <div style={{ marginBottom: '18px' }}>
              <GoogleAuthButton label="Sign up with Google" />
            </div>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Or register with email OTP
              </span>
              <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            </div>

            <form onSubmit={handleRequestOtp}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Shreeya or Ganesh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  Login ID (6–12 characters)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. shreeya01 or ganesh24"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  required
                />
                {errors.loginId && <div className="form-error">{errors.loginId}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  Create Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 special"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>

              {/* RBAC Notice */}
              <div
                style={{
                  background: isSiya ? '#EEF2FF' : '#F8FAFC',
                  border: `1px solid ${isSiya ? '#C7D2FE' : '#E2E8F0'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  fontSize: '0.78rem',
                  color: isSiya ? '#4338CA' : '#64748B',
                }}
              >
                {isSiya ? (
                  <span>👑 <strong>Inventory Manager Role:</strong> Recognized as Siya Bhosle. Full managerial and validation permissions will be granted.</span>
                ) : (
                  <span>👤 <strong>Role Assignment:</strong> Registered under <strong>Warehouse Staff</strong> (Administrative Manager role is reserved for Siya Bhosle).</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', fontWeight: 600, fontSize: '0.9rem' }}
                disabled={loading}
              >
                {loading ? 'Dispatching OTP...' : 'Send Verification OTP'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </>
        ) : (
          /* Step 2: Mandatory OTP Verification */
          <form onSubmit={handleVerifyAndSignup}>
            {/* Live Simulated OTP Preview Helper */}
            {dispatchedOtp && (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                    StockSense Verification OTP
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '4px', color: '#15803D', fontFamily: 'monospace' }}>
                    {dispatchedOtp}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(dispatchedOtp);
                      toast.success('OTP auto-filled!');
                    }}
                    style={{
                      background: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      color: '#166534',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Auto-Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(dispatchedOtp)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                  Enter 6-Digit OTP Code *
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#94A3B8' : '#4F46E5',
                    fontSize: '0.78rem',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <RotateCw size={12} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                className="form-input"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  letterSpacing: '8px',
                  fontFamily: 'monospace',
                  padding: '10px',
                }}
                required
              />
              {errors.otp && <div className="form-error">{errors.otp}</div>}
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '6px', textAlign: 'center' }}>
                Mandatory OTP verification is required to activate and save your account in the database.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '0.92rem' }}
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying & Creating Account...' : 'Verify OTP & Complete Sign-Up'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ArrowLeft size={14} /> Back to Edit Details
              </button>
            </div>
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
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
