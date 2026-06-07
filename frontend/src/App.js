import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionGuard from './components/PermissionGuard';
import Login from './features/auth/LoginView';
import Dashboard from './features/dashboard/DashboardView';
import Orders from './features/orders/OrdersView';
import Inventory from './features/inventory/InventoryView';
import Clients from './features/clients/ClientsView';
import SourceIncome from './features/source-income/SourceIncomeView';
import PaymentMethods from './features/payment-methods/PaymentMethodsView';
import Employees from './features/employees/EmployeesView';
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
