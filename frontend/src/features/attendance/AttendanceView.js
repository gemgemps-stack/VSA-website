import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import userService from '../../services/userService';
import attendanceService from '../../services/attendanceService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const STATUS_OPTIONS = [
  { key: 'PRESENT', label: 'Present', tone: 'present' },
  { key: 'LATE', label: 'Late', tone: 'late' },
  { key: 'ABSENT', label: 'Absent', tone: 'absent' },
  { key: 'LEAVE', label: 'Leave', tone: 'leave' },
];

const DAY_TYPE_OPTIONS = [
  { key: 'HALF_DAY', label: 'Half Day', tone: 'half-day' },
  { key: 'FULL_DAY', label: 'Full Day', tone: 'full-day' },
  { key: 'OVERTIME', label: 'Overtime', tone: 'overtime' },
];

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getTodayInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (value) => {
  if (!value) return '';
  return String(value).slice(0, 5);
};

const formatDateLabel = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const getDateKey = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const createInitialFormData = () => ({
  userId: '',
  attendanceDate: getTodayInputValue(),
  timeIn: '',
  timeOut: '',
  status: 'PRESENT',
  notes: '',
});

const extractUsers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.content && Array.isArray(payload.content)) return payload.content;
  return [];
};

const AttendanceView = () => {
  const { user } = useAuth();
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotification();
  const [users, setUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeNameQuery, setEmployeeNameQuery] = useState('');
  const [statusQuery, setStatusQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [dayDetailsDate, setDayDetailsDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData());
  const [formLoading, setFormLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSuggestionsOpen, setEmployeeSuggestionsOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    const response = await userService.getAllUsers(0, 1000);
    setUsers(extractUsers(response.data));
  }, []);

  const loadAttendance = useCallback(async () => {
    const response = await attendanceService.getAttendanceByMonth(selectedYear, selectedMonth);
    setAttendanceRecords(response.data || []);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([loadUsers(), loadAttendance()]);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        if (isAuthOrPermissionError(error)) {
          return;
        }
        const errorMsg = getApiErrorMessage(error, 'Failed to load attendance data');
        notifyError(`Failed to load attendance data: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadAttendance, loadUsers, notifyError]);

  const filteredRecords = useMemo(() => {
    const normalizedEmployeeQuery = employeeNameQuery.trim().toLowerCase();
    const normalizedStatusQuery = statusQuery.trim().toLowerCase();

    return attendanceRecords.filter((record) => {
      const employeeHaystack = String(record.username || '').toLowerCase();
      const statusHaystack = String(record.status || '').toLowerCase();

      const matchesEmployee = !normalizedEmployeeQuery || employeeHaystack.includes(normalizedEmployeeQuery);
      const matchesStatus = !normalizedStatusQuery || statusHaystack.includes(normalizedStatusQuery);
      return matchesEmployee && matchesStatus;
    });
  }, [attendanceRecords, employeeNameQuery, statusQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / 10));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * 10, currentPage * 10);
  const isAdmin = user?.role === 'ADMIN';

  const filteredEmployees = users.filter((u) =>
    String(u.username || '').toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const handleEmployeeSelect = (u) => {
    setFormData({ ...formData, userId: u.id });
    setEmployeeSearch(u.username);
    setEmployeeSuggestionsOpen(false);
  };

  const handleEmployeeInputChange = (value) => {
    setEmployeeSearch(value);
    setEmployeeSuggestionsOpen(true);
    setFormData({ ...formData, userId: '' });
  };

  const handleEmployeeInputBlur = () => {
    setTimeout(() => setEmployeeSuggestionsOpen(false), 150);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [employeeNameQuery, statusQuery, selectedMonth, selectedYear]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const calculateHours = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;
    const [h1, m1] = timeIn.split(':').map(Number);
    const [h2, m2] = timeOut.split(':').map(Number);
    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    if (end <= start) return 0;
    
    let totalMinutes = end - start;
    
    // Subtract lunch break (12:00 PM - 1:00 PM = 720 to 780 minutes)
    const lunchStart = 12 * 60; // 12:00 PM in minutes
    const lunchEnd = 13 * 60;   // 1:00 PM in minutes
    
    // Check if the work period overlaps with lunch break
    if (start < lunchEnd && end > lunchStart) {
      // Calculate the overlap
      const overlapStart = Math.max(start, lunchStart);
      const overlapEnd = Math.min(end, lunchEnd);
      const lunchDuration = overlapEnd - overlapStart;
      totalMinutes -= lunchDuration;
    }
    
    return totalMinutes / 60;
  };

const calculateDayType = (hours) => {
    if (hours <= 5) return 'HALF_DAY';
    if (hours <= 8) return 'FULL_DAY';
    return 'OVERTIME';
  };

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        const status = (record.status || '').toUpperCase();
        acc.total += 1;
        if (status === 'PRESENT') acc.present += 1;
        if (status === 'LATE') acc.late += 1;
        if (status === 'ABSENT') acc.absent += 1;
        if (status === 'LEAVE') acc.leave += 1;
        
        let hours = 0;
        if (record.timeIn && record.timeOut) {
          hours = calculateHours(record.timeIn, record.timeOut);
          acc.totalHours += hours;
        }
        
        const dayType = calculateDayType(hours);
        if (dayType === 'HALF_DAY') acc.halfDay += 1;
        if (dayType === 'FULL_DAY') acc.fullDay += 1;
        if (dayType === 'OVERTIME') acc.overtime += 1;
        
        return acc;
      },
      { total: 0, present: 0, late: 0, absent: 0, leave: 0, halfDay: 0, fullDay: 0, overtime: 0, totalHours: 0 }
    );
  }, [filteredRecords]);

  const averageHours = summary.total > 0 ? summary.totalHours / summary.total : 0;
  const activeEmployees = new Set(filteredRecords.map((record) => String(record.username || '').trim()).filter(Boolean)).size;

  const recordsByDate = useMemo(() => {
    return attendanceRecords.reduce((acc, record) => {
      const key = getDateKey(record.attendanceDate);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {});
  }, [attendanceRecords]);

  const monthlySummary = useMemo(() => {
    const summaryMap = {};
    
    attendanceRecords.forEach((record) => {
      const username = record.username || 'Unknown';
      if (!summaryMap[username]) {
        summaryMap[username] = {
          username,
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          halfDay: 0,
          fullDay: 0,
          overtime: 0,
          totalHours: 0,
          overtimeHours: 0,
        };
      }
      
      const status = (record.status || '').toUpperCase();
      if (status === 'PRESENT') summaryMap[username].present += 1;
      else if (status === 'LATE') summaryMap[username].late += 1;
      else if (status === 'ABSENT') summaryMap[username].absent += 1;
      else if (status === 'LEAVE') summaryMap[username].leave += 1;
      
      let hours = 0;
      if (record.timeIn && record.timeOut) {
        hours = calculateHours(record.timeIn, record.timeOut);
        summaryMap[username].totalHours += hours;
        
        // Calculate overtime hours (any time beyond 8 hours)
        if (hours > 8) {
          summaryMap[username].overtimeHours += (hours - 8);
        }
      }
      
      const dayType = calculateDayType(hours);
      if (dayType === 'HALF_DAY') summaryMap[username].halfDay += 1;
      else if (dayType === 'FULL_DAY') summaryMap[username].fullDay += 1;
      else if (dayType === 'OVERTIME') summaryMap[username].overtime += 1;
    });
    
    return Object.values(summaryMap).sort((a, b) => b.totalHours - a.totalHours);
  }, [attendanceRecords]);

  const buildCalendarCells = () => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const padding = firstDay.getDay();
    const cells = [];

    for (let i = 0; i < padding; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push(dateKey);
    }

    return cells;
  };

  const getDayTone = (records) => {
    const statuses = records.map((record) => (record.status || '').toUpperCase());
    if (statuses.includes('ABSENT')) return 'absent';
    if (statuses.includes('LATE')) return 'late';
    if (statuses.includes('LEAVE')) return 'leave';
    if (statuses.includes('PRESENT')) return 'present';
    return '';
  };

  const openCreateModal = (dateOverride) => {
    setEditingRecord(null);
    setFormData({
      ...createInitialFormData(),
      attendanceDate: dateOverride || getTodayInputValue(),
    });
    setEmployeeSearch('');
    setEmployeeSuggestionsOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      userId: record.userId || '',
      attendanceDate: record.attendanceDate || getTodayInputValue(),
      timeIn: formatTimeForInput(record.timeIn),
      timeOut: formatTimeForInput(record.timeOut),
      status: (record.status || 'PRESENT').toUpperCase(),
      notes: record.notes || '',
    });
    setEmployeeSearch(record.username || '');
    setEmployeeSuggestionsOpen(false);
    setModalOpen(true);
  };

  const openEditModalFromDetails = (record) => {
    closeDetails();
    closeDayDetails();
    setTimeout(() => openEditModal(record), 0);
  };

  const openCreateModalFromDetails = (dateOverride) => {
    closeDetails();
    closeDayDetails();
    setTimeout(() => openCreateModal(dateOverride), 0);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormData(createInitialFormData());
    setEmployeeSearch('');
    setEmployeeSuggestionsOpen(false);
  };

  const handleView = (record) => {
    setDetailsRecord(record);
  };

  const closeDetails = () => {
    setDetailsRecord(null);
  };

  const closeDayDetails = () => {
    setDayDetailsDate(null);
  };

  const handleDelete = async (id) => {
    try {
      await attendanceService.deleteAttendance(id);
      notifySuccess('Attendance record deleted successfully');
      loadAttendance();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      notifyError(error.response?.data?.message || 'Failed to delete attendance record');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.userId || !formData.attendanceDate || !formData.status) {
        notifyInfo('Please fill in the required fields.');
        return;
      }

      setFormLoading(true);
      const payload = {
        userId: formData.userId,
        attendanceDate: formData.attendanceDate,
        timeIn: formData.timeIn || null,
        timeOut: formData.timeOut || null,
        status: formData.status,
        notes: formData.notes || '',
      };

      if (editingRecord) {
        await attendanceService.updateAttendance(editingRecord.id, payload);
        notifySuccess('Attendance updated successfully');
      } else {
        await attendanceService.createAttendance(payload);
        notifySuccess('Attendance created successfully');
      }

      closeModal();
      loadAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save attendance';
      notifyInfo(message);
    } finally {
      setFormLoading(false);
    }
  };

  const getDayTypeLabel = (record) => {
    if (!record.timeIn || !record.timeOut) return '-';
    const hours = calculateHours(record.timeIn, record.timeOut);
    const dayType = calculateDayType(hours);
    const option = DAY_TYPE_OPTIONS.find((opt) => opt.key === dayType);
    return option ? option.label : '-';
  };

  const columns = [
    { key: 'username', label: 'Employee' },
    {
      key: 'attendanceDate',
      label: 'Date',
      render: (value) => formatDateLabel(value),
    },
    {
      key: 'timeIn',
      label: 'Time In',
      render: (value) => (value ? String(value).slice(0, 5) : '-'),
    },
    {
      key: 'timeOut',
      label: 'Time Out',
      render: (value) => (value ? String(value).slice(0, 5) : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => value || '-',
    },
    {
      key: 'dayType',
      label: 'Day Type',
      render: (_, record) => getDayTypeLabel(record),
    },
  ];

  const calendarCells = buildCalendarCells();
  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="attendance-hero">
          <div className="attendance-hero-copy">
            <span style={sectionIconBadgeStyle} aria-hidden="true">
              <SectionIcon variant="attendance" />
            </span>
            <span className="attendance-hero-kicker">Attendance overview</span>
            <h1>Attendance Tracker</h1>
            <p>
              Review monthly attendance patterns, spot trends quickly, and manage daily updates from one streamlined workspace.
            </p>
            <div className="attendance-hero-actions">
              <button className="btn-secondary total-hours-btn" type="button" onClick={() => setSummaryModalOpen(true)}>
                See Employees' Total Hours
              </button>
              <button className="btn-primary" type="button" onClick={() => openCreateModal()}>
                + Add Attendance
              </button>
            </div>
          </div>

          <div className="attendance-hero-panel">
            <div className="attendance-hero-stat">
              <span>Records</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="attendance-hero-stat">
              <span>Employees</span>
              <strong>{activeEmployees}</strong>
            </div>
            <div className="attendance-hero-stat">
              <span>Total Hours</span>
              <strong>{summary.totalHours.toFixed(1)}</strong>
            </div>
            <div className="attendance-hero-stat">
              <span>Average Hours</span>
              <strong>{averageHours.toFixed(1)}</strong>
            </div>
          </div>
        </div>

        <div className="attendance-calendar">
          <div className="attendance-calendar-header">
            <div className="attendance-calendar-heading">
              <h2>
                {MONTH_LABELS[selectedMonth - 1]} {selectedYear}
              </h2>
              <div className="attendance-legend">
                {STATUS_OPTIONS.map((status) => (
                  <div key={status.key} className="attendance-legend-item">
                    <span className={`legend-dot legend-${status.tone}`} />
                    <span>{status.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="attendance-today-btn"
              onClick={() => {
                const today = new Date();
                setSelectedMonth(today.getMonth() + 1);
                setSelectedYear(today.getFullYear());
              }}
            >
              Go to Today
            </button>
          </div>

          <div className="attendance-controls">
            <div className="attendance-control">
              <label>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="attendance-control">
              <label>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, index) => selectedYear - 2 + index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="attendance-calendar-grid weekday-row">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="attendance-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="attendance-calendar-grid">
            {calendarCells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`empty-${index}`} className="attendance-day empty" />;
              }

              const dayRecords = recordsByDate[dateKey] || [];
              const tone = getDayTone(dayRecords);
              const isToday = dateKey === getTodayInputValue();
              const isSelected = selectedDay === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={!isToday}
                  className={`attendance-day ${tone ? `has-${tone}` : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (!isToday) {
                      return;
                    }
                    setSelectedDay(dateKey);
                    setDayDetailsDate(dateKey);
                  }}
                >
                  <div className="attendance-day-number">
                    {Number(dateKey.slice(-2))}
                  </div>
                  <div className="attendance-day-count">
                    {dayRecords.length} record{dayRecords.length === 1 ? '' : 's'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

          <div className="attendance-panel attendance-records-panel">
          <div className="attendance-section-header">
            <div>
              <span className="attendance-hero-kicker">Records</span>
              <h2>Attendance Records</h2>
            </div>
            <div className="attendance-section-meta">
              <span>{filteredRecords.length} filtered records</span>
              <span>{summary.totalHours.toFixed(2)} total hours</span>
            </div>
          </div>

          <div
            className={`attendance-record-filters ${employeeNameQuery.trim() ? 'attendance-record-filters--three' : ''}`}
          >
            <div className="attendance-control attendance-record-search">
              <label>Employee Name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ ...sectionIconBadgeStyle, width: '34px', height: '34px', marginBottom: 0 }} aria-hidden="true">
                  <SectionIcon variant="search" />
                </span>
                <input
                  type="text"
                  value={employeeNameQuery}
                  onChange={(e) => setEmployeeNameQuery(e.target.value)}
                  placeholder="Search employee name"
                />
              </div>
            </div>

            <div className="attendance-control attendance-record-search">
              <label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ ...sectionIconBadgeStyle, width: '34px', height: '34px', marginBottom: 0 }} aria-hidden="true">
                  <SectionIcon variant="search" />
                </span>
                <input
                  type="text"
                  value={statusQuery}
                  onChange={(e) => setStatusQuery(e.target.value)}
                  placeholder="Search status"
                />
              </div>
            </div>

            {employeeNameQuery.trim() && (
              <div className="attendance-control attendance-hours-control">
                <label>Total Hours</label>
                <div className="attendance-total-hours-pill">
                  {summary.totalHours.toFixed(2)} hrs
                </div>
              </div>
            )}
          </div>

          <DataTable
            columns={columns}
            data={paginatedRecords}
            onView={handleView}
            onEdit={openEditModal}
            onDelete={isAdmin ? handleDelete : null}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

        <Modal
          isOpen={modalOpen}
          title={editingRecord ? 'Edit Attendance' : 'Add Attendance'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitText={editingRecord ? 'Update' : 'Save'}
          loading={formLoading}
          size="attendance"
          zIndex={1300}
        >
          <div className="attendance-form-grid">
            <div className="attendance-row-70-30">
              <div className="form-group">
                <label>Employee</label>
                <div className="client-search-wrapper">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => handleEmployeeInputChange(e.target.value)}
                    onFocus={() => setEmployeeSuggestionsOpen(true)}
                    onBlur={handleEmployeeInputBlur}
                    placeholder="Search employee name"
                    autoComplete="off"
                  />
                  {employeeSuggestionsOpen && filteredEmployees.length > 0 && (
                    <div className="client-search-results">
                      {filteredEmployees.map((u) => (
                        <button
                          type="button"
                          key={u.id}
                          className="client-search-item"
                          onClick={() => handleEmployeeSelect(u)}
                        >
                          <span>{u.username} ({u.role})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {employeeSuggestionsOpen && filteredEmployees.length === 0 && (
                    <div className="client-search-results empty">
                      <span style={{ ...sectionIconBadgeStyle, width: '32px', height: '32px', marginBottom: '8px' }} aria-hidden="true">
                        <SectionIcon variant="search" />
                      </span>
                      <span>No matching employees found</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.attendanceDate}
                  min={!editingRecord ? getTodayInputValue() : undefined}
                  max={!editingRecord ? getTodayInputValue() : undefined}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                  disabled={!editingRecord}
                />
              </div>
            </div>

            <div className="form-group-2-col">
              <div className="form-group">
                <label>Time In</label>
                <input
                  type="time"
                  value={formData.timeIn}
                  onChange={(e) => setFormData({ ...formData, timeIn: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Time Out</label>
                <input
                  type="time"
                  value={formData.timeOut}
                  onChange={(e) => setFormData({ ...formData, timeOut: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group-2-col">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.key} value={status.key}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Day Type (Auto)</label>
                <div className="attendance-auto-field">
                  {(() => {
                    if (!formData.timeIn || !formData.timeOut) return '-';
                    const hours = calculateHours(formData.timeIn, formData.timeOut);
                    const dayType = calculateDayType(hours);
                    const option = DAY_TYPE_OPTIONS.find((opt) => opt.key === dayType);
                    return option ? option.label : '-';
                  })()}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="4"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes or remarks"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(detailsRecord)}
          title="Attendance Details"
          onClose={closeDetails}
          cancelText="Close"
          size="large"
          zIndex={1200}
        >
          {detailsRecord && (
            <div className="attendance-detail-panel">
              <div className="income-details-summary">
                <div>
                  <span className="income-details-label">Employee</span>
                  <strong>{detailsRecord.username || '-'}</strong>
                </div>
                <div>
                  <span className="income-details-label">Date</span>
                  <strong>{formatDateLabel(detailsRecord.attendanceDate)}</strong>
                </div>
                <div>
                  <span className="income-details-label">Time In</span>
                  <strong>{detailsRecord.timeIn ? String(detailsRecord.timeIn).slice(0, 5) : '-'}</strong>
                </div>
                <div>
                  <span className="income-details-label">Time Out</span>
                  <strong>{detailsRecord.timeOut ? String(detailsRecord.timeOut).slice(0, 5) : '-'}</strong>
                </div>
              </div>

              <div className="attendance-status-badge">
                {(detailsRecord.status || '').toUpperCase()}
              </div>

              <div className="payment-detail">
                <label>Notes</label>
                <p>{detailsRecord.notes || 'No notes provided.'}</p>
              </div>

              <div className="attendance-detail-actions">
                <button type="button" className="btn-primary" onClick={() => openEditModalFromDetails(detailsRecord)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    openCreateModalFromDetails(detailsRecord.attendanceDate);
                  }}
                >
                  Add Another
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={summaryModalOpen}
          title={`Employee Monthly Summary - ${MONTH_LABELS[selectedMonth - 1]} ${selectedYear}`}
          onClose={() => setSummaryModalOpen(false)}
          cancelText="Close"
          size="large"
          zIndex={1400}
        >
          <div className="attendance-summary-table-wrap">
            <table className="attendance-summary-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total Hours</th>
                  <th>Overtime Hours</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Half Day</th>
                  <th>Full Day</th>
                  <th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.length > 0 ? (
                  monthlySummary.map((item, index) => (
                    <tr key={index}>
                      <td>{item.username}</td>
                      <td className="attendance-table-strong attendance-table-accent">{item.totalHours.toFixed(2)} hrs</td>
                      <td className="attendance-table-strong attendance-table-warm">{item.overtimeHours.toFixed(2)} hrs</td>
                      <td>{item.present}</td>
                      <td>{item.late}</td>
                      <td>{item.absent}</td>
                      <td>{item.leave}</td>
                      <td>{item.halfDay}</td>
                      <td>{item.fullDay}</td>
                      <td className="attendance-table-strong attendance-table-warm">{item.overtime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="attendance-table-empty">
                      No attendance records found for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(dayDetailsDate)}
          title={dayDetailsDate ? `Attendance for ${formatDateLabel(dayDetailsDate)}` : 'Attendance Details'}
          onClose={closeDayDetails}
          cancelText="Close"
          size="large"
          zIndex={1100}
        >
          <div className="attendance-detail-panel">
            <div className="attendance-detail-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const dateOverride = dayDetailsDate || getTodayInputValue();
                  openCreateModalFromDetails(dateOverride);
                }}
              >
                + Add Record
              </button>
            </div>

            <div className="income-details-list">
              {(recordsByDate[dayDetailsDate] || []).length > 0 ? (
                (recordsByDate[dayDetailsDate] || []).map((record) => (
                  <div key={record.id} className="income-detail-row">
                    <div>
                      <strong>{record.username || 'Employee'}</strong>
                      <div className="attendance-day-detail-meta">
                        {record.status || '-'} - {record.timeIn ? String(record.timeIn).slice(0, 5) : 'No time in'}
                      </div>
                    </div>
                    <button type="button" className="income-details-btn" onClick={() => handleView(record)}>
                      Details
                    </button>
                  </div>
                ))
              ) : (
                <p className="income-details-empty">No attendance records found for this date.</p>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceView;


