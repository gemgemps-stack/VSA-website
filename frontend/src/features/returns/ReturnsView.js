import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import SearchField from '../../components/SearchField';
import { useAuth } from '../../context/AuthContext';
import returnedItemService from '../../services/returnedItemService';
import { getApiErrorMessage } from '../../utils/apiErrors';
import '../../styles/DataTable.css';
import '../../styles/Returns.css';

const PAGE_SIZE = 10;

const STATUS_LABELS = {
  FOR_CLIENT_APPROVAL: 'For Client Approval',
  NOT_APPROVED: 'Not Approved',
  DOWN_PAYMENT_PENDING: 'Down Payment Pending',
  IN_PRODUCTION: 'To Be Packaged',
  NOT_YET_FULLY_PAID: 'Not Yet Fully Paid',
  FULLY_PAID: 'Fully Paid',
  CANCELLED: 'Cancelled',
  MANUFACTURED: 'Manufactured',
};

const ORDER_TYPE_OPTIONS = [
  { value: '', label: 'All order types' },
  { value: 'RETAIL', label: 'Inventory orders' },
  { value: 'CUSTOMIZED', label: 'Customized orders' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const createInitialFilters = () => ({
  orderType: '',
  clientName: '',
  status: '',
  dateFrom: '',
  dateTo: '',
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const buildOrderKey = (record) => {
  const orderId = record.orderId || record.customizedOrderId || record.jobOrderNo || record.id;
  return `${record.orderType || 'UNKNOWN'}:${orderId}`;
};

const groupRecordsByOrder = (records) => {
  const groups = new Map();
  records.forEach((record) => {
    const key = buildOrderKey(record);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        orderType: record.orderType,
        jobOrderNo: record.jobOrderNo,
        clientName: record.clientName,
        teamName: record.teamName,
        orderStatus: record.orderStatus,
        returnDate: record.returnDate || record.createdAt,
        representative: record,
        items: [],
      });
    }
    const group = groups.get(key);
    group.items.push(record);
    const recordDate = record.returnDate || record.createdAt;
    if (recordDate && (!group.returnDate || new Date(recordDate) > new Date(group.returnDate))) {
      group.returnDate = recordDate;
    }
  });
  return Array.from(groups.values());
};

const Returns = () => {
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(createInitialFilters());
  const [appliedFilters, setAppliedFilters] = useState(createInitialFilters());

  const canSeeInventoryOrders = canAccess('INVENTORY_ORDERS');
  const canSeeCustomizedOrders = canAccess('CUSTOMIZED_ORDERS');

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await returnedItemService.getAllReturnedItems(currentPage - 1, PAGE_SIZE, {
        orderType: appliedFilters.orderType || undefined,
        clientName: appliedFilters.clientName.trim() || undefined,
        status: appliedFilters.status || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        sort: 'returnDate,desc,createdAt,desc',
      });
      setRecords(response.data.content || []);
      setTotalElements(response.data.totalElements || 0);
      setTotalPages(Math.max(1, response.data.totalPages || 1));
    } catch (loadError) {
      console.error('Error loading returned items:', loadError);
      setError(getApiErrorMessage(loadError, 'Unable to load returned orders.'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedFilters]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAppliedFilters(filters);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const unitsOnPage = records.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);

  const orderGroups = React.useMemo(() => groupRecordsByOrder(records), [records]);

  const openOrder = (record) => {
    const isCustomized = record.orderType === 'CUSTOMIZED';
    if (isCustomized && !canSeeCustomizedOrders) return;
    if (!isCustomized && !canSeeInventoryOrders) return;

    navigate(isCustomized ? '/customized-orders' : '/orders', {
      state: {
        jobOrderNo: record.jobOrderNo,
        openDetails: true,
        statusFilter: record.orderStatus || undefined,
      },
    });
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-block">
            <span style={sectionIconBadgeStyle} aria-hidden="true">
              <SectionIcon variant="orders" />
            </span>
            <span className="page-eyebrow">Stock recovery</span>
            <h1>Returned Orders</h1>
            <p className="page-subtitle">
              Every recorded return across inventory and customized orders, with the order it came
              from and the stock it restored.
            </p>
          </div>
          <div className="page-actions">
            {canSeeInventoryOrders && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/orders', { state: { statusFilter: 'CANCELLED' } })}
              >
                Open Inventory Orders
              </button>
            )}
            {canSeeCustomizedOrders && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/customized-orders', { state: { statusFilter: 'CANCELLED' } })}
              >
                Open Customized Orders
              </button>
            )}
          </div>
        </div>

        <div className="content-surface">
          <div className="content-surface-header">
            <div>
              <h2>Return records</h2>
              <p>
                Filter by order type, client, order status, or the date the return was recorded.
              </p>
            </div>
            <div className="stats-strip">
              <div className="stat-pill">
                <strong>{loading ? '-' : totalElements}</strong>
                <span>Matching returns</span>
                <small>For the current filters</small>
              </div>
              <div className="stat-pill">
                <strong>{loading ? '-' : unitsOnPage}</strong>
                <span>Units on this page</span>
                <small>Page {currentPage} of {totalPages}</small>
              </div>
            </div>
          </div>

          <div className="search-and-filter-row">
            <div className="returns-filter-bar" aria-label="Returned orders filters">
              <select
                className="returns-filter-select"
                value={filters.orderType}
                onChange={(e) => updateFilter('orderType', e.target.value)}
                aria-label="Filter by order type"
              >
                {ORDER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <SearchField
                type="text"
                value={filters.clientName}
                onChange={(e) => updateFilter('clientName', e.target.value)}
                placeholder="      Search client"
              />
              <select
                className="returns-filter-select"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                aria-label="Filter by order status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <SearchField
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                aria-label="    Return recorded from"
              />
            </div>
          </div>

          {error ? (
            <div className="empty-state">
              <h3>Returned orders could not be loaded</h3>
              <p>{error}</p>
              <button type="button" className="btn-primary" onClick={loadReturns}>
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <h3>Loading returned orders...</h3>
              <p>Fetching the recorded returns for your account.</p>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <span style={{ ...sectionIconBadgeStyle, marginBottom: '12px' }} aria-hidden="true">
                <SectionIcon variant="orders" />
              </span>
              <h3>No returned orders match your filters</h3>
              <p>Returns are recorded from the order details card of a cancelled order.</p>
            </div>
          ) : (
            <>
              <div className="datatable-container">
                <table className="datatable returns-datatable">
                  <thead>
                    <tr>
                      <th>Job Order No</th>
                      <th>Order Type</th>
                      <th>Client Name</th>
                      <th>Team Name</th>
                      <th>Returned Items</th>
                      <th>Total Qty</th>
                      <th>Order Status</th>
                      <th>Return Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderGroups.map((group) => {
                      const totalQuantity = group.items.reduce(
                        (sum, item) => sum + (Number(item.quantity) || 0),
                        0,
                      );
                      return (
                        <tr key={group.key}>
                          <td>{group.jobOrderNo || '-'}</td>
                          <td>{group.orderType === 'CUSTOMIZED' ? 'Customized' : 'Inventory'}</td>
                          <td>{group.clientName || '-'}</td>
                          <td>{group.teamName || '-'}</td>
                          <td>{group.items.length} item{group.items.length === 1 ? '' : 's'}</td>
                          <td>{totalQuantity || '-'}</td>
                          <td>{STATUS_LABELS[group.orderStatus] || group.orderStatus || '-'}</td>
                          <td>{formatDate(group.returnDate)}</td>
                          <td className="actions">
                            <button
                              type="button"
                              className="btn-view"
                              onClick={() => openOrder(group.representative)}
                              title="Open the order these returns belong to"
                            >
                              Open order
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Returns;
