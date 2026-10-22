import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import SearchField from '../../components/SearchField';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const TEAM_OPTIONS = ['Marketing', 'Production', 'Sewing', 'Graphic Artist', 'Sales', 'Machine Operator'];

const toRoleKey = (team) => {
  const normalized = String(team || '').trim().replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'GRAPHIC_ARTIST' || normalized === 'GRAPHIC_ARTISTS') return 'GRAPHIC';
  if (normalized === 'MACHINE_OPERATOR' || normalized === 'MACHINE_OPERATORS') return 'MACHINE';
  return normalized;
};

const toTeamLabel = (roleKey) => {
  const normalized = String(roleKey || '').toUpperCase();
  if (['GRAPHIC', 'GRAPHIC_ARTIST', 'GRAPHIC_ARTISTS'].includes(normalized)) return 'Graphic Artist';
  if (['MACHINE', 'MACHINE_OPERATOR', 'MACHINE_OPERATORS'].includes(normalized)) return 'Machine Operator';
  return TEAM_OPTIONS.find((team) => toRoleKey(team) === normalized) || '';
};

const extractUsers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.content && Array.isArray(payload.content)) return payload.content;
  return [];
};

const createInitialFormData = () => ({
  username: '',
  email: '',
  password: '',
  role: '',
  additionalRoles: [],
});

