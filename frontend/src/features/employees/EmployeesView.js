import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import { expandPermissions } from '../../utils/permissions';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const TEAM_OPTIONS = ['Marketing', 'Production', 'Sewing'];

const extractUsers = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload?.content && Array.isArray(payload.content)) {
    return payload.content;
  }

  return [];
};

const Employees = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [registerMode, setRegisterMode] = useState(null);

  const employeeFilters = [
    { key: 'ALL', label: 'All Employees' },
    { key: 'ADMIN', label: 'Admins' },
    { key: 'MARKETING', label: 'Marketing' },
    { key: 'PRODUCTION', label: 'Production' },
    { key: 'SEWING', label: 'Sewing' },
  ];

  const pagePermissions = [
    { key: 'INVENTORY', label: 'Inventory' },
    { key: 'INVENTORY_ORDERS', label: 'Inventory Orders' },
    { key: 'CUSTOMIZED_ORDERS', label: 'Customized Orders' },
    { key: 'TEAMS', label: 'Teams' },
    { key: 'CLIENTS', label: 'Clients' },
    { key: 'ATTENDANCE', label: 'Attendance' },
    { key: 'SOURCE_OF_INCOME', label: 'Finance' },
    { key: 'EMPLOYEES', label: 'Employees' },
  ];

  const createInitialFormData = () => ({
    username: '',
    email: '',
    password: '',
    role: '',
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData());
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await userService.getAllUsers(currentPage - 1, 10);
      const nextUsers = extractUsers(response.data);
      setUsers(nextUsers);

      const totalElements =
        typeof response.data?.totalElements === 'number' ? response.data.totalElements : nextUsers.length;
      setTotalPages(Math.max(1, Math.ceil(totalElements / 10)));
    } catch (error) {
      console.error('Error loading employees:', error);
      if (isAuthOrPermissionError(error)) {
        return;
      }
      const errorMsg = getApiErrorMessage(error, 'Failed to load employees');
      alert(`Failed to load employees: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
      setUsers([]);
      setTotalPages(1);
    }
  }, [isAdmin, loadUsers]);

  const openRegisterModal = (mode) => {
    setRegisterMode(mode);
    const initialFormData = createInitialFormData();
    if (mode === 'admin') {
      initialFormData.role = 'ADMIN';
    }
    setFormData(initialFormData);
    setSelectedPermissions([]);
    setRegisterModalOpen(true);
  };

  const closeRegisterModal = () => {
    setRegisterModalOpen(false);
    setRegisterMode(null);
    setFormData(createInitialFormData());
    setSelectedPermissions([]);
  };

  const openPermissionsModal = (employee) => {
    setSelectedUser(employee);
    setSelectedPermissions(expandPermissions((employee.permissions || []).map((permission) => permission.pageName)));
    setPermissionsModalOpen(true);
  };

  const closePermissionsModal = () => {
    setPermissionsModalOpen(false);
    setSelectedUser(null);
    setSelectedPermissions([]);
  };

  const handlePermissionToggle = (permissionKey) => {
    setSelectedPermissions((current) =>
      current.includes(permissionKey) ? current.filter((item) => item !== permissionKey) : [...current, permissionKey]
    );
  };

  const syncPermissions = async (userId, nextPermissions, currentPermissions = []) => {
    const currentSet = new Set(currentPermissions);
    const nextSet = new Set(nextPermissions);

    const permissionsToGrant = nextPermissions.filter((permission) => !currentSet.has(permission));
    const permissionsToRevoke = currentPermissions.filter((permission) => !nextSet.has(permission));

    await Promise.all(permissionsToGrant.map((permission) => userService.grantPermission(userId, permission)));
    await Promise.all(permissionsToRevoke.map((permission) => userService.revokePermission(userId, permission)));
  };

  const handleRegisterEmployee = async () => {
    try {
      const trimmedUsername = String(formData.username || '').trim();
      const selectedTeam = String(formData.role || '').trim();
      const isAdminRegistration = registerMode === 'admin';

      if (!trimmedUsername) {
        alert('Please enter the employee name before saving.');
        return;
      }

      if (!selectedTeam) {
        alert('Please select a team before saving.');
        return;
      }

      if (isAdminRegistration && !String(formData.email || '').trim()) {
        alert('Please enter the email address before saving.');
        return;
      }

      if (isAdminRegistration && !String(formData.password || '').trim()) {
        alert('Please enter the password before saving.');
        return;
      }

      const payload = {
        username: trimmedUsername,
        email: isAdminRegistration ? String(formData.email || '').trim() : null,
        password: isAdminRegistration ? String(formData.password || '') : null,
        role: selectedTeam.toUpperCase(),
      };

      setFormLoading(true);
      const response = await userService.createUser(payload);
      const createdUser = response.data;
      let permissionSyncFailed = false;

      if (selectedPermissions.length > 0 && createdUser?.id) {
        try {
          await syncPermissions(createdUser.id, selectedPermissions);
        } catch (permissionError) {
          console.error('Error applying permissions:', permissionError);
          permissionSyncFailed = true;
        }
      }

      alert(
        permissionSyncFailed
          ? 'Employee registered, but some permissions could not be saved.'
          : 'Employee registered successfully'
      );
      closeRegisterModal();
      loadUsers();
    } catch (error) {
      console.error('Error registering employee:', error);
      alert(error.response?.data?.message || 'Failed to register employee');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser?.id) return;

    try {
      setPermissionSaving(true);
      const currentPermissions = expandPermissions((selectedUser.permissions || []).map((permission) => permission.pageName));
      await syncPermissions(selectedUser.id, selectedPermissions, currentPermissions);
      alert('Permissions updated successfully');
      closePermissionsModal();
      loadUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setPermissionSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await userService.deleteUser(id);
      alert('Employee deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const columns = [
    { key: 'username', label: 'Employee Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role / Team' },
    {
      key: 'permissions',
      label: 'Page Access',
      render: (_, row) =>
        row.permissions && row.permissions.length > 0
          ? row.permissions.map((permission) => permission.pageName).join(', ')
          : 'No page access',
    },
  ];

  const filteredUsers = users.filter((employee) => {
    const matchesRole = employeeFilter === 'ALL' || (employee.role || '').toUpperCase() === employeeFilter;
    const haystack = `${employee.username || ''} ${employee.email || ''} ${employee.role || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.trim().toLowerCase());

    return matchesRole && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <h1>Employees</h1>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => openRegisterModal('employee')} type="button">
                + Register New Employee
              </button>
              <button className="btn-primary" onClick={() => openRegisterModal('admin')} type="button">
                + Register New Admin
              </button>
            </div>
          )}
        </div>

        {isAdmin ? (
          <>
            <div className="employee-search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search employees by name, email, or role"
              />
            </div>

            <div className="orders-filter-bar">
              {employeeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`order-filter-btn ${employeeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => {
                    setEmployeeFilter(filter.key);
                    setCurrentPage(1);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <DataTable
              columns={columns}
              data={filteredUsers}
              onEdit={openPermissionsModal}
              onDelete={handleDeleteUser}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            <Modal
              isOpen={registerModalOpen}
              title={registerMode === 'admin' ? 'Register New Admin' : 'Register New Employee'}
              onClose={closeRegisterModal}
              onSubmit={handleRegisterEmployee}
              submitText={registerMode === 'admin' ? 'Register Admin' : 'Register Employee'}
              loading={formLoading}
              size={registerMode === 'admin' ? 'large' : 'default'}
            >
              <div className="employee-modal-grid">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter employee name"
                    required
                  />
                </div>

                {registerMode === 'admin' ? (
                  <>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Create a password"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Team</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="" disabled>
                        Select Team
                      </option>
                      {TEAM_OPTIONS.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {registerMode === 'admin' && (
                <div className="permission-section">
                  <div className="permission-section-header">
                    <h3>Page Viewing Permissions</h3>
                    <p>Dashboard is always available. Select from the current sidebar pages below.</p>
                  </div>

                  <div className="permission-checkbox-grid">
                    {pagePermissions.map((permission) => (
                      <label key={permission.key} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => handlePermissionToggle(permission.key)}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Modal>

            <Modal
              isOpen={permissionsModalOpen}
              title={selectedUser ? `Manage Permissions: ${selectedUser.username}` : 'Manage Permissions'}
              onClose={closePermissionsModal}
              onSubmit={handleSavePermissions}
              submitText="Save Permissions"
              loading={permissionSaving}
              size="large"
            >
              <div className="permission-section">
                <div className="permission-section-header">
                  <h3>Page Viewing Permissions</h3>
                  <p>Dashboard is always available. Update access for the current sidebar pages below.</p>
                </div>

                <div className="permission-checkbox-grid">
                  {pagePermissions.map((permission) => (
                    <label key={permission.key} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.key)}
                        onChange={() => handlePermissionToggle(permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Modal>
          </>
        ) : (
          <div className="permission-section" style={{ marginTop: '8px' }}>
            <div className="permission-section-header">
              <h3>Employees Access</h3>
              <p>You have permission to open this page, but employee management controls are reserved for administrators.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;
