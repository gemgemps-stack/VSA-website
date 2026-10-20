import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import { useAuth } from '../../context/AuthContext';
import orderService from '../../services/orderService';
import customizedOrderService from '../../services/customizedOrderService';
import { getApiErrorMessage } from '../../utils/apiErrors';
import '../../styles/DataTable.css';
import '../../styles/OrdersOverview.css';

const FETCH_PAGE_SIZE = 100;
const MAX_PAGES = 100;
const ROWS_PER_PAGE = 10;

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

const STATUS_COLORS = {
  FOR_CLIENT_APPROVAL: '#2196F3',
  NOT_APPROVED: '#F44336',
  DOWN_PAYMENT_PENDING: '#FF9800',
  IN_PRODUCTION: '#9C27B0',
  NOT_YET_FULLY_PAID: '#FF5722',
  FULLY_PAID: '#4CAF50',
  CANCELLED: '#757575',
  MANUFACTURED: '#0f6d6b',
};

const OVERVIEW_VIEWS = {
  open: {
    title: 'Open orders',
    eyebrow: 'Dashboard drill-down',
    description:
      'Inventory and customized orders that are still moving through the pipeline, in one combined list.',
    moduleFilter: 'ALL',
    matches: (status) => status !== 'FULLY_PAID' && status !== 'CANCELLED',
  },
  awaiting: {
    title: 'Awaiting approval',
    eyebrow: 'Dashboard drill-down',
    description:
      'Orders waiting on client confirmation or sign-off before they can move into production.',
    moduleFilter: 'FOR_CLIENT_APPROVAL',
    matches: (status) => status === 'FOR_CLIENT_APPROVAL',
  },
  completed: {
    title: 'Completed orders',
    eyebrow: 'Dashboard drill-down',
    description: 'Fully paid orders that are already closed out across both order modules.',
    moduleFilter: 'FULLY_PAID',
    matches: (status) => status === 'FULLY_PAID',
  },
};

const normalizeStatus = (value) => String(value || '').toUpperCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const fetchAllPages = async (fetchPage) => {
  const first = await fetchPage(0);
  const firstContent = first.data?.content || [];
  const total = Number(first.data?.totalElements ?? firstContent.length);
  const records = [...firstContent];
  let page = 1;

  while (records.length < total && page < MAX_PAGES) {
    const next = await fetchPage(page);
    const chunk = next.data?.content || [];
    if (chunk.length === 0) break;
    records.push(...chunk);
    page += 1;
  }

  return records;
};

