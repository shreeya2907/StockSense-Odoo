import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  History,
  Warehouse,
  MapPin,
  User,
  LogOut,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Boxes size={26} color="#818CF8" />
        <div>
          <h2>Stock<span>Sense</span></h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Overview</div>
        <NavLink to="/dashboard" className={navClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/products" className={navClass}>
          <Package size={18} />
          <span>Products</span>
        </NavLink>

        <div className="nav-section-title">Operations</div>
        <NavLink to="/receipts" className={navClass}>
          <ArrowDownToLine size={18} />
          <span>Receipts (In)</span>
        </NavLink>
        <NavLink to="/deliveries" className={navClass}>
          <ArrowUpFromLine size={18} />
          <span>Deliveries (Out)</span>
        </NavLink>
        <NavLink to="/transfers" className={navClass}>
          <ArrowLeftRight size={18} />
          <span>Internal Transfers</span>
        </NavLink>
        <NavLink to="/adjustments" className={navClass}>
          <ClipboardList size={18} />
          <span>Adjustments</span>
        </NavLink>
        <NavLink to="/movements" className={navClass}>
          <History size={18} />
          <span>Move History</span>
        </NavLink>

        <div className="nav-section-title">Configuration</div>
        <NavLink to="/warehouses" className={navClass}>
          <Warehouse size={18} />
          <span>Warehouses</span>
        </NavLink>
        <NavLink to="/locations" className={navClass}>
          <MapPin size={18} />
          <span>Locations</span>
        </NavLink>

        <div className="nav-section-title">Account</div>
        <NavLink to="/profile" className={navClass}>
          <User size={18} />
          <span>My Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Staff'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
