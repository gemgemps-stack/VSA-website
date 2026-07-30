import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import '../../styles/Dashboard.css';

const dashboardIconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.9',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatShortCurrency = (value) => {
  const amount = Number(value) || 0;
  const isNegative = amount < 0;
  const absolute = Math.abs(amount);
  const sign = isNegative ? '-' : '';
  const prefix = `${sign}₱`;

  const compactNumber = (number) => {
    const rounded = Math.round(number * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '');
  };

  if (absolute >= 1000000) {
    return `${prefix}${compactNumber(absolute / 1000000)}M`;
  }

  if (absolute >= 1000) {
    return `${prefix}${compactNumber(absolute / 1000)}K`;
  }

  if (absolute >= 100) {
    return `${prefix}${compactNumber(absolute / 100)}H`;
  }

  return `${prefix}${absolute.toFixed(0)}`;
};

const formatCount = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const StatIcon = ({ name }) => {
  switch (name) {
    case 'inventory-orders':
      return (
        <svg viewBox="0 0 256 256" aria-hidden="true" {...dashboardIconProps}>
          <path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" />
        </svg>
      );
    case 'customized-orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M14 11H8M10 15H8M16 7H8M20 6.8V17.2C20 18.8802 20 19.7202 19.673 20.362C19.3854 20.9265 18.9265 21.3854 18.362 21.673C17.7202 22 16.8802 22 15.2 22H8.8C7.11984 22 6.27976 22 5.63803 21.673C5.07354 21.3854 4.6146 20.9265 4.32698 20.362C4 19.7202 4 18.8802 4 17.2V6.8C4 5.11984 4 4.27976 4.32698 3.63803C4.6146 3.07354 5.07354 2.6146 5.63803 2.32698C6.27976 2 7.11984 2 8.8 2H15.2C16.8802 2 17.7202 2 18.362 2.32698C18.9265 2.6146 19.3854 3.07354 19.673 3.63803C20 4.27976 20 5.11984 20 6.8Z" />
          <circle cx="18" cy="18" r="7" />
          <g transform="translate(12.2,12.2) scale(0.62)">
            <path d="M18 10L14 6M2.49997 21.5L5.88434 21.124C6.29783 21.078 6.50457 21.055 6.69782 20.9925C6.86926 20.937 7.03242 20.8586 7.18286 20.7594C7.35242 20.6475 7.49951 20.5005 7.7937 20.2063L21 7C22.1046 5.89543 22.1046 4.10457 21 3C19.8954 1.89543 18.1046 1.89543 17 3L3.7937 16.2063C3.49952 16.5005 3.35242 16.6475 3.24061 16.8171C3.1414 16.9676 3.06298 17.1307 3.00748 17.3022C2.94493 17.4954 2.92195 17.7021 2.87601 18.1156L2.49997 21.5Z" />
          </g>
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M20.5 7.27783L12 12.0001M12 12.0001L3.49997 7.27783M12 12.0001L12 21.5001M14 20.889L12.777 21.5684C12.4934 21.726 12.3516 21.8047 12.2015 21.8356C12.0685 21.863 11.9315 21.863 11.7986 21.8356C11.6484 21.8047 11.5066 21.726 11.223 21.5684L3.82297 17.4573C3.52346 17.2909 3.37368 17.2077 3.26463 17.0893C3.16816 16.9847 3.09515 16.8606 3.05048 16.7254C3 16.5726 3 16.4013 3 16.0586V7.94153C3 7.59889 3 7.42757 3.05048 7.27477C3.09515 7.13959 3.16816 7.01551 3.26463 6.91082C3.37368 6.79248 3.52345 6.70928 3.82297 6.54288L11.223 2.43177C11.5066 2.27421 11.6484 2.19543 11.7986 2.16454C11.9315 2.13721 12.0685 2.13721 12.2015 2.16454C12.3516 2.19543 12.4934 2.27421 12.777 2.43177L20.177 6.54288C20.4766 6.70928 20.6263 6.79248 20.7354 6.91082C20.8318 7.01551 20.9049 7.13959 20.9495 7.27477C21 7.42757 21 7.59889 21 7.94153L21 12.5001M7.5 4.50008L16.5 9.50008M19 21.0001V15.0001M16 18.0001H22" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M5.5 7.5h9.75a2.75 2.75 0 0 1 2.75 2.75v6.5a2.75 2.75 0 0 1-2.75 2.75H6.75A2.75 2.75 0 0 1 4 16.75V9a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M14.5 11.25h3.5A1.75 1.75 0 0 1 19.75 13v2.25A1.75 1.75 0 0 1 18 17h-3.5" />
          <path d="M15 14h1.1" />
          <path d="M7.25 9.75V8.5a1 1 0 0 1 1-1H16" />
          <path d="M8 12.25h2.5" />
        </svg>
      );
    case 'employees':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M8 4.5h8A2.5 2.5 0 0 1 18.5 7v10A2.5 2.5 0 0 1 16 19.5H8A2.5 2.5 0 0 1 5.5 17V7A2.5 2.5 0 0 1 8 4.5Z" />
          <path d="M8 8h8" />
          <path d="M8 11.5h4.5" />
          <path d="M8 15h2.5" />
          <circle cx="15.75" cy="14.75" r="1.25" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...dashboardIconProps}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M7 15.5l3.5-3.5 2.5 2.5L17.5 9" />
          <path d="M17.5 9H14" />
          <path d="M17.5 9v3.5" />
        </svg>
      );
    default:
      return null;
  }
};