const OrdersOverview = () => {
  const { view } = useParams();
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const config = OVERVIEW_VIEWS[view];
  const canSeeInventory = canAccess('INVENTORY_ORDERS');
  const canSeeCustomized = canAccess('CUSTOMIZED_ORDERS');
  const hasAnyAccess = canSeeInventory || canSeeCustomized;

  const loadRecords = useCallback(async () => {
    if (!config) return;

    setLoading(true);
    setError('');

    try {
      const loaded = [];

      if (canSeeInventory) {
        const inventoryOrders = await fetchAllPages((page) =>
          orderService.getAllOrders(page, FETCH_PAGE_SIZE)
        );
        inventoryOrders.forEach((order) => {
          loaded.push({ ...order, source: 'Inventory Orders', sourcePath: '/orders' });
        });
      }

      if (canSeeCustomized) {
        const customizedOrders = await fetchAllPages((page) =>
          customizedOrderService.getAllOrders(page, FETCH_PAGE_SIZE)
        );
        customizedOrders.forEach((order) => {
          loaded.push({ ...order, source: 'Customized Orders', sourcePath: '/customized-orders' });
        });
      }

      setRecords(loaded);
    } catch (loadError) {
      console.error('Error loading orders overview:', loadError);
      setError(getApiErrorMessage(loadError, 'Unable to load the combined order list.'));
    } finally {
      setLoading(false);
    }
  }, [config, canSeeInventory, canSeeCustomized]);

  useEffect(() => {
    setCurrentPage(1);
    loadRecords();
  }, [loadRecords, reloadKey]);

  const filteredRecords = useMemo(() => {
    if (!config) return [];
    return records
      .filter((record) => config.matches(normalizeStatus(record.status)))
      .sort(
        (a, b) =>
          new Date(b.orderDate || b.createdAt || 0) - new Date(a.orderDate || a.createdAt || 0)
      );
  }, [records, config]);

  const inventoryCount = filteredRecords.filter(
    (record) => record.source === 'Inventory Orders'
  ).length;
  const customizedCount = filteredRecords.length - inventoryCount;

  if (!config) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasAnyAccess) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="access-denied" role="alert">
            <span className="access-denied-kicker">Access restricted</span>
            <strong>You do not have permission to view order records.</strong>
            <p>Ask an administrator to enable access for INVENTORY_ORDERS or CUSTOMIZED_ORDERS.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const pageRows = filteredRecords.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const openRecord = (record) => {
    navigate(record.sourcePath, {
      state: {
        jobOrderNo: record.jobOrderNo,
        openDetails: true,
        statusFilter: normalizeStatus(record.status),
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-block">
            <span style={sectionIconBadgeStyle} aria-hidden="true">
              <SectionIcon variant="orders" />
            </span>
            <span className="page-eyebrow">{config.eyebrow}</span>
            <h1>{config.title}</h1>
            <p className="page-subtitle">{config.description}</p>
          </div>
          <div className="page-actions">
            {canSeeInventory && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate('/orders', { state: { statusFilter: config.moduleFilter } })
                }
              >
                Open Inventory Orders
              </button>
            )}
            {canSeeCustomized && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate('/customized-orders', { state: { statusFilter: config.moduleFilter } })
                }
              >
                Open Customized Orders
              </button>
            )}
          </div>
        </div>

        <div className="content-surface">
          <div className="content-surface-header">
            <div>
              <h2>{config.title} records</h2>
              <p>
                Combined from every order module you have access to, so the count below matches the
                dashboard metric.
              </p>
            </div>
            <div className="stats-strip">
              <div className="stat-pill">
                <strong>{loading ? '-' : filteredRecords.length}</strong>
                <span>Matching records</span>
                <small>{config.title}</small>
              </div>
              <div className="stat-pill">
                <strong>{loading ? '-' : inventoryCount}</strong>
                <span>Inventory orders</span>
                <small>{canSeeInventory ? 'Ready stock sales' : 'Restricted'}</small>
              </div>
              <div className="stat-pill">
                <strong>{loading ? '-' : customizedCount}</strong>
                <span>Customized orders</span>
                <small>{canSeeCustomized ? 'Made to order work' : 'Restricted'}</small>
              </div>
            </div>
          </div>

          {error ? (
            <div className="empty-state">
              <h3>Orders could not be loaded</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <h3>Loading {config.title.toLowerCase()} orders...</h3>
              <p>Combining records from the order modules you can access.</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <h3>No records in this view</h3>
              <p>There are no orders matching &ldquo;{config.title}&rdquo; right now.</p>
            </div>
          ) : (
            <>
              <div className="datatable-container">
                <table className="datatable">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Job Order No</th>
                      <th>Client Name</th>
                      <th>Team Name</th>
                      <th>Status</th>
                      <th>Order Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((record) => {
                      const status = normalizeStatus(record.status);
                      return (
                        <tr key={`${record.source}-${record.id || record.jobOrderNo}`}>
                          <td>{record.source}</td>
                          <td>{record.jobOrderNo || '-'}</td>
                          <td>{record.clientName || '-'}</td>
                          <td>{record.teamName || '-'}</td>
                          <td>
                            <span
                              className="orders-overview-status"
                              style={{ color: STATUS_COLORS[status] || '#757575' }}
                            >
                              {STATUS_LABELS[status] || record.status || 'Unknown'}
                            </span>
                          </td>
                          <td>{formatDate(record.orderDate || record.createdAt)}</td>
                          <td className="actions">
                            <button
                              type="button"
                              className="btn-view"
                              onClick={() => openRecord(record)}
                              title="Open this order"
                            >
                              Open
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

export default OrdersOverview;
