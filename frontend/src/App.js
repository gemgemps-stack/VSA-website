import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionGuard from './components/PermissionGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import SourceIncome from './pages/SourceIncome';
import PaymentMethods from './pages/PaymentMethods';
import Employees from './pages/Employees';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="ORDERS">
                  <Orders />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="INVENTORY">
                  <Inventory />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="CLIENTS">
                  <Clients />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/income" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="SOURCE_OF_INCOME">
                  <SourceIncome />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment-methods" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="PAYMENT_METHODS">
                  <PaymentMethods />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute>
                <PermissionGuard permission="EMPLOYEES">
                  <Employees />
                </PermissionGuard>
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
