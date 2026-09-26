import React from 'react';
import { User, Mail, Shield, Calendar, LogOut } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <Topbar title="My Profile" />

      <div className="page-body">
        <div
          style={{
            maxWidth: '600px',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '1.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user?.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Role: <strong style={{ color: 'var(--primary)' }}>{user?.role}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={18} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Login Identifier</div>
                <div style={{ fontWeight: 600 }}>{user?.loginId}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={18} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                <div style={{ fontWeight: 600 }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={18} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Access Role</div>
                <div style={{ fontWeight: 600 }}>
                  {user?.role === 'MANAGER' ? 'Inventory Manager (Full Access)' : 'Warehouse Staff (Operations)'}
                </div>
              </div>
            </div>

            {user?.createdAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={18} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Created</div>
                  <div style={{ fontWeight: 600 }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button className="btn btn-danger" onClick={handleLogout}>
              <LogOut size={16} /> Sign Out of StockSense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
