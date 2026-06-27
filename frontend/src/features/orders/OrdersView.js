import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import { useLocation } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import clientService from '../../services/clientService';
import incomeService from '../../services/incomeService';
import orderService from '../../services/orderService';
import teamService from '../../services/teamService';
import { getApiErrorMessage } from '../../utils/apiErrors';

const PAYMENT_OPTIONS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit'];
const ORDER_STATUS = {
  FOR_CLIENT_APPROVAL: 'FOR_CLIENT_APPROVAL',
  NOT_APPROVED: 'NOT_APPROVED',
  DOWN_PAYMENT_PENDING: 'DOWN_PAYMENT_PENDING',
  IN_PRODUCTION: 'IN_PRODUCTION',
  NOT_YET_FULLY_PAID: 'NOT_YET_FULLY_PAID',
  FULLY_PAID: 'FULLY_PAID',
  CANCELLED: 'CANCELLED',
};

const ORDER_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: ORDER_STATUS.FOR_CLIENT_APPROVAL, label: 'For Client Approval' },
  { key: ORDER_STATUS.NOT_APPROVED, label: 'Not Approved' },
  { key: ORDER_STATUS.DOWN_PAYMENT_PENDING, label: 'Down Payment Pending' },
  { key: ORDER_STATUS.IN_PRODUCTION, label: 'To Be Packaged' },
  { key: ORDER_STATUS.NOT_YET_FULLY_PAID, label: 'Not Yet Fully Paid' },
  { key: ORDER_STATUS.FULLY_PAID, label: 'Fully Paid' },
  { key: ORDER_STATUS.CANCELLED, label: 'Cancelled Orders' },
];

const INITIAL_PAGE_SIZE = 100;

const cleanArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const getStatusColor = (status) => {
  const colors = {
    [ORDER_STATUS.FOR_CLIENT_APPROVAL]: '#2196F3',
    [ORDER_STATUS.NOT_APPROVED]: '#F44336',
    [ORDER_STATUS.DOWN_PAYMENT_PENDING]: '#FF9800',
    [ORDER_STATUS.IN_PRODUCTION]: '#9C27B0',
    [ORDER_STATUS.NOT_YET_FULLY_PAID]: '#FF5722',
    [ORDER_STATUS.FULLY_PAID]: '#4CAF50',
    [ORDER_STATUS.CANCELLED]: '#757575',
  };
  return colors[status] || '#757575';
};

const getStatusLabel = (status) => {
  const labels = {
    [ORDER_STATUS.FOR_CLIENT_APPROVAL]: 'For Client Approval',
    [ORDER_STATUS.NOT_APPROVED]: 'Not Approved',
    [ORDER_STATUS.DOWN_PAYMENT_PENDING]: 'Down Payment Pending',
    [ORDER_STATUS.IN_PRODUCTION]: 'To Be Packaged',
    [ORDER_STATUS.NOT_YET_FULLY_PAID]: 'Not Yet Fully Paid',
    [ORDER_STATUS.FULLY_PAID]: 'Fully Paid',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
    [ORDER_STATUS.NOT_APPROVED]: 'Not Approved',
  };
  return labels[status] || status || 'For Client Approval';
};

const getInventoryLabel = (item) => {
  const typeLabel = item.itemType || 'Inventory Item';
  const shopSuffix = item.shop ? ` (${item.shop})` : '';
  if (typeLabel.toLowerCase() === 'jersey' && item.jerseyType) {
    return `${typeLabel} - ${item.jerseyType} - ${item.name}${shopSuffix}`;
  }
  return `${typeLabel} - ${item.name}${shopSuffix}`;
};

const formatMoney = (value) => `PHP ${(Number(value) || 0).toFixed(2)}`;

const getOrderFinancials = (order) => {
  if (!order) return { total: 0, afterDiscountTotal: 0, remainingAfterDownPayment: 0 };
  
  const total = (order.items || []).reduce((sum, item) => {
    return sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0));
  }, 0);
  
  const discountPercent = Number(order.discount) || 0;
  const downPayment = Number(order.downPayment) || 0;
  const afterDiscountTotal = total * (1 - discountPercent / 100);
  const remainingAfterDownPayment = afterDiscountTotal - downPayment;

  return { total, afterDiscountTotal, remainingAfterDownPayment };
};

