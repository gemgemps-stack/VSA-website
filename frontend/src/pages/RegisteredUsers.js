import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import userService from '../services/userService';

const RegisteredUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState('ORDERS');

  const permissionOptions = ['ORDERS', 'INVENTORY', 'CLIENTS', 'SOURCE_OF_INCOME'];

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers(currentPage - 1, 10);
      setUsers(response.data.content || []);
      setTotalPages(Math.ceil((response.data.totalElements || 0) / 10));
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await userService.deleteUser(id);
      alert('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleGrantPermission = async () => {
    try {
      await userService.grantPermission(selectedUserId, selectedPermission);
      alert('Permission granted successfully');
      setPermissionModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error granting permission:', error);
      alert('Failed to grant permission');
    }
  };

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'salary', label: 'Salary' },
  ];

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <h1>Registered Users</h1>
        </div>

        <DataTable
          columns={columns}
          data={users}
          onDelete={handleDeleteUser}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onEdit={(user) => {
            setSelectedUserId(user.id);
            setPermissionModalOpen(true);
          }}
        />

        <Modal
          isOpen={permissionModalOpen}
          title="Grant Permission"
          onClose={() => setPermissionModalOpen(false)}
          onSubmit={handleGrantPermission}
          submitText="Grant"
        >
          <div className="form-group">
            <label>Select Permission</label>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
            >
              {permissionOptions.map(perm => (
                <option key={perm} value={perm}>{perm}</option>
              ))}
            </select>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default RegisteredUsers;
