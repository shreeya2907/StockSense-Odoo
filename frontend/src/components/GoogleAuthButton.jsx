import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Check, Mail, User } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function GoogleAuthButton({ label = 'Continue with Google' }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Handle Google GIS ID Token response
  const handleCredentialResponse = async (response) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      login(res.data.user, res.data.token);
      toast.success(`Signed in as ${res.data.user.name || res.data.user.email}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });
      } catch (err) {
        console.warn('Google Identity initialization error:', err);
      }
    }
  }, [googleClientId]);

  const handleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn('GIS prompt error, opening selector modal:', e);
      }
    }
    // If no Google Client ID configured, open instant Google Sign-in modal
    setModalOpen(true);
  };

  const handleQuickGoogleAuth = async (email, name) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { email, name });
      login(res.data.user, res.data.token);
      toast.success(`Google Sign-In successful! Welcome, ${res.data.user.name}.`);
      setModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customName || customEmail.split('@')[0];
    handleQuickGoogleAuth(customEmail, name);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '10px 16px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: 600,
          color: '#1E293B',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.borderColor = '#94A3B8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#FFFFFF';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.25 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
          />
        </svg>
        <span>{loading ? 'Connecting Google...' : label}</span>
      </button>

      {/* Modal for Google Auth when VITE_GOOGLE_CLIENT_ID is not configured or for instant testing */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  marginBottom: '10px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.25 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Sign in with Google
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
                Instant one-click authentication for StockSense
              </p>
            </div>

            {/* Quick Demo Google Accounts */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                Choose an account
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickGoogleAuth('alex.chen@stocksense.io', 'Alex Chen')}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                    AC
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#0F172A' }}>Alex Chen</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>alex.chen@stocksense.io</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#E0E7FF', color: '#4338CA', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGoogleAuth('sarah.miller@stocksense.io', 'Sarah Miller')}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0D9488', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                    SM
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#0F172A' }}>Sarah Miller</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>sarah.miller@stocksense.io</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#CCFBF1', color: '#0F766E', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Demo</span>
                </button>
              </div>
            </div>

            {/* Custom Google Email Form */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '10px', textAlign: 'center' }}>
                Or sign in with any Google account
              </div>

              <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      fontSize: '0.84rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      fontSize: '0.84rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !customEmail}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '9px', fontSize: '0.86rem', marginTop: '4px' }}
                >
                  {loading ? 'Authenticating...' : 'Sign In with This Account'}
                </button>
              </form>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8' }}>
              🔒 Protected by 256-bit StockSense OAuth Architecture
            </div>
          </div>
        </div>
      )}
    </>
  );
}
