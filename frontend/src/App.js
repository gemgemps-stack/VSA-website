import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionGuard from './components/PermissionGuard';
import Login from './features/auth/LoginView';
import Dashboard from './features/dashboard/DashboardView';
import Orders from './features/orders/OrdersView';
import CustomizedOrders from './features/customized-orders/CustomizedOrdersView';
import Inventory from './features/inventory/InventoryView';
import Clients from './features/clients/ClientsView';
import SourceIncome from './features/source-income/SourceIncomeView';
import Employees from './features/employees/EmployeesView';
import Attendance from './features/attendance/AttendanceView';
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
                <PermissionGuard permission="INVENTORY_ORDERS">
                  <Orders />
                </PermissionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customized-orders"
            element={
              <ProtectedRoute>
                <PermissionGuard permission="CUSTOMIZED_ORDERS">
                  <CustomizedOrders />
                </PermissionGuard>
              </ProtectedRoute>
            }
          />
          <Route path="/teams" element={<Navigate to="/dashboard" replace />} />
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
            element={<Navigate to="/income" replace />} 
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
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <PermissionGuard permission="ATTENDANCE">
                  <Attendance />
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
