import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import incomeService from '../../services/incomeService';
import orderService from '../../services/orderService';
import customizedOrderService from '../../services/customizedOrderService';
import { hasPermission } from '../../utils/permissions';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const PAYMENT_METHODS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit'];
const REPORT_PERIODS = [
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
  { key: 'ANNUALLY', label: 'Annually' },
];
const SOURCE_GRIDS = [
  { key: 'vsaOnline', label: 'VSA Online Shop', color: '#016667' },
  { key: 'tiktokShop', label: 'Tiktok Shop', color: '#d9b26f' },
  { key: 'shopeeShop', label: 'Shoppee', color: '#f77f00' },
  { key: 'sportsApparelShop', label: 'Verdida Sports Apparel', color: '#2d6a4f' },
];

const SourceIncome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [paymentData, setPaymentData] = useState({});
  const [loading, setLoading] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('WEEKLY');
  const [orderReferenceCache, setOrderReferenceCache] = useState({});
  const [creditOrders, setCreditOrders] = useState([]);
  const [selectedCreditOrder, setSelectedCreditOrder] = useState(null);
  const orderReferenceCacheRef = useRef(orderReferenceCache);

  useEffect(() => {
    orderReferenceCacheRef.current = orderReferenceCache;
  }, [orderReferenceCache]);

  const fetchReferenceNumber = useCallback(async (jobOrderNo) => {
    if (!jobOrderNo || orderReferenceCacheRef.current[jobOrderNo]) return;

    try {
      // Try customized orders first, then inventory orders
      let response = await customizedOrderService.getOrderByJobOrderNo(jobOrderNo);
      if (response.data && response.data.referenceNumber) {
        setOrderReferenceCache((prev) => ({
          ...prev,
          [jobOrderNo]: response.data.referenceNumber,
        }));
        return;
      }

      response = await orderService.getOrderByJobOrderNo(jobOrderNo);
      if (response.data && response.data.referenceNumber) {
        setOrderReferenceCache((prev) => ({
          ...prev,
          [jobOrderNo]: response.data.referenceNumber,
        }));
        return;
      }

      // If still not found
      setOrderReferenceCache((prev) => ({
        ...prev,
        [jobOrderNo]: 'N/A',
      }));
    } catch (error) {
      console.error(`Error fetching reference number for ${jobOrderNo}:`, error);
      setOrderReferenceCache((prev) => ({
        ...prev,
        [jobOrderNo]: 'N/A',
      }));
    }
  }, []);

  const canAccessIncome = hasPermission(user?.permissions, 'SOURCE_OF_INCOME');
  const canAccessPayment = hasPermission(user?.permissions, 'PAYMENT_METHODS');

  const loadPaymentMethods = useCallback(async () => {
    const stored = window.localStorage.getItem('paymentMethods');

    if (stored) {
      try {
        setPaymentData(JSON.parse(stored));
        return;
      } catch (error) {
        console.warn('Invalid saved payment methods data, falling back to defaults:', error);
      }
    }

    const initialized = {};
    PAYMENT_METHODS.forEach((method) => {
      initialized[method] = {
        name: method,
        description: '',
        accountDetails: '',
        isActive: true,
      };
    });

    setPaymentData(initialized);
  }, []);

  const loadIncomeEntries = useCallback(async () => {
    const response = await incomeService.getAllIncomeSources(0, 1000);
    setIncomeEntries(response.data.content || []);
  }, []);

  const loadCreditOrders = useCallback(async () => {
    const [inventoryResponse, customizedResponse] = await Promise.all([
      orderService.getAllOrders(0, 1000),
      customizedOrderService.getAllOrders(0, 1000),
    ]);

    const inventoryOrders = inventoryResponse.data.content || [];
    const customizedOrders = customizedResponse.data.content || [];

    setCreditOrders([
      ...inventoryOrders.map((order) => ({ ...order, sourceType: 'Inventory Order' })),
      ...customizedOrders.map((order) => ({ ...order, sourceType: 'Customized Order' })),
    ]);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([loadPaymentMethods(), loadIncomeEntries(), loadCreditOrders()]);
      } catch (error) {
        console.error('Error loading finance data:', error);
        if (isAuthOrPermissionError(error)) {
          return;
        }
        const errorMsg = getApiErrorMessage(error, 'Failed to load finance data');
        alert(`Failed to load finance data: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadPaymentMethods, loadIncomeEntries, loadCreditOrders]);

  const getIncomeAmount = (entry) => Number.parseFloat(entry.amount) || 0;

  const getPaymentLabel = (entry) =>
    entry.referenceNumber || entry.checkNumber || 'N/A';

  const getIncomeDate = (entry) => {
    const rawDate = entry.incomeDate || entry.createdAt;
    const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
    return Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
  };

  const getClientDisplay = (entry) =>
    `Client Name: ${entry.clientName || entry.clientCode || 'Not available'}`;

  const getPeriodRange = (period) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === 'WEEKLY') {
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    if (period === 'MONTHLY') {
      start.setDate(1);
      return { start, end };
    }

    if (period === 'QUARTERLY') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      return { start, end };
    }

    if (period === 'ANNUALLY') {
      start.setMonth(0, 1);
      return { start, end };
    }

    return { start, end };
  };

  const isWithinRange = (date, range) => date >= range.start && date <= range.end;

  const getIncomeEntriesByShop = useCallback((shopLabel) =>
    shopLabel === 'All Sources'
      ? incomeEntries.slice().sort((a, b) => getIncomeDate(b) - getIncomeDate(a))
      : incomeEntries
          .filter((entry) => (entry.shopType || '').toLowerCase() === shopLabel.toLowerCase())
          .sort((a, b) => getIncomeDate(b) - getIncomeDate(a)), [incomeEntries]);

  const getIncomeEntriesByMethod = useCallback((method) =>
    incomeEntries
      .filter((entry) => (entry.paymentMethod || '').toLowerCase() === method.toLowerCase())
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a)), [incomeEntries]);

  useEffect(() => {
    if (detailsTarget) {
      const entries = detailsTarget.type === 'income'
        ? getIncomeEntriesByShop(detailsTarget.item.label)
        : getIncomeEntriesByMethod(detailsTarget.item);

      entries.forEach((entry) => {
        if (entry.jobOrderNo && !orderReferenceCacheRef.current[entry.jobOrderNo]) {
          fetchReferenceNumber(entry.jobOrderNo);
        }
      });
    }
  }, [detailsTarget, fetchReferenceNumber, getIncomeEntriesByShop, getIncomeEntriesByMethod]);

  const getTotalBySource = (sourceLabel) =>
    getIncomeEntriesByShop(sourceLabel).reduce((total, entry) => total + getIncomeAmount(entry), 0);

  const getTotalIncome = () =>
    SOURCE_GRIDS.reduce((grandTotal, source) => grandTotal + getTotalBySource(source.label), 0);

  const getTotalByMethod = (method) =>
    getIncomeEntriesByMethod(method).reduce((total, entry) => total + getIncomeAmount(entry), 0);

  const getMethodEntryCount = (method) => getIncomeEntriesByMethod(method).length;

  const getOrderFinancials = (order) => {
    const total = (order.items || []).reduce((sum, item) => {
      return sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0));
    }, 0);
    const discountPercent = Number(order.discount) || 0;
    const downPayment = Number(order.downPayment) || 0;
    const afterDiscountTotal = total * (1 - discountPercent / 100);
    const paidAmount = incomeEntries
      .filter((entry) => entry.jobOrderNo === order.jobOrderNo)
      .reduce((sum, entry) => sum + getIncomeAmount(entry), 0);
    const effectivePaidAmount = paidAmount > 0 ? paidAmount : downPayment;
    const remainingBalance = Math.max(0, afterDiscountTotal - effectivePaidAmount);

    return {
      total,
      afterDiscountTotal,
      paidAmount: effectivePaidAmount,
      remainingBalance,
    };
  };

  const creditEntries = creditOrders
    .map((order) => {
      const financials = getOrderFinancials(order);
      return {
        ...order,
        ...financials,
      };
    })
    .filter((order) => order.remainingBalance > 0)
    .sort((a, b) => b.remainingBalance - a.remainingBalance);

  const getTotalCredit = () =>
    creditEntries.reduce((total, order) => total + order.remainingBalance, 0);

  const getCreditPaymentHistory = (order) =>
    incomeEntries
      .filter((entry) => entry.jobOrderNo === order?.jobOrderNo)
      .slice()
      .sort((a, b) => new Date(a.createdAt || a.incomeDate || 0) - new Date(b.createdAt || b.incomeDate || 0));

  const openCreditDetails = (order) => {
    setSelectedCreditOrder(order);
  };

  const handleOpenOrder = (order) => {
    const targetPath = order?.sourceType === 'Customized Order' ? '/customized-orders' : '/orders';
    navigate(targetPath, {
      state: { jobOrderNo: order?.jobOrderNo },
    });
  };

  const closeCreditDetails = () => {
    setSelectedCreditOrder(null);
  };

  const getReportEntries = (period) => {
    const range = getPeriodRange(period);

    return incomeEntries
      .filter((entry) => isWithinRange(getIncomeDate(entry), range))
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a));
  };

  const getReportTotal = (period) =>
    getReportEntries(period).reduce((total, entry) => total + getIncomeAmount(entry), 0);

  const getReportAverage = (period) => {
    const entries = getReportEntries(period);
    if (entries.length === 0) {
      return 0;
    }
    return getReportTotal(period) / entries.length;
  };

  const openDetails = (type, item) => {
    setDetailsTarget({ type, item });
  };

  const closeDetails = () => {
    setDetailsTarget(null);
  };

  const renderDetailsContent = () => {
    if (!detailsTarget) {
      return null;
    }

    if (detailsTarget.type === 'income') {
      const source = detailsTarget.item;
      const entries = getIncomeEntriesByShop(source.label);
      const total = source.label === 'All Sources' ? getTotalIncome() : getTotalBySource(source.label);

      return (
        <div className="income-details-modal">
          <div className="income-details-summary">
            <div>
              <span className="income-details-label">Source</span>
              <strong>{source.label}</strong>
            </div>
            <div>
              <span className="income-details-label">Total</span>
              <strong>PHP {total.toFixed(2)}</strong>
            </div>
            <div>
              <span className="income-details-label">Entries</span>
              <strong>{entries.length}</strong>
            </div>
            <div>
              <span className="income-details-label">Status</span>
              <strong>{source.label === 'All Sources' ? 'All Recorded Income' : 'Recorded Income Only'}</strong>
            </div>
          </div>

          <h3 className="transaction-histories-title">Transaction Histories</h3>
          <div className="income-details-list transaction-histories-grid">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.id} className="income-detail-row">
                  <div className="transaction-history-meta">
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Reference Number:</span>
                    <strong className="transaction-reference-number">
                      {getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                    </strong>
                    </div>
                    <span className="transaction-client-id">
                      {getClientDisplay(entry)}
                    </span>
                    <span className="transaction-client-id">
                      {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                      {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                    </div>
                  </div>
                  <strong>PHP {getIncomeAmount(entry).toFixed(2)}</strong>
                </div>
              ))
            ) : (
              <p className="income-details-empty">No recorded income found for this source.</p>
            )}
          </div>
        </div>
      );
    }

    const method = detailsTarget.item;
    const methodData = paymentData[method] || {};
    const entries = getIncomeEntriesByMethod(method);

    return (
      <div className="income-details-modal">
        <div className="income-details-summary">
          <div>
            <span className="income-details-label">Payment Method</span>
            <strong>{method}</strong>
          </div>
          <div>
            <span className="income-details-label">Status</span>
            <strong>{methodData.isActive ? 'Active' : 'Inactive'}</strong>
          </div>
          <div>
            <span className="income-details-label">Total Income</span>
            <strong>PHP {getTotalByMethod(method).toFixed(2)}</strong>
          </div>
          <div>
            <span className="income-details-label">Entries</span>
            <strong>{entries.length}</strong>
          </div>
        </div>

        <h3 className="transaction-histories-title">Transaction Histories</h3>
        <div className="income-details-list transaction-histories-grid">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.id} className="income-detail-row">
                <div className="transaction-history-meta">
                  <div>
                    <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Reference Number:</span>
                    <strong className="transaction-reference-number">
                      {getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                    </strong>
                  </div>
                  <span className="transaction-client-id">
                    {getClientDisplay(entry)}
                  </span>
                  <span className="transaction-client-id">
                    {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                  </span>
                  <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                    {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                  </div>
                </div>
                <strong>PHP {getIncomeAmount(entry).toFixed(2)}</strong>
              </div>
            ))
          ) : (
            <p className="income-details-empty">No recorded income found for this payment method.</p>
          )}
        </div>
      </div>
    );
  };

  const currentReportEntries = getReportEntries(reportPeriod);
  const currentReportRange = getPeriodRange(reportPeriod);
  const currentReportTotal = getReportTotal(reportPeriod);
  const currentReportAverage = getReportAverage(reportPeriod);

  if (!canAccessIncome && !canAccessPayment) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="access-denied">Access Denied</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <h1>Finance</h1>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="finance-sections-grid">
            {canAccessIncome && (
              <section className="finance-panel">
                <div className="page-header" style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Source of Income</h2>
                </div>

                <div className="income-grids-container">
                  <div className="income-shop-grids">
                    {SOURCE_GRIDS.map((grid) => (
                      <div
                        key={grid.key}
                        className="income-grid-card"
                        style={{ borderLeftColor: grid.color }}
                      >
                        <h3>{grid.label}</h3>
                        <p className="income-grid-value">PHP {getTotalBySource(grid.label).toFixed(2)}</p>
                        <button
                          type="button"
                          className="income-details-btn"
                          onClick={() => openDetails('income', grid)}
                        >
                          Details
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    className="income-grid-card income-total-card"
                    style={{
                      borderLeftColor: '#111827',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f7faf9 100%)',
                    }}
                  >
                    <h3>Total Income</h3>
                    <p className="income-grid-value">PHP {getTotalIncome().toFixed(2)}</p>
                    <button
                      type="button"
                      className="income-details-btn"
                      onClick={() => openDetails('income', { label: 'All Sources' })}
                      style={{ marginTop: '8px' }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </section>
            )}

            {canAccessPayment && (
              <section className="finance-panel">
                <div className="page-header" style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Payment Methods</h2>
                </div>

                <div className="payment-methods-grid">
                  {PAYMENT_METHODS.map((method) => {
                    const data = paymentData[method] || {};
                    return (
                      <div
                        key={method}
                        className={`payment-method-card ${data.isActive ? 'active' : 'inactive'}`}
                      >
                        <div className="payment-method-header">
                          <h3>{method}</h3>
                          <button
                            type="button"
                            className="payment-header-details-btn"
                            onClick={() => openDetails('payment', method)}
                          >
                            Details
                          </button>
                        </div>

                        <div className="payment-method-content">
                          {data.description && (
                            <div className="payment-detail">
                              <label>Description:</label>
                              <p>{data.description}</p>
                            </div>
                          )}
                          {data.accountDetails && (
                            <div className="payment-detail">
                              <label>Account Details:</label>
                              <p>{data.accountDetails}</p>
                            </div>
                          )}

                          <div className="payment-detail">
                            <label>Total Income From Orders:</label>
                            <p>PHP {getTotalByMethod(method).toFixed(2)}</p>
                          </div>

                          <div className="payment-detail">
                            <label>Entries:</label>
                            <p>{getMethodEntryCount(method)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {canAccessIncome && (
              <section className="finance-panel finance-panel-full">
                <div className="page-header" style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Credit Balances</h2>
                </div>

                <div className="income-details-summary" style={{ marginBottom: '16px' }}>
                  <div>
                    <span className="income-details-label">Outstanding Credit</span>
                    <strong>PHP {getTotalCredit().toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Orders With Balance</span>
                    <strong>{creditEntries.length}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Status</span>
                    <strong>Tracked as receivables</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Note</span>
                    <strong>Added to earnings once collected</strong>
                  </div>
                </div>

                <div className="income-details-list transaction-histories-grid" style={{ marginTop: '12px' }}>
                  {creditEntries.length > 0 ? (
                    creditEntries.map((order) => (
                      <div
                        key={`${order.sourceType}-${order.id}`}
                        className="income-detail-row"
                        style={{
                          width: '100%',
                          cursor: 'pointer',
                          textAlign: 'left',
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                        }}
                        onClick={() => openCreditDetails(order)}
                      >
                        <div className="transaction-history-meta">
                          <div>
                            <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Job Order No.:</span>
                            <strong className="transaction-reference-number">
                              {order.jobOrderNo}
                            </strong>
                          </div>
                          <span className="transaction-client-id">
                            {order.sourceType}
                          </span>
                          <span className="transaction-client-id">
                            {order.clientName || 'Walk-in Client'}
                          </span>
                          <span className="transaction-client-id">
                            {order.status || 'Unknown status'}
                          </span>
                          <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                            {order.shop || 'Unknown shop'} - {order.orderDate || 'No date'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                          <strong>
                            PHP {order.remainingBalance.toFixed(2)}
                          </strong>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="income-details-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreditDetails(order);
                              }}
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                              View History
                            </button>
                            <button
                              type="button"
                              className="income-details-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOrder(order);
                              }}
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                              Open Order
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="income-details-empty">No outstanding credit balances found.</p>
                  )}
                </div>
              </section>
            )}

            {canAccessIncome && (
              <section className="finance-panel finance-panel-full">
                <div className="page-header" style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Income Reporting</h2>
                </div>

                <div className="report-filter-bar">
                  {REPORT_PERIODS.map((period) => (
                    <button
                      key={period.key}
                      type="button"
                      className={`report-filter-btn ${reportPeriod === period.key ? 'active' : ''}`}
                      onClick={() => setReportPeriod(period.key)}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>

                <div className="income-details-summary" style={{ marginTop: '18px' }}>
                  <div>
                    <span className="income-details-label">Report Total</span>
                    <strong>PHP {currentReportTotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Entries</span>
                    <strong>{currentReportEntries.length}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Average Entry</span>
                    <strong>PHP {currentReportAverage.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="income-details-label">Range</span>
                    <strong>
                      {currentReportRange.start.toLocaleDateString()} - {currentReportRange.end.toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                <h3 className="transaction-histories-title" style={{ marginTop: '18px' }}>
                  Transaction Histories
                </h3>
                <div className="income-details-list transaction-histories-grid" style={{ marginTop: '12px' }}>
                  {currentReportEntries.length > 0 ? (
                    currentReportEntries.map((entry) => (
                      <div key={entry.id} className="income-detail-row">
                        <div className="transaction-history-meta">
                          <div>
                            <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Reference Number:</span>
                            <strong className="transaction-reference-number">
                              {getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                            </strong>
                          </div>
                          <span className="transaction-client-id">
                            {getClientDisplay(entry)}
                          </span>
                          <span className="transaction-client-id">
                            {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                          </span>
                          <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                            {entry.shopType || 'Unknown source'} - {entry.paymentMethod || 'No payment method'}
                          </div>
                        </div>
                        <strong>PHP {getIncomeAmount(entry).toFixed(2)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="income-details-empty">
                      No recorded income found for the selected {reportPeriod.toLowerCase()} period.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        <Modal
          isOpen={Boolean(detailsTarget)}
          title={
            detailsTarget?.type === 'income'
              ? `${detailsTarget.item?.label || 'Income'} Details`
              : `${detailsTarget?.item || 'Payment Method'} Details`
          }
          onClose={closeDetails}
          cancelText="Close"
          size="xlarge"
        >
          {renderDetailsContent()}
        </Modal>

        <Modal
          isOpen={Boolean(selectedCreditOrder)}
          title={selectedCreditOrder ? `Credit Details - ${selectedCreditOrder.jobOrderNo}` : 'Credit Details'}
          onClose={closeCreditDetails}
          cancelText="Close"
          size="xlarge"
        >
          {selectedCreditOrder && (
            <div className="income-details-modal">
              <div className="income-details-summary">
                <div>
                  <span className="income-details-label">Order Type</span>
                  <strong>{selectedCreditOrder.sourceType}</strong>
                </div>
                <div>
                  <span className="income-details-label">Client</span>
                  <strong>{selectedCreditOrder.clientName || 'Walk-in Client'}</strong>
                </div>
                <div>
                  <span className="income-details-label">Remaining Balance</span>
                  <strong>PHP {selectedCreditOrder.remainingBalance.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="income-details-label">Status</span>
                  <strong>{selectedCreditOrder.status || 'Unknown'}</strong>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h3 className="transaction-histories-title">Payment History</h3>
                <div className="income-details-list transaction-histories-grid" style={{ marginTop: '12px' }}>
                  {getCreditPaymentHistory(selectedCreditOrder).length > 0 ? (
                    getCreditPaymentHistory(selectedCreditOrder).map((entry, index) => (
                      <div key={entry.id} className="income-detail-row">
                        <div className="transaction-history-meta">
                          <div>
                            <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Payment</span>
                            <strong className="transaction-reference-number">
                              {index === 0 ? 'Initial Payment' : 'Payment Update'}
                            </strong>
                          </div>
                          <span className="transaction-client-id">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : entry.incomeDate || 'No date'}
                          </span>
                          <span className="transaction-client-id">
                            Reference: {entry.referenceNumber || 'N/A'}
                          </span>
                          <span className="transaction-client-id">
                            Check No.: {entry.checkNumber || 'N/A'}
                          </span>
                        </div>
                        <strong>PHP {getIncomeAmount(entry).toFixed(2)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="income-details-empty">No payment history recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default SourceIncome;
