import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import RegisterClient from './pages/RegisterClient';
import SourceIncome from './pages/SourceIncome';
import PaymentMethods from './pages/PaymentMethods';
import RegisterUser from './pages/RegisterUser';
import RegisteredUsers from './pages/RegisteredUsers';
import Employees from './pages/Employees';
import Admins from './pages/Admins';
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
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/register-client"
            element={
              <ProtectedRoute>
                <RegisterClient />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/income" 
            element={
              <ProtectedRoute>
                <SourceIncome />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment-methods" 
            element={
              <ProtectedRoute>
                <PaymentMethods />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register-user" 
            element={
              <ProtectedRoute>
                <RegisterUser />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/registered-users" 
            element={
              <ProtectedRoute>
                <RegisteredUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute>
                <Employees />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admins" 
            element={
              <ProtectedRoute>
                <Admins />
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