const Employees = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [registerMode, setRegisterMode] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm, setRoleForm] = useState({ role: '', additionalRoles: [] });
  const [accountForm, setAccountForm] = useState({ email: '', password: '' });
  const [formData, setFormData] = useState(createInitialFormData());
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const employeeFilters = [
    { key: 'ALL', label: 'All Employees' },
    { key: 'ADMIN', label: 'Admins' },
    { key: 'MARKETING', label: 'Marketing' },
    { key: 'PRODUCTION', label: 'Production' },
    { key: 'SEWING', label: 'Sewing' },
    { key: 'GRAPHIC', label: 'Graphic Artist' },
    { key: 'SALES', label: 'Sales' },
    { key: 'MACHINE', label: 'Machine Operator' },
  ];

  const pagePermissions = [
    { key: 'INVENTORY', label: 'Inventory' },
    { key: 'INVENTORY_ORDERS', label: 'Inventory Orders' },
    { key: 'CUSTOMIZED_ORDERS', label: 'Customized Orders' },
    { key: 'RETURNED_ORDERS', label: 'Returned Orders' },
    { key: 'CLIENTS', label: 'Clients' },
    { key: 'ATTENDANCE', label: 'Attendance' },
    { key: 'SOURCE_OF_INCOME', label: 'Finance' },
    { key: 'FINANCE_ARCHIVE', label: 'Finance Archive' },
    { key: 'EMPLOYEES', label: 'Employees' },
  ];

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

  const openRolesModal = (employee) => {
    setSelectedUser(employee);
    setAccountForm({ email: employee.email || '', password: '' });
    setSelectedPermissions(
      (employee.permissions || [])
        .map((permission) => permission.pageName)
        .filter(Boolean)
    );
    setRoleForm({
      role: toTeamLabel(employee.role),
      additionalRoles: (employee.additionalRoles || [])
        .map((role) => toTeamLabel(role))
        .filter(Boolean),
    });
    setRolesModalOpen(true);
  };

  const closeRolesModal = () => {
    setRolesModalOpen(false);
    setSelectedUser(null);
    setRoleForm({ role: '', additionalRoles: [] });
    setAccountForm({ email: '', password: '' });
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

    for (const permission of permissionsToGrant) {
      await userService.grantPermission(userId, permission);
    }
    for (const permission of permissionsToRevoke) {
      await userService.revokePermission(userId, permission);
    }
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

      const email = String(formData.email || '').trim();
      const password = String(formData.password || '').trim();

      if (isAdminRegistration && !email) {
        alert('Please enter the email address before saving.');
        return;
      }

      if (isAdminRegistration && !password) {
        alert('Please enter the password before saving.');
        return;
      }

      const payload = {
        username: trimmedUsername,
        email: email || null,
        password: password || null,
        role: toRoleKey(selectedTeam),
        additionalRoles: (formData.additionalRoles || []).map((role) => toRoleKey(role)),
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
      const errorMsg = getApiErrorMessage(error, 'Failed to register employee');
      alert(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!selectedUser?.id) return;

    const isSelectedUserAdmin = String(selectedUser.role || '').toUpperCase() === 'ADMIN';
    const email = String(accountForm.email || '').trim();
    const password = String(accountForm.password || '');

    if (isSelectedUserAdmin && !email) {
      alert('Please enter the email address before saving.');
      return;
    }
    if (password && password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (!isSelectedUserAdmin && !String(roleForm.role || '').trim()) {
      alert('Please select a team before saving.');
      return;
    }

    try {
      setRoleSaving(true);
      const updatePayload = {
        ...(email ? { email } : {}),
        ...(password ? { password } : {}),
        ...(!isSelectedUserAdmin
          ? {
              role: toRoleKey(String(roleForm.role || '').trim()),
              additionalRoles: (roleForm.additionalRoles || []).map((role) => toRoleKey(role)),
            }
          : {}),
      };
      await userService.updateUser(selectedUser.id, updatePayload);

      const currentPermissions = (selectedUser.permissions || [])
        .map((permission) => permission.pageName)
        .filter(Boolean);
      await syncPermissions(selectedUser.id, selectedPermissions, currentPermissions);

      alert(
        isSelectedUserAdmin
          ? 'Account and permissions updated successfully'
          : 'Account, roles, and permissions updated successfully'
      );
      closeRolesModal();
      loadUsers();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(getApiErrorMessage(error, 'Failed to update employee'));
    } finally {
      setRoleSaving(false);
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
    {
      key: 'role',
      label: 'Role / Team',
      render: (_, row) => {
        const allRoles = [row.role, ...(row.additionalRoles || [])].filter(Boolean);
        return allRoles.map((role) => toTeamLabel(role) || role).join(', ');
      },
    },
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
    const allRoles = [employee.role, ...(employee.additionalRoles || [])]
      .filter(Boolean)
      .map((role) => role.toUpperCase());
    const matchesRole = employeeFilter === 'ALL' || allRoles.includes(employeeFilter);
    const roleText = [employee.role, ...(employee.additionalRoles || [])].filter(Boolean).join(' ');
    const haystack = `${employee.username || ''} ${employee.email || ''} ${roleText}`.toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.trim().toLowerCase());

    return matchesRole && matchesSearch;
  });

  const staffStats = [
    { label: 'Registered staff', value: users.length, detail: 'People in the roster' },
    { label: 'Admins', value: users.filter((employee) => (employee.role || '').toUpperCase() === 'ADMIN').length, detail: 'Permission leaders' },
    { label: 'Visible now', value: filteredUsers.length, detail: 'Matching your filters' },
  ];
  const editingAdmin = String(selectedUser?.role || '').toUpperCase() === 'ADMIN';

  return (
    <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <div className="page-title-block">
              <span style={sectionIconBadgeStyle} aria-hidden="true">
                <SectionIcon variant="employees" />
              </span>
              <span className="page-eyebrow">People & access</span>
              <h1>Employees</h1>
              <p className="page-subtitle">
              Keep your team roster, roles, and page permissions clear and easy to manage.
            </p>
          </div>
          {isAdmin && (
            <div className="page-actions">
              <button className="btn-primary" onClick={() => openRegisterModal('employee')} type="button">
                Register Employee
              </button>
              <button className="btn-primary" onClick={() => openRegisterModal('admin')} type="button">
                Register Admin
              </button>
            </div>
          )}
        </div>

        {isAdmin ? (
          <div className="content-surface">
            <div className="content-surface-header">
              <div>
                <h2>Team overview</h2>
                <p>Quickly scan your workforce, refine the roster, and keep permissions aligned.</p>
              </div>
              <div className="stats-strip">
                {staffStats.map((stat) => (
                  <div key={stat.label} className="stat-pill">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                    <small>{stat.detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="search-and-filter-row">
              <SearchField
                className="employee-search-bar"
                wrapperProps={{ 'aria-label': 'Employee search' }}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search employees by name, email, or role"
              />

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
            </div>

            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                <span style={{ ...sectionIconBadgeStyle, marginBottom: '12px' }} aria-hidden="true">
                  <SectionIcon variant="employees" />
                </span>
                <h3>No employees match this view yet</h3>
                <p>Try adjusting your search or switching filters to see more people.</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredUsers}
                onEdit={openRolesModal}
                onDelete={handleDeleteUser}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

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

                <div className="form-group">
                  <label>Email Address{registerMode === 'admin' ? ' *' : ''}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required={registerMode === 'admin'}
                  />
                </div>

                <div className="form-group">
                  <label>Password{registerMode === 'admin' ? ' *' : ''}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={registerMode === 'admin' ? 'Create a password' : 'Optional'}
                    required={registerMode === 'admin'}
                  />
                </div>

                {registerMode === 'admin' ? (
                  <>
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
                  <>
                    <div className="form-group">
                      <label>Team</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="" disabled>
                          Select team
                        </option>
                        {TEAM_OPTIONS.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Additional Teams (optional)</label>
                      <div className="permission-checkbox-grid">
                        {TEAM_OPTIONS.filter((team) => team !== formData.role).map((team) => (
                          <label key={team} className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={(formData.additionalRoles || []).includes(team)}
                              onChange={() =>
                                setFormData((current) => {
                                  const roles = current.additionalRoles || [];
                                  return {
                                    ...current,
                                    additionalRoles: roles.includes(team)
                                      ? roles.filter((item) => item !== team)
                                      : [...roles, team],
                                  };
                                })
                              }
                            />
                            <span>{team}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

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
            </Modal>

            <Modal
              isOpen={rolesModalOpen}
              title={
                selectedUser
                  ? `${editingAdmin ? 'Edit Page Permissions' : 'Edit Roles'}: ${selectedUser.username}`
                  : 'Edit Roles'
              }
              onClose={closeRolesModal}
              onSubmit={handleSaveRoles}
              submitText="Save Changes"
              loading={roleSaving}
              size="large"
            >
              <div className="employee-modal-grid">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm((current) => ({ ...current, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm((current) => ({ ...current, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {!editingAdmin && (
                <div className="employee-modal-grid">
                  <div className="form-group">
                    <label>Team</label>
                    <select
                      value={roleForm.role}
                      onChange={(e) => setRoleForm((current) => ({ ...current, role: e.target.value }))}
                      required
                    >
                      <option value="" disabled>
                        Select team
                      </option>
                      {TEAM_OPTIONS.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Additional Teams (optional)</label>
                    <div className="permission-checkbox-grid">
                      {TEAM_OPTIONS.filter((team) => team !== roleForm.role).map((team) => (
                        <label key={team} className="permission-checkbox">
                          <input
                            type="checkbox"
                            checked={(roleForm.additionalRoles || []).includes(team)}
                            onChange={() =>
                              setRoleForm((current) => {
                                const roles = current.additionalRoles || [];
                                return {
                                  ...current,
                                  additionalRoles: roles.includes(team)
                                    ? roles.filter((item) => item !== team)
                                    : [...roles, team],
                                };
                              })
                            }
                          />
                          <span>{team}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
            </Modal>
          </div>
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
