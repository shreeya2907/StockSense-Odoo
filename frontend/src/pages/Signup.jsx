import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Lock, User, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
    role: 'STAFF',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const validate = () => {
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await api.post('/auth/signup', formData);
      login(res.data.user, res.data.token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create account';
      toast.error(msg);
      setErrors((prev) => ({ ...prev, form: msg }));
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
          maxWidth: '450px',
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
            <Boxes size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Create Account
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.84rem', marginTop: '4px' }}>
            Join the StockSense inventory operations network
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
            Or register with credentials
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Login ID (6–12 characters)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. staff_alex"
              value={formData.loginId}
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
              required
            />
            {errors.loginId && <div className="form-error">{errors.loginId}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Full Name
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Alex Johnson"
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
              placeholder="alex@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Role Assignment
            </label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="STAFF">Warehouse Staff</option>
              <option value="MANAGER">Inventory Manager</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.84rem' }}>
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Min 8 chars (1 uppercase, 1 lowercase, 1 special)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontWeight: 600, fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Complete Sign Up'}
          </button>
        </form>

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
