import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, RotateCw, Copy, Check } from 'lucide-react';
import api from '../api/axiosInstance';
import { useToast } from '../components/Toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP & New Password
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [copied, setCopied] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  // Cooldown countdown effect
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Password rules validation
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasSpecial && passwordsMatch;

  // Step 1: Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { email });
      const receivedCode = res.data.otp || res.data.resetToken;
      setDispatchedOtp(receivedCode);
      setStep(2);
      setResendCooldown(30);
      toast.success('6-digit OTP code dispatched successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { email });
      const receivedCode = res.data.otp || res.data.resetToken;
      setDispatchedOtp(receivedCode);
      setResendCooldown(30);
      toast.info('New 6-digit OTP code sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please ensure all password security requirements are fulfilled.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-otp-reset', {
        email,
        otp,
        newPassword,
      });
      toast.success('Password updated successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.84rem',
            color: '#64748B',
            textDecoration: 'none',
            marginBottom: '20px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#1E293B')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '14px',
              borderRadius: '16px',
              background: '#EEF2FF',
              color: '#4F46E5',
              marginBottom: '12px',
            }}
          >
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {step === 1 ? 'Reset Password' : 'Enter 6-Digit OTP'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '6px' }}>
            {step === 1
              ? 'Enter your registered email address to receive an OTP verification code'
              : `Verification code dispatched to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                Account Email Address
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
                  style={{ paddingLeft: '38px', height: '42px', fontSize: '0.9rem' }}
                  placeholder="name@stocksense.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '0.76rem', color: '#94A3B8', display: 'block', marginTop: '6px' }}>
                We'll generate a secure 6-digit one-time code valid for 10 minutes.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Sending Code...' : 'Send 6-Digit OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            {/* Live OTP Preview / Simulation Box */}
            {dispatchedOtp && (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                    StockSense OTP Dispatcher
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

            {/* OTP Input Field */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                  Enter 6-Digit OTP
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
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                New Password
              </label>
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
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '40px' }}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                Confirm New Password
              </label>
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
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Requirement Checklist */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '18px',
                fontSize: '0.76rem',
                color: '#64748B',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLen ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={hasMinLen ? '#16A34A' : '#CBD5E1'} /> 8+ Characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasUpper ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={hasUpper ? '#16A34A' : '#CBD5E1'} /> 1 Uppercase (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLower ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={hasLower ? '#16A34A' : '#CBD5E1'} /> 1 Lowercase (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSpecial ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={hasSpecial ? '#16A34A' : '#CBD5E1'} /> 1 Special (!@#$)
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={passwordsMatch ? '#16A34A' : '#CBD5E1'} /> Passwords Match
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: 600 }}
              disabled={loading || otp.length !== 6 || !isPasswordValid}
            >
              {loading ? 'Resetting Password...' : 'Verify OTP & Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
