import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, User, Mail, ShieldCheck, KeyRound, AlertCircle, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleAuthButton from '../components/GoogleAuthButton';
import OtpSection from '../components/OtpSection';

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
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // Request Real-Time Sign-Up OTP
  const handleSendSignupOtp = async () => {
    if (!formData.email.trim()) {
      setErrorMsg('Please enter your email address first to receive the OTP.');
      toast.error('Enter email first');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      toast.error('Invalid email address');
      return;
    }

    setErrorMsg('');
    setSendingOtp(true);

    try {
      const res = await api.post('/auth/send-signup-otp', {
        email: formData.email.trim(),
        loginId: formData.loginId.trim() || undefined,
        name: formData.name.trim() || undefined,
      });

      setDispatchedOtp(res.data.otp);
      setResendCooldown(30);
      toast.success(res.data.message || '6-digit real-time OTP dispatched to your email!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch verification code';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMsg('Full name is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      setErrorMsg('A valid email address is required.');
      return false;
    }
    const cleanOtp = (otp || '').replace(/\s+/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Mandatory: Please enter the 6-digit real-time OTP sent to your email.');
      toast.error('6-digit OTP is mandatory');
      return false;
    }
    if (!formData.loginId || formData.loginId.length < 6 || formData.loginId.length > 12) {
      setErrorMsg('Login ID must be 6 to 12 characters.');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return false;
    }
    const hasUpper = /[A-Z]/.test(formData.password);
    const hasLower = /[a-z]/.test(formData.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);
    if (!hasUpper || !hasLower || !hasSpecial) {
      setErrorMsg('Password must contain at least 1 uppercase, 1 lowercase, and 1 special character.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter confirm password.');
      return false;
    }

    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanOtp = (otp || '').replace(/\s+/g, '');
      const res = await api.post('/auth/signup', {
        loginId: formData.loginId.trim(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        otp: cleanOtp,
      });

      login(res.data.user, res.data.token);
      toast.success(res.data.message || `Account created successfully as ${res.data.user.role}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Sign-up failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Preview assigned role in real-time
  const normName = (formData.name || '').toLowerCase().replace(/[^a-z]/g, '');
  const isSiya = normName.includes('siya') && (normName.includes('bhosle') || normName.includes('bhosale'));

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
          maxWidth: '480px',
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
            Create Your Account
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.86rem', marginTop: '4px' }}>
            Real-Time OTP Verification is Mandatory
          </p>
        </div>

        {/* Strict RBAC Role Assignment Notice */}
        <div
          style={{
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            color: '#0369A1',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={18} color="#0284C7" style={{ flexShrink: 0 }} />
          <div>
            <strong>RBAC Notice:</strong> Only <strong>Siya Bhosle</strong> is assigned <strong>Manager</strong> privileges. All other users (e.g. Ganesh, Shreeya, etc.) are strictly assigned <strong>Warehouse Staff</strong>.
          </div>
        </div>

        {/* Real-Time Live Role Indicator */}
        {formData.name && (
          <div
            style={{
              background: isSiya ? '#ECFDF5' : '#F8FAFC',
              border: isSiya ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.76rem',
              color: isSiya ? '#065F46' : '#475569',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Assigned Role:</span>
            <span style={{ fontWeight: 700 }}>
              {isSiya ? '👑 INVENTORY MANAGER (Siya Bhosle)' : '👤 WAREHOUSE STAFF'}
            </span>
          </div>
        )}

        {/* Error Feedback Alert Box */}
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

        {/* Google OAuth Quick Sign-Up */}
        <div style={{ marginBottom: '16px' }}>
          <GoogleAuthButton label="Sign up with Google" />
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
            Or register with mandatory OTP
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        <form onSubmit={handleSignup}>
          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Full Name <span style={{ color: '#DC2626' }}>*</span>
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
                placeholder="e.g. Siya Bhosle or Ganesh Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Email Address with Inline Send OTP Trigger */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem', margin: 0 }}>
                Email Address <span style={{ color: '#DC2626' }}>*</span>
              </label>
            </div>
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* DEDICATED REAL-TIME OTP SECTION (Directly Present & Visible) */}
          <OtpSection
            otp={otp}
            setOtp={setOtp}
            onSendOtp={handleSendSignupOtp}
            sending={sendingOtp}
            dispatchedOtp={dispatchedOtp}
            resendCooldown={resendCooldown}
            title="Real-Time 6-Digit Verification OTP"
            subtitle="Mandatory: Verify your email before saving data in backend."
            isMandatory={true}
            emailValue={formData.email}
          />

          {/* Login ID */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Login ID (6–12 alphanumeric characters) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
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
                placeholder="e.g. siyabhosale or ganesh01"
                value={formData.loginId}
                onChange={(e) => setFormData({ ...formData, loginId: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                maxLength={12}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Password <span style={{ color: '#DC2626' }}>*</span>
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
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px', height: '40px' }}
                placeholder="Min 8 chars, 1 Upper, 1 Lower, 1 Special"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Confirm Password <span style={{ color: '#DC2626' }}>*</span>
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
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px', height: '40px' }}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: 600, fontSize: '0.92rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying OTP & Creating Account...' : 'Verify OTP & Create Account'}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

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
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
            Sign in (OTP or Password)
          </Link>
        </div>
      </div>
    </div>
  );
}