const DEFAULT_STATS = {
  totalInventoryOrders: 0,
  totalCustomizedOrders: 0,
  totalClients: 0,
  totalInventoryItems: 0,
  totalOrders: 0,
  openOrders: 0,
  awaitingApprovalOrders: 0,
  completedOrders: 0,
  lowStockItems: 0,
  attendanceThisMonth: 0,
  monthlySalesIncome: 0,
  monthlyLiquidation: 0,
  monthlyNetIncome: 0,
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setLoading(true);
      try {
        const response = await dashboardService.getStats();
        if (!cancelled) {
          setStats({
            ...DEFAULT_STATS,
            ...(response.data || {}),
          });
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalOperationalOrders = stats.totalOrders || (stats.totalInventoryOrders + stats.totalCustomizedOrders);
  const completionRate = totalOperationalOrders > 0
    ? Math.round((stats.completedOrders / totalOperationalOrders) * 100)
    : 0;
  const pipelineLoad = totalOperationalOrders > 0
    ? Math.round((stats.openOrders / totalOperationalOrders) * 100)
    : 0;

  const moduleCards = useMemo(() => [
    {
      label: 'Inventory Orders',
      icon: 'inventory-orders',
      metric: stats.totalInventoryOrders,
      metricLabel: 'Records',
      description: 'Tracked sales orders for ready inventory fulfillment.',
      path: '/orders',
      permission: 'INVENTORY_ORDERS',
      tone: 'teal',
    },
    {
      label: 'Customized Orders',
      icon: 'customized-orders',
      metric: stats.totalCustomizedOrders,
      metricLabel: 'Projects',
      description: 'Manufacturing jobs that move through approval and production.',
      path: '/customized-orders',
      permission: 'CUSTOMIZED_ORDERS',
      tone: 'blue',
    },
    {
      label: 'Clients',
      icon: 'clients',
      metric: stats.totalClients,
      metricLabel: 'Profiles',
      description: 'Customer records, team references, and account history.',
      path: '/clients',
      permission: 'CLIENTS',
      tone: 'cyan',
    },
    {
      label: 'Inventory',
      icon: 'inventory',
      metric: stats.totalInventoryItems,
      metricLabel: 'Items',
      description: 'Product stock, item types, sizes, and on-hand quantities.',
      path: '/inventory',
      permission: 'INVENTORY',
      tone: 'green',
    },
    {
      label: 'Attendance',
      icon: 'attendance',
      metric: stats.attendanceThisMonth,
      metricLabel: 'This month',
      description: 'Daily employee attendance and monthly work patterns.',
      path: '/attendance',
      permission: 'ATTENDANCE',
      tone: 'amber',
    },
    {
      label: 'Finance',
      icon: 'finance',
      metric: stats.monthlyNetIncome,
      metricLabel: 'Net this month',
      metricFormat: 'shortCurrency',
      description: 'Sales income, liquidation, and performance reporting.',
      path: '/income',
      permission: 'SOURCE_OF_INCOME',
      tone: 'slate',
    },
    {
      label: 'Employees',
      icon: 'employees',
      metric: null,
      metricLabel: 'Team management',
      description: 'Staff records, account access, and role-based oversight.',
      path: '/employees',
      permission: 'EMPLOYEES',
      tone: 'violet',
    },
  ], [stats]);

  const performanceItems = [
    {
      label: 'Open orders',
      value: stats.openOrders,
      hint: 'Work currently moving through the pipeline',
    },
    {
      label: 'Awaiting approval',
      value: stats.awaitingApprovalOrders,
      hint: 'Orders waiting on confirmation or sign-off',
    },
    {
      label: 'Completed orders',
      value: stats.completedOrders,
      hint: 'Fully paid work that is already closed out',
    },
    {
      label: 'Low stock items',
      value: stats.lowStockItems,
      hint: 'Items below the default stock threshold',
    },
    {
      label: 'Attendance logs',
      value: stats.attendanceThisMonth,
      hint: 'Employee attendance entries this month',
    },
  ];

  const healthMeters = [
    {
      label: 'Completion rate',
      value: completionRate,
      tone: 'teal',
    },
    {
      label: 'Pipeline load',
      value: pipelineLoad,
      tone: 'blue',
    },
  ];

  return (
    <DashboardLayout>
      <div className="dashboard" aria-busy={loading}>
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="page-eyebrow">Operations command center</span>
            <h1>Dashboard</h1>
            <p className="welcome">
              Welcome back, {user?.username || 'there'}. This view highlights the business areas that matter most:
              inventory orders, customized orders, clients, stock control, attendance, finance, and team management.
            </p>
          </div>

          <div className="dashboard-hero-panel">
            <div className="hero-metrics">
              <div className="hero-metric">
                <span>Open pipeline</span>
                <strong>{loading ? '-' : formatCount(stats.openOrders)}</strong>
                <p>Active orders across inventory and custom work.</p>
              </div>
              <div className="hero-metric">
                <span>Approval queue</span>
                <strong>{loading ? '-' : formatCount(stats.awaitingApprovalOrders)}</strong>
                <p>Items waiting on a go-ahead before production.</p>
              </div>
              <div className="hero-metric">
                <span>Low stock</span>
                <strong>{loading ? '-' : formatCount(stats.lowStockItems)}</strong>
                <p>Inventory items that should be reviewed soon.</p>
              </div>
            </div>

            <button
              type="button"
              className="hero-action"
              onClick={() => navigate('/income', { state: { openPerformanceReport: true } })}
            >
              Open finance report
            </button>
          </div>
        </section>

        <section className="dashboard-card-grid">
          <PermissionGuard permission="INVENTORY_ORDERS">
            <button type="button" className="dashboard-summary-card" onClick={() => navigate('/orders')}>
              <span className="summary-icon summary-icon--teal" aria-hidden="true">
                <StatIcon name="inventory-orders" />
              </span>
              <span className="summary-copy">
                <span className="summary-label">Inventory Orders</span>
                <strong className="summary-value">{loading ? '-' : formatCompact(stats.totalInventoryOrders)}</strong>
                <span className="summary-note">Fulfillment and sales order records</span>
              </span>
            </button>
          </PermissionGuard>

          <PermissionGuard permission="CUSTOMIZED_ORDERS">
            <button type="button" className="dashboard-summary-card" onClick={() => navigate('/customized-orders')}>
              <span className="summary-icon summary-icon--blue" aria-hidden="true">
                <StatIcon name="customized-orders" />
              </span>
              <span className="summary-copy">
                <span className="summary-label">Customized Orders</span>
                <strong className="summary-value">{loading ? '-' : formatCompact(stats.totalCustomizedOrders)}</strong>
                <span className="summary-note">Production and tailored workstreams</span>
              </span>
            </button>
          </PermissionGuard>

          <PermissionGuard permission="CLIENTS">
            <button type="button" className="dashboard-summary-card" onClick={() => navigate('/clients')}>
              <span className="summary-icon summary-icon--cyan" aria-hidden="true">
                <StatIcon name="clients" />
              </span>
              <span className="summary-copy">
                <span className="summary-label">Clients</span>
                <strong className="summary-value">{loading ? '-' : formatCompact(stats.totalClients)}</strong>
                <span className="summary-note">Customer and account profiles</span>
              </span>
            </button>
          </PermissionGuard>

          <PermissionGuard permission="INVENTORY">
            <button type="button" className="dashboard-summary-card" onClick={() => navigate('/inventory')}>
              <span className="summary-icon summary-icon--green" aria-hidden="true">
                <StatIcon name="inventory" />
              </span>
              <span className="summary-copy">
                <span className="summary-label">Inventory Items</span>
                <strong className="summary-value">{loading ? '-' : formatCompact(stats.totalInventoryItems)}</strong>
                <span className="summary-note">Catalogued products and stock</span>
              </span>
            </button>
          </PermissionGuard>
        </section>

        <section className="dashboard-content-grid">
          <article className="dashboard-panel dashboard-performance-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Performance report</span>
                <h2>Business performance this month</h2>
                <p>
                  A compact report that mirrors the finance section and helps leadership see whether orders,
                  revenue, and stock are moving in the right direction.
                </p>
              </div>
              <span className="panel-chip">Month to date</span>
            </div>

            <div className="performance-metrics">
              <div className="performance-total">
                <span>Sales income</span>
                <strong>{loading ? '-' : formatCurrency(stats.monthlySalesIncome)}</strong>
              </div>
              <div className="performance-total">
                <span>Liquidations</span>
                <strong>{loading ? '-' : formatCurrency(stats.monthlyLiquidation)}</strong>
              </div>
              <div className="performance-total performance-total--strong">
                <span>Net result</span>
                <strong>{loading ? '-' : formatCurrency(stats.monthlyNetIncome)}</strong>
              </div>
            </div>

            <div className="performance-bars">
              {healthMeters.map((meter) => (
                <div key={meter.label} className="performance-meter">
                  <div className="performance-meter-row">
                    <span>{meter.label}</span>
                    <strong>{loading ? '-' : `${Math.max(0, Math.min(100, meter.value))}%`}</strong>
                  </div>
                  <div className="performance-track" aria-hidden="true">
                    <span
                      className={`performance-fill performance-fill--${meter.tone}`}
                      style={{ width: `${Math.max(0, Math.min(100, meter.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="performance-list">
              {performanceItems.map((item) => (
                <div key={item.label} className="performance-list-item">
                  <div>
                    <span>{item.label}</span>
                    <p>{item.hint}</p>
                  </div>
                  <strong>{loading ? '-' : formatCount(item.value)}</strong>
                </div>
              ))}
            </div>

            <div className="performance-footer">
              <button type="button" className="secondary-action" onClick={() => navigate('/income')}>
                Open full finance workspace
              </button>
              <span className="performance-footnote">
                The detailed charts and liquidation history live in Finance.
              </span>
            </div>
          </article>

          <aside className="dashboard-panel dashboard-watchlist-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Operational watchlist</span>
                <h2>Priority areas</h2>
                <p>These are the pieces of the project the team should care about every day.</p>
              </div>
            </div>

            <div className="watchlist-stack">
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--teal" aria-hidden="true">
                  <StatIcon name="inventory-orders" />
                </span>
                <div>
                  <strong>Inventory orders</strong>
                  <p>Track ready-to-fulfill sales orders and keep the queue moving.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--blue" aria-hidden="true">
                  <StatIcon name="customized-orders" />
                </span>
                <div>
                  <strong>Customized orders</strong>
                  <p>Manage design approvals, production status, and completion flow.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--green" aria-hidden="true">
                  <StatIcon name="inventory" />
                </span>
                <div>
                  <strong>Inventory control</strong>
                  <p>Keep stock balanced and watch low inventory before it becomes a problem.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--cyan" aria-hidden="true">
                  <StatIcon name="clients" />
                </span>
                <div>
                  <strong>Client records</strong>
                  <p>Maintain customer information and link orders back to the right accounts.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--amber" aria-hidden="true">
                  <StatIcon name="attendance" />
                </span>
                <div>
                  <strong>Attendance</strong>
                  <p>Review employee logs, monthly coverage, and workday discipline.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--slate" aria-hidden="true">
                  <StatIcon name="finance" />
                </span>
                <div>
                  <strong>Finance and reporting</strong>
                  <p>Monitor income, liquidations, and the performance report in one place.</p>
                </div>
              </div>
              <div className="watchlist-item">
                <span className="watchlist-icon watchlist-icon--violet" aria-hidden="true">
                  <StatIcon name="employees" />
                </span>
                <div>
                  <strong>Employees</strong>
                  <p>Keep team access, records, and role-based permissions organized.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="dashboard-panel dashboard-modules-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Core modules</span>
              <h2>What matters in this project</h2>
              <p>
                These are the main working areas that define the system and should stay easy to reach from the dashboard.
              </p>
            </div>
          </div>

          <div className="module-grid">
            {moduleCards.map((card) => (
              <PermissionGuard key={card.label} permission={card.permission}>
                <button type="button" className={`module-card module-card--${card.tone}`} onClick={() => navigate(card.path)}>
                  <span className="module-icon" aria-hidden="true">
                    <StatIcon name={card.icon} />
                  </span>
                  <span className="module-copy">
                    <span className="module-label">{card.label}</span>
                    <span className="module-description">{card.description}</span>
                  </span>
                  <span className="module-meta">
                    {card.metric !== null ? (
                      <>
                        <strong>
                          {loading
                            ? '-'
                            : card.metricFormat === 'currency'
                              ? formatCurrency(card.metric)
                              : card.metricFormat === 'shortCurrency'
                                ? formatShortCurrency(card.metric)
                              : formatCount(card.metric)}
                        </strong>
                        <span>{card.metricLabel}</span>
                      </>
                    ) : (
                      <>
                        <strong>Open</strong>
                        <span>{card.metricLabel}</span>
                      </>
                    )}
                  </span>
                  <span className="module-arrow" aria-hidden="true">
                    ->
                  </span>
                </button>
              </PermissionGuard>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
