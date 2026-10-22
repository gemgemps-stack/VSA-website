import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import Modal from '../../components/Modal';
import SearchField from '../../components/SearchField';
import { useAuth } from '../../context/AuthContext';
import returnedItemService from '../../services/returnedItemService';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { buildPdfBlob, escapePdfText, downloadBlob } from '../../utils/pdf';
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

const escapeHtml = (value) => String(value ?? '-').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const buildReturnedItemsPdf = (group, items) => {
  const pageHeight = 842;
  const commands = [];
  const color = (red, green, blue) => `${red} ${green} ${blue}`;
  const text = (value, x, top, size, font = 'F1', fill = color(0.11, 0.16, 0.15)) => {
    const baseline = pageHeight - top - size;
    commands.push(`BT /${font} ${size} Tf ${fill} rg 1 0 0 1 ${x} ${baseline} Tm (${escapePdfText(value)}) Tj ET`);
  };
  const line = (x, top, width) => {
    commands.push(`${color(0.80, 0.86, 0.83)} RG 0.7 w ${x} ${pageHeight - top} m ${x + width} ${pageHeight - top} l S`);
  };
  const label = (value, x, top) =>
    text(String(value).toUpperCase(), x, top, 7, 'F2', color(0.01, 0.40, 0.40));

  commands.push(`${color(0.01, 0.40, 0.40)} rg 0 ${pageHeight - 4} 595 4 re f`);
  text('VERDIDA SPORTS APPAREL', 48, 36, 8, 'F2', color(0.01, 0.40, 0.40));
  text('Cancelled order returns', 48, 54, 20, 'F2');
  label('Job order', 48, 100);
  text(group.jobOrderNo || 'N/A', 48, 112, 9, 'F2');
  label('Client', 210, 100);
  text(group.clientName || 'N/A', 210, 112, 9, 'F2');
  label('Team', 390, 100);
  text(group.teamName || 'N/A', 390, 112, 9, 'F2');
  label('Order type', 48, 138);
  text(group.orderType === 'CUSTOMIZED' ? 'Customized' : 'Inventory', 48, 150, 9, 'F2');
  label('Order status', 210, 138);
  text(group.orderStatus || 'CANCELLED', 210, 150, 9, 'F2');

  label('Returned item', 48, 184);
  label('Size', 292, 184);
  label('Qty', 354, 184);
  label('Reason', 402, 184);
  line(48, 200, 499);

  const rowStep = Math.min(24, 510 / Math.max(items.length, 1));
  const fontSize = Math.max(5, Math.min(9, rowStep * 0.38));
  let rowTop = 210;
  items.forEach((item) => {
    const itemName = [item.productName || 'Unnamed item', item.jerseyType, item.number]
      .filter(Boolean)
      .join(' / ');
    text(itemName, 48, rowTop, fontSize);
    text(item.size || '-', 292, rowTop, fontSize);
    text(String(item.quantity ?? 0), 354, rowTop, fontSize);
    text(item.reason || '-', 402, rowTop, fontSize);
    rowTop += rowStep;
  });

  line(48, rowTop + 6, 499);
  text(`${items.length} returned item${items.length === 1 ? '' : 's'}`, 48, rowTop + 16, 9, 'F2');
  text(
    `Total quantity: ${items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}`,
    350,
    rowTop + 16,
    9,
    'F2',
  );

  return buildPdfBlob(commands);
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
  const [detailsGroup, setDetailsGroup] = useState(null);
  const [detailsItems, setDetailsItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsActionError, setDetailsActionError] = useState('');

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

  useEffect(() => {
    if (!detailsGroup) return undefined;

    let active = true;
    const loadDetails = async () => {
      setDetailsItems([]);
      setDetailsError('');
      setDetailsLoading(true);
      try {
        const representative = detailsGroup.representative;
        const response = detailsGroup.orderType === 'CUSTOMIZED'
          ? await returnedItemService.getReturnedItemsByCustomizedOrderId(representative.customizedOrderId)
          : await returnedItemService.getReturnedItemsByOrderId(representative.orderId);
        if (active) {
          setDetailsItems(response.data || []);
        }
      } catch (loadError) {
        console.error('Error loading returned order details:', loadError);
        if (active) {
          setDetailsError(getApiErrorMessage(loadError, 'Unable to load all returned items.'));
        }
      } finally {
        if (active) {
          setDetailsLoading(false);
        }
      }
    };

    loadDetails();
    return () => {
      active = false;
    };
  }, [detailsGroup]);

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

  const closeDetails = () => {
    setDetailsGroup(null);
    setDetailsItems([]);
    setDetailsError('');
    setDetailsActionError('');
  };

  const printCancelledOrder = () => {
    if (!detailsGroup || detailsError || detailsLoading) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setDetailsActionError('The print window could not be opened. Allow pop-ups and try again.');
      return;
    }
    const itemRows = detailsItems.map((item) => [
      `<td>${escapeHtml(item.productName)}</td>`,
      `<td>${escapeHtml(item.jerseyType)}</td>`,
      `<td>${escapeHtml(item.size)}</td>`,
      `<td>${escapeHtml(item.number)}</td>`,
      `<td>${escapeHtml(item.quantity ?? 0)}</td>`,
      `<td>${escapeHtml(item.reason)}</td>`,
      `<td>${escapeHtml(formatDate(item.returnDate || item.createdAt))}</td>`,
    ].join('')).map((cells) => `<tr>${cells}</tr>`).join('');

    printWindow.document.write([
      '<!doctype html><html><head><title>Cancelled Order ',
      escapeHtml(detailsGroup.jobOrderNo),
      '</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#24312d}',
      'h1{font-size:22px}dl{display:grid;grid-template-columns:140px 1fr;gap:8px}',
      'dt{font-weight:bold}dd{margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}',
      'th,td{border:1px solid #cbd5d1;padding:8px;text-align:left}th{background:#eef4f1}',
      '</style></head><body><h1>Cancelled Order Returns</h1><dl>',
      '<dt>Job order</dt><dd>', escapeHtml(detailsGroup.jobOrderNo),
      '</dd><dt>Client</dt><dd>', escapeHtml(detailsGroup.clientName),
      '</dd><dt>Team</dt><dd>', escapeHtml(detailsGroup.teamName),
      '</dd><dt>Order type</dt><dd>', escapeHtml(detailsGroup.orderType === 'CUSTOMIZED' ? 'Customized' : 'Inventory'),
      '</dd><dt>Order status</dt><dd>', escapeHtml(detailsGroup.orderStatus || 'CANCELLED'),
      '</dd></dl><table><thead><tr><th>Returned item</th><th>Version</th><th>Size</th>',
      '<th>Number</th><th>Quantity</th><th>Reason</th><th>Return date</th></tr></thead>',
      '<tbody>', itemRows, '</tbody></table></body></html>',
    ].join(''));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadReturnedItemsPdf = () => {
    if (!detailsGroup || detailsError || detailsLoading) return;
    const blob = buildReturnedItemsPdf(detailsGroup, detailsItems);
    const orderNumber = String(detailsGroup.jobOrderNo || 'order').replace(/[\\/:*?"<>|]/g, '-');
    downloadBlob(blob, `returned-items-${orderNumber}.pdf`);
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
                              onClick={() => {
                                setDetailsActionError('');
                                setDetailsGroup(group);
                              }}
                              title="View returned item details"
                            >
                              Details
                            </button>
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
      <Modal
        isOpen={Boolean(detailsGroup)}
        title={detailsGroup ? `Returned Items: ${detailsGroup.jobOrderNo || 'Order'}` : 'Returned Items'}
        onClose={closeDetails}
        size="large"
      >
        {detailsGroup && (
          <div className="returned-order-details">
            <div className="returned-order-details-summary">
              <div><span>Client</span><strong>{detailsGroup.clientName || '-'}</strong></div>
              <div><span>Team</span><strong>{detailsGroup.teamName || '-'}</strong></div>
              <div><span>Order type</span><strong>{detailsGroup.orderType === 'CUSTOMIZED' ? 'Customized' : 'Inventory'}</strong></div>
              <div><span>Order status</span><strong>{STATUS_LABELS[detailsGroup.orderStatus] || detailsGroup.orderStatus || '-'}</strong></div>
            </div>

            {detailsError && <p className="returned-order-details-error" role="alert">{detailsError}</p>}
            {detailsActionError && <p className="returned-order-details-error" role="alert">{detailsActionError}</p>}
            {detailsLoading ? (
              <div className="empty-state">
                <h3>Loading returned items...</h3>
              </div>
            ) : !detailsError && (
              <>
                <div className="returned-order-details-actions">
                  <button type="button" className="btn-view" onClick={printCancelledOrder}>
                    Print Cancelled Order
                  </button>
                  <button type="button" className="btn-primary" onClick={downloadReturnedItemsPdf}>
                    Download PDF
                  </button>
                </div>
                {detailsItems.length === 0 ? (
                  <p>No returned items are available for this order.</p>
                ) : (
                  <div className="datatable-container">
                    <table className="datatable">
                      <thead>
                        <tr>
                          <th>Returned Item</th>
                          <th>Version</th>
                          <th>Size</th>
                          <th>Number</th>
                          <th>Quantity</th>
                          <th>Reason</th>
                          <th>Return Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName || '-'}</td>
                            <td>{item.jerseyType || '-'}</td>
                            <td>{item.size || '-'}</td>
                            <td>{item.number || '-'}</td>
                            <td>{item.quantity ?? 0}</td>
                            <td>{item.reason || '-'}</td>
                            <td>{formatDate(item.returnDate || item.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default Returns;