const createInitialFormData = () => ({
  clientId: null,
  teamId: '',
  teamName: '',
  items: [{ productName: '', unitPrice: '', quantity: '' }],
  freebie: '',
  discount: '0',
  downPayment: '0',
  shop: '',
  orderDate: new Date().toISOString().split('T')[0],
  modeOfPayment: 'Cash',
  notes: '',
});

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState('');
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('');
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [formData, setFormData] = useState(createInitialFormData());
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSuggestionsOpen, setTeamSuggestionsOpen] = useState(false);
  const [retailSearchIndex, setRetailSearchIndex] = useState(null);
  const [retailSearchText, setRetailSearchText] = useState('');
  const [retailSuggestionsOpen, setRetailSuggestionsOpen] = useState(false);
  const location = useLocation();
  const openedCreditJobOrderRef = useRef(null);

  const loadClients = useCallback(async () => {
    try {
      const response = await clientService.getAllClients(0, 1000);
      setClients(cleanArray(response.data.content));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const response = await inventoryService.getAllInventory(0, 1000);
      setInventoryItems(cleanArray(response.data.content));
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamService.getAllTeams();
      setTeams(cleanArray(response.data));
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders(0, INITIAL_PAGE_SIZE);
      setOrders(response.data.content || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncomeEntries = useCallback(async () => {
    try {
      const response = await incomeService.getAllIncomeSources(0, 1000);
      setIncomeEntries(response.data.content || []);
    } catch (error) {
      console.error('Error loading income entries:', error);
    }
  }, []);

  useEffect(() => {
    loadClients();
    loadInventory();
    loadTeams();
    loadOrders();
    loadIncomeEntries();
  }, [loadClients, loadInventory, loadTeams, loadOrders, loadIncomeEntries]);

  const getRecordedPaidAmount = useCallback((jobOrderNo, fallbackDownPayment = 0) => {
    const recordedAmount = incomeEntries
      .filter((entry) => entry.jobOrderNo === jobOrderNo)
      .reduce((total, entry) => total + (Number(entry.amount) || 0), 0);

    return recordedAmount > 0 ? recordedAmount : Number(fallbackDownPayment) || 0;
  }, [incomeEntries]);

  const getRemainingBalance = useCallback((order) => {
    if (!order) return 0;
    const financials = getOrderFinancials(order);
    const paidAmount = getRecordedPaidAmount(order.jobOrderNo, order.downPayment);
    return Math.max(0, financials.afterDiscountTotal - paidAmount);
  }, [getRecordedPaidAmount]);

  const getOrderPaymentHistory = useCallback((order) => {
    if (!order?.jobOrderNo) return [];

    return incomeEntries
      .filter((entry) => entry.jobOrderNo === order.jobOrderNo)
      .slice()
      .sort((a, b) => new Date(a.createdAt || a.incomeDate || 0) - new Date(b.createdAt || b.incomeDate || 0))
      .map((entry, index) => ({
        ...entry,
        entryType: index === 0 ? 'Initial Payment' : 'Payment Update',
      }));
  }, [incomeEntries]);

  const isVipClient = Boolean(clients.find((client) => client?.id === formData.clientId)?.vip);

  useEffect(() => {
    if (modalOpen && isVipClient && formData.downPayment !== '0') {
      setFormData((prev) => ({ ...prev, downPayment: '0' }));
    }
  }, [isVipClient, modalOpen, formData.downPayment]);

  const filteredOrders = orders.filter((order) => {
    const normalizedStatus = (order.status || '').toUpperCase();
    const matchesStatus = statusFilter === 'ALL'
        ? normalizedStatus !== ORDER_STATUS.FULLY_PAID && normalizedStatus !== ORDER_STATUS.CANCELLED
        : normalizedStatus === statusFilter;

    const haystack = [
      order.jobOrderNo,
      order.clientName,
      order.teamName,
      order.orderRetail,
      getStatusLabel(order.status),
      order.shop,
      order.modeOfPayment,
      order.orderDate,
    ].filter(Boolean).join(' ').toLowerCase();

    return matchesStatus && haystack.includes(searchQuery.trim().toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);

  const filteredClients = clients.filter((client) =>
    String(client.clientName ?? '').toLowerCase().includes(clientSearch.trim().toLowerCase())
  );

  const filteredTeams = teams.filter((team) =>
    String(team.teamName ?? '').toLowerCase().includes(teamSearch.trim().toLowerCase())
  );

  const filteredInventory = inventoryItems.filter((item) => {
    const label = getInventoryLabel(item);
    
    // Check if already selected
    const isAlreadySelected = formData.items.some((orderItem, idx) => 
      idx !== retailSearchIndex && orderItem.productName === label
    );
    
    // Check if same shop (if a shop is already set by a previous selection)
    const isSameShop = !formData.shop || item.shop === formData.shop;
    
    return !isAlreadySelected && isSameShop && label.toLowerCase().includes(retailSearchText.trim().toLowerCase());
  });

  const handleClientSelect = (client) => {
    setFormData((prev) => ({ ...prev, clientId: client.id, downPayment: client.vip ? '0' : prev.downPayment }));
    setClientSearch(client.clientName || '');
    setClientSuggestionsOpen(false);
  };

  const handleTeamSelect = (team) => {
    const fallbackDate = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({
      ...prev,
      teamId: team.id,
      teamName: team.teamName || '',
      orderDate: team.transitDate || fallbackDate,
    }));
    setTeamSearch(team.teamName || '');
    setTeamSuggestionsOpen(false);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productName: '', unitPrice: '', quantity: '' }],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      let finalValue = value;

      if (field === 'quantity') {
        const item = newItems[index];
        const inventoryItem = inventoryItems.find(i => getInventoryLabel(i) === item.productName);
        if (inventoryItem) {
          const maxQty = inventoryItem.quantity || 0;
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue) && numValue > maxQty) {
            finalValue = String(maxQty);
          } else if (isNaN(numValue) && value !== '') {
             finalValue = '0';
          }
        }
      }

      newItems[index] = { ...newItems[index], [field]: finalValue };
      return { ...prev, items: newItems };
    });
  };

  const handleRetailSelect = (index, item) => {
    const label = getInventoryLabel(item);
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        productName: label,
        unitPrice: String(item.price || ''),
      };
      return { ...prev, items: newItems, shop: prev.shop || item.shop };
    });
    setRetailSuggestionsOpen(false);
    setRetailSearchIndex(null);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const price = Number.parseFloat(item.unitPrice || 0);
      const qty = Number.parseInt(item.quantity || 0, 10);
      return sum + (price * qty);
    }, 0);
  };

  const getDiscountedTotal = () => {
    const subtotal = calculateSubtotal();
    const discountPercent = Number.parseFloat(formData.discount || 0);
    return subtotal * (1 - discountPercent / 100);
  };

  const handleDownPaymentChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, downPayment: value });
      return;
    }
    const numValue = Number.parseFloat(value);
    const maxDownPayment = getDiscountedTotal();
    if (!Number.isFinite(numValue) || numValue < 0) return;
    setFormData({ ...formData, downPayment: String(Math.min(numValue, maxDownPayment)) });
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setReferenceNumber(order.referenceNumber || '');
    setRemarks(order.remarks || '');
    setPaymentUpdateAmount('');
    setPaymentCheckNumber('');
    setDetailsOpen(true);
  };

  useEffect(() => {
    const targetJobOrderNo = location.state?.jobOrderNo;
    if (!targetJobOrderNo || openedCreditJobOrderRef.current === targetJobOrderNo) {
      return;
    }

    const targetOrder = orders.find((order) => order.jobOrderNo === targetJobOrderNo);
    if (targetOrder) {
      openedCreditJobOrderRef.current = targetJobOrderNo;
      setSelectedOrder(targetOrder);
      setReferenceNumber(targetOrder.referenceNumber || '');
      setRemarks(targetOrder.remarks || '');
      setPaymentUpdateAmount('');
      setPaymentCheckNumber('');
      setDetailsOpen(true);
    }
  }, [location.state, orders]);

  const handleEdit = (order) => {
    if (order.status === ORDER_STATUS.FULLY_PAID) {
      alert('Fully Paid orders cannot be edited.');
      return;
    }
    setEditingOrder(order);
    setFormData({
      clientId: order.clientId || null,
      teamId: '',
      teamName: order.teamName || '',
      items: (order.items || []).map(item => ({
        productName: item.productName || '',
        unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
        quantity: item.quantity != null ? String(item.quantity) : '',
      })),
      freebie: order.freebie || '',
      discount: order.discount != null ? String(order.discount) : '0',
      downPayment: order.downPayment != null ? String(order.downPayment) : '0',
      shop: order.shop || '',
      orderDate: order.orderDate || new Date().toISOString().split('T')[0],
      modeOfPayment: order.modeOfPayment || 'Cash',
      notes: order.remarks || '',
    });
    if (!order.items || order.items.length === 0) {
      setFormData(prev => ({ ...prev, items: [{ productName: order.orderRetail || '', unitPrice: String(order.price || ''), quantity: String(order.quantity || '') }] }));
    }
    setClientSearch(order.clientName || '');
    setTeamSearch(order.teamName || '');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    const order = orders.find((o) => o.id === id);
    if (order && order.status === ORDER_STATUS.FULLY_PAID) {
      alert('Fully Paid orders cannot be deleted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await orderService.deleteOrder(id);
      alert('Order deleted successfully');
      loadOrders();
    } catch (error) {
      alert(`Failed to delete order: ${getApiErrorMessage(error)}`);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!clientSearch.trim()) { alert('Please enter a client name.'); return; }
      const invalidItem = formData.items.find(item => !item.productName.trim() || !item.unitPrice || !item.quantity);
      if (invalidItem) { alert('Please fill in all product details.'); return; }
      if (!formData.shop) { alert('Please select a shop.'); return; }
      if (!formData.modeOfPayment) { alert('Please select a mode of payment.'); return; }

      const payload = {
        clientId: formData.clientId || null,
        clientName: clientSearch.trim(),
        teamName: formData.teamName.trim() || null,
        items: formData.items.map(item => ({
          productName: item.productName.trim(),
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })),
        discount: Number(formData.discount || 0),
        downPayment: Number(formData.downPayment || 0),
        shop: formData.shop.trim(),
        orderDate: formData.orderDate,
        modeOfPayment: formData.modeOfPayment.trim(),
        remarks: formData.notes.trim() || null,
        freebie: formData.freebie.trim() || null,
        status: (editingOrder?.status === ORDER_STATUS.NOT_APPROVED) ? ORDER_STATUS.FOR_CLIENT_APPROVAL : (editingOrder?.status || ORDER_STATUS.FOR_CLIENT_APPROVAL),
      };

      if (editingOrder) {
        await orderService.updateOrder(editingOrder.id, payload);
        alert('Order updated successfully');
      } else {
        await orderService.createOrder(payload);
        alert('Order created successfully');
      }
      setModalOpen(false);
      loadOrders();
    } catch (error) {
      alert(`Failed to save order: ${getApiErrorMessage(error)}`);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
    setPaymentUpdateAmount('');
    setPaymentCheckNumber('');
  };

  const updateSelectedOrderStatus = async (newStatus) => {
    if (!selectedOrder) return;
    try {
      const payload = {
        ...selectedOrder,
        status: newStatus,
        remarks: remarks,
        referenceNumber: referenceNumber,
      };
      await orderService.updateOrder(selectedOrder.id, payload);
      setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      loadOrders();
    } catch (error) {
      alert(`Failed to update status: ${getApiErrorMessage(error)}`);
    }
  };

  const handleFullPaymentYes = async () => {
    if (!selectedOrder) return;
    const remainingBalance = getRemainingBalance(selectedOrder);
    if (remainingBalance <= 0) {
      await updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID);
      return;
    }

    try {
      await orderService.applyPaymentUpdate(selectedOrder.id, {
        amount: remainingBalance,
        referenceNumber: referenceNumber.trim() || null,
        remarks: remarks.trim() || null,
      });
      loadOrders();
      loadIncomeEntries();
    } catch (error) {
      alert(`Failed to record payment: ${getApiErrorMessage(error)}`);
    }
  };

  const handleNotYetFullyPaid = async () => {
    await updateSelectedOrderStatus(ORDER_STATUS.NOT_YET_FULLY_PAID);
  };

  const handlePaymentUpdate = async () => {
    if (!selectedOrder) return;

    const amount = Number(paymentUpdateAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid payment update amount.');
      return;
    }

    try {
      await orderService.applyPaymentUpdate(selectedOrder.id, {
        amount,
        checkNumber: paymentCheckNumber.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        remarks: remarks.trim() || null,
      });
      setPaymentUpdateAmount('');
      setPaymentCheckNumber('');
      loadOrders();
      loadIncomeEntries();
    } catch (error) {
      alert(`Failed to save payment update: ${getApiErrorMessage(error)}`);
    }
  };

  const styles = {
    pageContainer: { padding: '20px' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    searchBar: { marginBottom: '20px' },
    filterBar: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    modalContent: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    formGridWide: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontWeight: '600', color: '#333', fontSize: '0.9rem' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
    textarea: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', minHeight: '80px', resize: 'vertical' },
    autocompleteContainer: { position: 'relative', width: '100%' },
    suggestionsList: { position: 'absolute', top: '100%', left: '0', right: '0', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '0 0 6px 6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: '1000', maxHeight: '200px', overflowY: 'auto' },
    suggestionItem: { padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' },
    button: { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' },
    buttonPrimary: { backgroundColor: '#007bff', color: 'white' },
    buttonSecondary: { backgroundColor: '#6c757d', color: 'white' },
    buttonDanger: { backgroundColor: '#dc3545', color: 'white' },
    totalSection: { padding: '15px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginTop: '10px', borderLeft: '4px solid #007bff' },
    totalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: '#444' },
    financialsSection: { marginTop: '20px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' },
    financialsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' },
    financialLabel: { display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '4px' },
    detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
    detailRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
    productRow: { display: 'grid', gridTemplateColumns: '57% 13% 8% 15% 4%', gap: '10px', alignItems: 'end', marginBottom: '10px' },
    removeBtn: { backgroundColor: '#ff5252', color: 'white', border: 'none', borderRadius: '4px', width: '100%', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    addBtn: { backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'flex-start' }
  };

  return (
    <PermissionGuard permission="INVENTORY_ORDERS">
      <DashboardLayout>
        <div style={styles.pageContainer}>
          <div style={styles.pageHeader}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1a1a1a' }}>Inventory Orders</h1>
            <button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={() => { setEditingOrder(null); setFormData(createInitialFormData()); setClientSearch(''); setTeamSearch(''); setModalOpen(true); }}>
              + New Inventory Order
            </button>
          </div>

          <div style={styles.searchBar}>
            <input
              type="text"
              style={{ ...styles.input, width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔎 Search orders by job no, client, team, or status..."
            />
          </div>

          <div style={styles.filterBar}>
            {ORDER_FILTERS.map((filter) => (
              <button
                key={filter.key}
                style={{
                  ...styles.button,
                  backgroundColor: statusFilter === filter.key ? '#007bff' : '#f8f9fa',
                  color: statusFilter === filter.key ? 'white' : '#333',
                  border: '1px solid #ddd',
                  padding: '6px 12px',
                  fontSize: '0.85rem'
                }}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <DataTable
            columns={[
              { key: 'jobOrderNo', label: 'Job Order No' },
              { key: 'clientName', label: 'Client Name' },
              { key: 'teamName', label: 'Team Name' },
              {
                key: 'status',
                label: 'Status',
                render: (value) => (
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: getStatusColor(value),
                    color: 'white'
                  }}>
                    {getStatusLabel(value)}
                  </span>
                ),
              },
              { key: 'orderDate', label: 'Date' },
            ]}
            data={paginatedOrders}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEdit={(order) => order.status !== ORDER_STATUS.FULLY_PAID}
            canDelete={(order) => order.status !== ORDER_STATUS.FULLY_PAID}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <Modal
            isOpen={modalOpen}
            title={editingOrder ? 'Edit Inventory Order' : 'Add Inventory Order'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingOrder ? 'Update Order' : 'Create Order'}
            size="large"
          >
            <div style={styles.modalContent}>
              <div style={styles.formGridWide}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Client Name *</label>
                  <div style={styles.autocompleteContainer}>
                    <input
                      type="text"
                      style={styles.input}
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setClientSuggestionsOpen(true); setFormData(p => ({ ...p, clientId: null })); }}
                      onFocus={() => setClientSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setClientSuggestionsOpen(false), 200)}
                      placeholder="Enter client name"
                      autoComplete="off"
                    />
                    {clientSuggestionsOpen && filteredClients.length > 0 && (
                      <div style={styles.suggestionsList}>
                        {filteredClients.map(c => (
                          <div key={c.id} style={styles.suggestionItem} onMouseDown={() => handleClientSelect(c)}>
                            {c.clientName} {c.vip && <span style={{ fontSize: '0.7em', color: '#d4af37' }}>(VIP)</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <small style={{ color: '#666', fontSize: '0.75rem' }}>Type any client name. This does not need to match a saved client.</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Team (Optional)</label>
                  <div style={styles.autocompleteContainer}>
                    <input
                      type="text"
                      style={styles.input}
                      value={teamSearch}
                      onChange={(e) => { setTeamSearch(e.target.value); setTeamSuggestionsOpen(true); setFormData(p => ({ ...p, teamName: e.target.value })); }}
                      onFocus={() => setTeamSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setTeamSuggestionsOpen(false), 200)}
                      placeholder="Search team..."
                      autoComplete="off"
                    />
                    {teamSuggestionsOpen && filteredTeams.length > 0 && (
                      <div style={styles.suggestionsList}>
                        {filteredTeams.map(t => (
                          <div key={t.id} style={styles.suggestionItem} onMouseDown={() => handleTeamSelect(t)}>
                            {t.teamName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {formData.items.map((item, index) => (
                  <div key={index} style={styles.productRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{index === 0 ? 'Product Name *' : ''}</label>
                      <div style={styles.autocompleteContainer}>
                        <input
                          type="text"
                          style={styles.input}
                          value={item.productName}
                          onChange={(e) => {
                            handleItemChange(index, 'productName', e.target.value);
                            setRetailSearchText(e.target.value);
                            setRetailSearchIndex(index);
                            setRetailSuggestionsOpen(true);
                          }}
                          onFocus={() => { setRetailSearchText(item.productName); setRetailSearchIndex(index); setRetailSuggestionsOpen(true); }}
                          onBlur={() => setTimeout(() => setRetailSuggestionsOpen(false), 200)}
                          placeholder="Enter product name..."
                        />
                        {retailSuggestionsOpen && retailSearchIndex === index && filteredInventory.length > 0 && (
                          <div style={styles.suggestionsList}>
                            {filteredInventory.map(i => (
                              <div key={i.id} style={styles.suggestionItem} onMouseDown={() => handleRetailSelect(index, i)}>
                                {getInventoryLabel(i)} (Stock: {i.quantity})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{index === 0 ? 'Unit Price *' : ''}</label>
                      <input
                        type="number"
                        style={{ ...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        value={item.unitPrice}
                        readOnly
                        placeholder="0.00"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{index === 0 ? 'Quantity *' : ''}</label>
                      <input
                        type="number"
                        style={styles.input}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        max={(() => {
                          const inv = inventoryItems.find(i => getInventoryLabel(i) === item.productName);
                          return inv ? inv.quantity : undefined;
                        })()}
                        placeholder="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{index === 0 ? 'Total' : ''}</label>
                      <div style={{ ...styles.input, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {formatMoney(Number(item.unitPrice || 0) * Number(item.quantity || 0))}
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button style={styles.removeBtn} onClick={() => handleRemoveItem(index)}>✕</button>
                    )}
                  </div>
                ))}
                <button style={styles.addBtn} onClick={handleAddItem}>+ Add Another Product</button>
              </div>

              <div style={{ ...styles.formGrid, gridTemplateColumns: '0.5fr 1fr 1fr 1.5fr' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Discount %</label>
                  <input type="number" style={styles.input} value={formData.discount} onChange={(e) => setFormData(p => ({ ...p, discount: e.target.value }))} placeholder="0" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Down Payment</label>
                  <input type="number" style={styles.input} value={formData.downPayment} onChange={handleDownPaymentChange} disabled={isVipClient} placeholder="0" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Total Price</label>
                  <div style={{ ...styles.input, backgroundColor: '#f5f5f5' }}>{formatMoney(calculateSubtotal())}</div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Freebie</label>
                  <input type="text" style={styles.input} value={formData.freebie} onChange={(e) => setFormData(p => ({ ...p, freebie: e.target.value }))} placeholder="e.g., T-shirt, Cap" />
                </div>
              </div>

              <div style={{ ...styles.formGrid, gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Shop *</label>
                  <input
                    type="text"
                    style={{ ...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    value={formData.shop}
                    readOnly
                    placeholder="Select a product first"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mode of Payment *</label>
                  <select style={styles.input} value={formData.modeOfPayment} onChange={(e) => setFormData(p => ({ ...p, modeOfPayment: e.target.value }))}>
                    <option value="">Select Payment</option>
                    {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Order Date *</label>
                  <input type="date" style={styles.input} value={formData.orderDate} onChange={(e) => setFormData(p => ({ ...p, orderDate: e.target.value }))} />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea style={styles.textarea} value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
              </div>

              <div style={styles.totalSection}>
                <div style={styles.totalRow}>
                  <span>Total Amount:</span>
                  <span style={{ fontWeight: '600' }}>{formatMoney(calculateSubtotal())}</span>
                </div>
                <div style={styles.totalRow}>
                  <span>After Discount:</span>
                  <span style={{ fontWeight: '600' }}>{formatMoney(getDiscountedTotal())}</span>
                </div>
                <div style={styles.totalRow}>
                  <span>After Down Payment:</span>
                  <span style={{ fontWeight: '600' }}>{formatMoney(getDiscountedTotal() - Number(formData.downPayment || 0))}</span>
                </div>
                <div style={{ ...styles.totalRow, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>Total Remaining:</span>
                  <span style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.1rem' }}>{formatMoney(getDiscountedTotal() - Number(formData.downPayment || 0))}</span>
                </div>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={detailsOpen}
            title={selectedOrder ? `Order Details - ${selectedOrder.jobOrderNo}` : 'Order Details'}
            onClose={closeDetails}
            size="xlarge"
          >
            {selectedOrder && (
              <div style={styles.modalContent}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailRow}><label style={styles.label}>Client Name:</label><span>{selectedOrder.clientName}</span></div>
                  <div style={styles.detailRow}><label style={styles.label}>Team Name:</label><span>{selectedOrder.teamName || '-'}</span></div>
                  <div style={styles.detailRow}><label style={styles.label}>Shop:</label><span>{selectedOrder.shop}</span></div>
                  <div style={styles.detailRow}><label style={styles.label}>Payment Mode:</label><span>{selectedOrder.modeOfPayment}</span></div>
                  <div style={styles.detailRow}><label style={styles.label}>Order Date:</label><span>{selectedOrder.orderDate}</span></div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Status:</label>
                    <span style={{ color: getStatusColor(selectedOrder.status), fontWeight: 'bold' }}>{getStatusLabel(selectedOrder.status)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Discount:</label>
                    <span>{selectedOrder.discount || 0}%</span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Products:</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Product Name</th>
                        <th style={{ padding: '10px' }}>Unit Price</th>
                        <th style={{ padding: '10px' }}>Quantity</th>
                        <th style={{ padding: '10px' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || [{ productName: selectedOrder.orderRetail, unitPrice: selectedOrder.price, quantity: selectedOrder.quantity }]).map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{item.productName}</td>
                          <td style={{ padding: '10px' }}>{formatMoney(item.unitPrice)}</td>
                          <td style={{ padding: '10px' }}>{item.quantity}</td>
                          <td style={{ padding: '10px' }}>{formatMoney(item.unitPrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.financialsSection}>
                  <h3 style={{ margin: '0 0 15px 0' }}>Financial Summary</h3>
                  {(() => {
                    const financials = getOrderFinancials(selectedOrder);
                    const paidAmount = getRecordedPaidAmount(selectedOrder.jobOrderNo, selectedOrder.downPayment);
                    const remainingBalance = getRemainingBalance(selectedOrder);
                    return (
                      <>
                        <div style={styles.financialsGrid}>
                          <div><span style={styles.financialLabel}>Total Amount:</span><span>{formatMoney(financials.total)}</span></div>
                          <div><span style={styles.financialLabel}>After Discount:</span><span>{formatMoney(financials.afterDiscountTotal)}</span></div>
                          <div><span style={styles.financialLabel}>Total Paid:</span><span>{formatMoney(paidAmount)}</span></div>
                          <div><span style={styles.financialLabel}>Remaining Balance:</span><strong style={{ color: '#d9534f' }}>{formatMoney(remainingBalance)}</strong></div>
                        </div>
                        <div style={{ marginTop: '18px' }}>
                          <h4 style={{ margin: '0 0 10px 0' }}>Payment History</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {getOrderPaymentHistory(selectedOrder).length > 0 ? (
                              getOrderPaymentHistory(selectedOrder).map((payment) => (
                                <div
                                  key={payment.id}
                                  style={{
                                    padding: '12px 14px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <strong>{payment.entryType}</strong>
                                    <span style={styles.financialLabel}>
                                      {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : payment.incomeDate || 'No date'}
                                    </span>
                                    <span style={styles.financialLabel}>
                                      Reference: {payment.referenceNumber || 'N/A'}
                                    </span>
                                    <span style={styles.financialLabel}>
                                      Check No.: {payment.checkNumber || 'N/A'}
                                    </span>
                                  </div>
                                  <strong>{formatMoney(payment.amount)}</strong>
                                </div>
                              ))
                            ) : (
                              <p style={{ margin: 0, color: '#6b7280' }}>No payment history recorded yet.</p>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {selectedOrder.status === ORDER_STATUS.FOR_CLIENT_APPROVAL && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.CANCELLED)}>Order Cancelled</button>
                    <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.NOT_APPROVED)}>Not Approved</button>
                    <button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.DOWN_PAYMENT_PENDING)}>Approved by Client?</button>
                  </div>
                )}

                {selectedOrder.status === ORDER_STATUS.DOWN_PAYMENT_PENDING && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.CANCELLED)}>Order Cancelled</button>
                    <button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.IN_PRODUCTION)}>Down Payment Paid</button>
                  </div>
                )}

                {(selectedOrder.status === ORDER_STATUS.IN_PRODUCTION || selectedOrder.status === ORDER_STATUS.NOT_YET_FULLY_PAID) && (
                  <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Payment Update</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="number"
                        style={styles.input}
                        placeholder="Input payment update"
                        value={paymentUpdateAmount}
                        onChange={(e) => setPaymentUpdateAmount(e.target.value)}
                      />
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="Check number (optional)"
                        value={paymentCheckNumber}
                        onChange={(e) => setPaymentCheckNumber(e.target.value)}
                      />
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="Enter Reference Number"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                      <textarea
                        style={styles.textarea}
                        placeholder="Enter Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }} onClick={handlePaymentUpdate}>Save Payment Update</button>
                        <button style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }} onClick={handleFullPaymentYes}>Mark Fully Paid</button>
                        <button style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }} onClick={handleNotYetFullyPaid}>Not Yet Fully Paid</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.status === ORDER_STATUS.FULLY_PAID && (
                  <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Order Payment Information</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Reference Number</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            style={{ ...styles.input, flex: 1 }}
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                          />
                          <button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID)}>Save</button>
                        </div>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Remarks</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <textarea
                            style={{ ...styles.textarea, flex: 1 }}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                          />
                          <button style={{ ...styles.button, ...styles.buttonPrimary, alignSelf: 'flex-end' }} onClick={() => updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID)}>Save</button>
                        </div>
                      </div>
                      <p style={{ margin: '10px 0 0 0', color: '#28a745', fontWeight: 'bold', fontStyle: 'italic' }}>
                        This order is fully paid / completed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default Orders;
