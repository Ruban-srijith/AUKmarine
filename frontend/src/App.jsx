import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SalesPOS from './pages/SalesPOS';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            
            {/* PUBLIC AUTH ROUTES */}
            <Route path="/login" element={<Login />} />

            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* SECURED ERP LAYOUT ROUTES */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/sales-pos" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SalesPOS />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/purchases" 
              element={
                <ProtectedRoute allowedRoles={['Owner', 'Manager']}>
                  <Layout>
                    <Purchases />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/customers" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute allowedRoles={['Owner', 'Manager']}>
                  <Layout>
                    <Suppliers />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute allowedRoles={['Owner', 'Manager']}>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/reports" 
              element={
                <ProtectedRoute allowedRoles={['Owner', 'Manager']}>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={['Owner', 'Manager']}>
                  <Layout>
                    <UsersPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/settings" 
              element={
                <ProtectedRoute allowedRoles={['Owner']}>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Fallback Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
