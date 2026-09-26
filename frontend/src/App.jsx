import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './routes/ProtectedRoute';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Receipts from './pages/Receipts';
import Deliveries from './pages/Deliveries';
import Transfers from './pages/Transfers';
import Adjustments from './pages/Adjustments';
import MoveHistory from './pages/MoveHistory';
import Warehouses from './pages/Warehouses';
import Locations from './pages/Locations';
import Profile from './pages/Profile';
import IntelligenceHub from './pages/IntelligenceHub';
import FloatingCopilot from './components/FloatingCopilot';

function AppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <FloatingCopilot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/intelligence" element={<IntelligenceHub />} />
                <Route path="/products" element={<Products />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/adjustments" element={<Adjustments />} />
                <Route path="/movements" element={<MoveHistory />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
