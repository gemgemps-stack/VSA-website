import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import { useLocation } from 'react-router-dom';
import incomeService from '../../services/incomeService';
import customizedOrderService from '../../services/customizedOrderService';
import teamService from '../../services/teamService';
import clientService from '../../services/clientService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const SHOP_OPTIONS = ['VSA Online Shop', 'Tiktok Shop', 'Shoppee', 'Verdida Sports Apparel'];
const PAYMENT_OPTIONS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit'];

const ORDER_STATUS = {
  FOR_CLIENT_APPROVAL: 'FOR_CLIENT_APPROVAL',
  NOT_APPROVED: 'NOT_APPROVED',
  DOWN_PAYMENT_PENDING: 'DOWN_PAYMENT_PENDING',
  IN_PRODUCTION: 'IN_PRODUCTION',
  NOT_YET_FULLY_PAID: 'NOT_YET_FULLY_PAID',
  FULLY_PAID: 'FULLY_PAID',
  CANCELLED: 'CANCELLED',
  MANUFACTURED: 'MANUFACTURED',
};

const INITIAL_PAGE_SIZE = 100;
const ORDER_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'For Client Approval', value: ORDER_STATUS.FOR_CLIENT_APPROVAL },
  { label: 'Not Approved', value: ORDER_STATUS.NOT_APPROVED },
  { label: 'Down Payment Pending', value: ORDER_STATUS.DOWN_PAYMENT_PENDING },
  { label: 'In Production', value: ORDER_STATUS.IN_PRODUCTION },
  { label: 'Not Yet Fully Paid', value: ORDER_STATUS.NOT_YET_FULLY_PAID },
  { label: 'Fully Paid', value: ORDER_STATUS.FULLY_PAID },
  { label: 'Cancelled Orders', value: ORDER_STATUS.CANCELLED },
];

const cleanArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const getStatusLabel = (status) => {
  const labels = {
    [ORDER_STATUS.FOR_CLIENT_APPROVAL]: 'For Client Approval',
    [ORDER_STATUS.NOT_APPROVED]: 'Not Approved',
    [ORDER_STATUS.DOWN_PAYMENT_PENDING]: 'Down Payment Pending',
    [ORDER_STATUS.IN_PRODUCTION]: 'In Production',
    [ORDER_STATUS.NOT_YET_FULLY_PAID]: 'Not Yet Fully Paid',
    [ORDER_STATUS.FULLY_PAID]: 'Fully Paid',
    [ORDER_STATUS.MANUFACTURED]: 'Manufactured',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
  };

  return labels[status] || status || 'Unknown';
};

const formatMoney = (value) => `PHP ${(Number(value) || 0).toFixed(2)}`;

const getOrderFinancials = (order) => {
  if (!order) {
    return {
      total: 0,
      afterDiscountTotal: 0,
      remainingAfterDownPayment: 0,
    };
  }
  
  const total = (order.items || []).reduce((sum, item) => {
    return sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0));
  }, 0);
  
  const discountPercent = Number(order?.discount) || 0;
  const downPayment = Number(order?.downPayment) || 0;
  const afterDiscountTotal = total * (1 - discountPercent / 100);
  const remainingAfterDownPayment = afterDiscountTotal - downPayment;

  return {
    total,
    afterDiscountTotal,
    remainingAfterDownPayment,
  };
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

const CustomizedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isReferenceNumberEditing, setIsReferenceNumberEditing] = useState(false);
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState('');
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('');
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [manufacturingNotes, setManufacturingNotes] = useState('');
  const [formData, setFormData] = useState(createInitialFormData());
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSuggestionsOpen, setTeamSuggestionsOpen] = useState(false);
  const location = useLocation();
  const openedCreditJobOrderRef = useRef(null);

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamService.getAllTeams();
      setTeams(cleanArray(response.data));
    } catch (error) {
      console.error('Error loading teams:', error);
      if (isAuthOrPermissionError(error)) {
        return;
      }
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await clientService.getAllClients(0, 1000);
      setClients(cleanArray(response.data.content));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customizedOrderService.getAllOrders(0, INITIAL_PAGE_SIZE);
      setOrders(cleanArray(response.data.content));
    } catch (error) {
      console.error('Error loading orders:', error);
      if (isAuthOrPermissionError(error)) {
        return;
      }
      alert(getApiErrorMessage(error, 'Failed to load orders'));
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
    loadTeams();
    loadClients();
    loadIncomeEntries();
  }, [loadTeams, loadClients, loadIncomeEntries]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const targetJobOrderNo = location.state?.jobOrderNo;
    if (!targetJobOrderNo || openedCreditJobOrderRef.current === targetJobOrderNo) {
      return;
    }

    const targetOrder = orders.find((order) => order.jobOrderNo === targetJobOrderNo);
    if (targetOrder) {
      openedCreditJobOrderRef.current = targetJobOrderNo;
      setSelectedOrder(targetOrder);
      setManufacturingNotes(targetOrder.remarks || '');
      setReferenceNumber(targetOrder.referenceNumber || '');
      setIsReferenceNumberEditing(false);
      setPaymentUpdateAmount('');
      setPaymentCheckNumber('');
      setDetailsOpen(true);
    }
  }, [location.state, orders]);

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

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? order?.status !== ORDER_STATUS.FULLY_PAID
        : (statusFilter === ORDER_STATUS.FULLY_PAID
          ? order?.status === ORDER_STATUS.FULLY_PAID
          : order?.status === statusFilter);

    const haystack = [
      order?.jobOrderNo,
      order?.clientName,
      order?.teamName,
      order?.orderRetail,
      getStatusLabel(order?.status),
      order?.shop,
      order?.modeOfPayment,
      order?.orderDate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesStatus && haystack.includes(searchQuery.trim().toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);

  const filteredTeams = teams
    .filter(Boolean)
    .filter((team) =>
      String(team?.teamName ?? '').toLowerCase().includes(teamSearch.trim().toLowerCase())
    );

  const filteredClients = clients
    .filter(Boolean)
    .filter((client) =>
      String(client?.clientName ?? '').toLowerCase().includes(clientSearch.trim().toLowerCase())
    );

  const handleClientSelect = (client) => {
    setFormData((prev) => ({
      ...prev,
      clientId: client.id,
    }));
    setClientSearch(client.clientName || '');
    setClientSuggestionsOpen(false);
  };

  const handleClientInputChange = (value) => {
    setClientSearch(value);
    setClientSuggestionsOpen(true);
    setFormData((prev) => ({
      ...prev,
      clientId: null,
    }));
  };

  const handleClientInputBlur = () => {
    window.setTimeout(() => setClientSuggestionsOpen(false), 150);
  };

  const handleTeamSelect = (teamId) => {
    const selectedTeam = teams.find((team) => team?.id === teamId);
    const fallbackDate = new Date().toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      teamId,
      teamName: selectedTeam?.teamName || '',
      orderDate: selectedTeam?.transitDate || fallbackDate,
    }));
    setTeamSearch(selectedTeam?.teamName || '');
    setTeamSuggestionsOpen(false);
  };

  const handleTeamInputChange = (value) => {
    setTeamSearch(value);
    setTeamSuggestionsOpen(true);
    setFormData((prev) => ({
      ...prev,
      teamId: '',
      teamName: value,
    }));
  };

  const handleTeamInputBlur = () => {
    window.setTimeout(() => setTeamSuggestionsOpen(false), 150);
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
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
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

    if (!Number.isFinite(numValue) || numValue < 0) {
      return;
    }

    setFormData({
      ...formData,
      downPayment: String(Math.min(numValue, maxDownPayment)),
    });
  };

  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setFormData(createInitialFormData());
    setClientSearch('');
    setClientSuggestionsOpen(false);
    setTeamSearch('');
    setTeamSuggestionsOpen(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingOrder(null);
    setFormData(createInitialFormData());
    setClientSearch('');
    setClientSuggestionsOpen(false);
    setTeamSearch('');
    setTeamSuggestionsOpen(false);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      clientId: order?.clientId || null,
      teamId: '',
      teamName: order?.teamName || '',
      items: (order?.items || []).map(item => ({
        id: item.id,
        productName: item.productName || '',
        unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
        quantity: item.quantity != null ? String(item.quantity) : '',
      })),
      freebie: order?.freebie || '',
      discount: order?.discount != null ? String(order.discount) : '0',
      downPayment: order?.downPayment != null ? String(order.downPayment) : '0',
      shop: order?.shop || '',
      orderDate: order?.orderDate || new Date().toISOString().split('T')[0],
      modeOfPayment: order?.modeOfPayment || 'Cash',
      notes: order?.remarks || '',
    });
    if (order?.items?.length === 0) {
      setFormData(prev => ({ ...prev, items: [{ productName: '', unitPrice: '', quantity: '' }] }));
    }
    setClientSearch(order?.clientName || '');
    setClientSuggestionsOpen(false);
    setTeamSearch(order?.teamName || '');
    setTeamSuggestionsOpen(false);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await customizedOrderService.deleteOrder(id);
      alert('Customized order deleted successfully');
      loadOrders();
    } catch (error) {
      console.error('Error deleting customized order:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to delete order: ${apiMessage}`);
    }
  };

  const handleSubmitOrder = async () => {
    try {
      if (!clientSearch.trim()) {
        alert('Please enter a client name.');
        return;
      }

      const invalidItem = formData.items.find(item => !item.productName.trim() || !item.unitPrice || !item.quantity);
      if (invalidItem) {
        alert('Please fill in all product details (Name, Price, and Quantity).');
        return;
      }

      if (!formData.shop) {
        alert('Please select a shop.');
        return;
      }

      if (!formData.modeOfPayment) {
        alert('Please select a mode of payment.');
        return;
      }

      const discount = Number(formData.discount || 0);
      const downPaymentAmount = Number(formData.downPayment || 0);
      const discountedTotal = getDiscountedTotal();

      if (downPaymentAmount > discountedTotal) {
        alert(`Down payment cannot exceed the total discounted amount (${discountedTotal.toFixed(2)}).`);
        return;
      }

      const payload = {
        clientId: formData.clientId || null,
        clientName: clientSearch.trim(),
        teamName: formData.teamName.trim() || null,
        items: formData.items.map(item => ({
          id: item.id,
          productName: item.productName.trim(),
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })),
        discount: Number.isFinite(discount) ? discount : 0,
        downPayment: Number.isFinite(downPaymentAmount) ? downPaymentAmount : 0,
        shop: formData.shop.trim(),
        orderDate: formData.orderDate,
        modeOfPayment: formData.modeOfPayment.trim(),
        remarks: formData.notes.trim() || null,
        freebie: formData.freebie.trim() || null,
        status: editingOrder?.status || ORDER_STATUS.FOR_CLIENT_APPROVAL,
      };

      if (editingOrder) {
        await customizedOrderService.updateOrder(editingOrder.id, payload);
        alert('Customized order updated successfully');
      } else {
        await customizedOrderService.createOrder(payload);
        alert('Customized order created successfully');
      }

      handleCloseModal();
      loadOrders();
    } catch (error) {
      console.error('Error saving order:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to save order: ${apiMessage}`);
    }
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setManufacturingNotes(order.remarks || '');
    setReferenceNumber(order.referenceNumber || '');
    setIsReferenceNumberEditing(false);
    setPaymentUpdateAmount('');
    setPaymentCheckNumber('');
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
    setManufacturingNotes('');
    setReferenceNumber('');
    setIsReferenceNumberEditing(false);
    setPaymentUpdateAmount('');
    setPaymentCheckNumber('');
  };

  const buildOrderPayload = (order, statusOverride) => ({
    clientId: order.clientId,
    clientName: order.clientName || null,
    teamName: order.teamName || null,
    items: (order.items || []).map(item => ({
      id: item.id,
      productName: item.productName,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
    freebie: order.freebie || null,
    discount: Number(order.discount || 0),
    downPayment: Number(order.downPayment || 0),
    shop: order.shop,
    orderDate: order.orderDate,
    modeOfPayment: order.modeOfPayment,
    remarks: order.remarks || '',
    referenceNumber: referenceNumber.trim() || null,
    status: statusOverride || order.status || ORDER_STATUS.FOR_CLIENT_APPROVAL,
  });

  const updateSelectedOrderStatus = async (newStatus) => {
    if (!selectedOrder) {
      return;
    }

    try {
      const payload = buildOrderPayload(selectedOrder, newStatus);
      const response = await customizedOrderService.updateOrder(selectedOrder.id, payload);
      const updatedOrder = response.data;

      setSelectedOrder((prev) => ({
        ...prev,
        ...(updatedOrder || {}),
        status: newStatus,
      }));

      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to update order status: ${apiMessage}`);
    }
  };

  const handleFullPaymentYes = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      const remainingBalance = getRemainingBalance(selectedOrder);

      if (remainingBalance <= 0) {
        await updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID);
        return;
      }

      await customizedOrderService.applyPaymentUpdate(selectedOrder.id, {
        amount: remainingBalance,
        referenceNumber: referenceNumber.trim() || null,
        remarks: manufacturingNotes.trim() || null,
      });

      loadOrders();
      loadIncomeEntries();
    } catch (error) {
      console.error('Error saving payment update:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to save payment update: ${apiMessage}`);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedOrder) {
      return;
    }

    const amount = Number(paymentUpdateAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid payment update amount.');
      return;
    }

    try {
      await customizedOrderService.applyPaymentUpdate(selectedOrder.id, {
        amount,
        checkNumber: paymentCheckNumber.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        remarks: manufacturingNotes.trim() || null,
      });
      setPaymentUpdateAmount('');
      setPaymentCheckNumber('');
      loadOrders();
      loadIncomeEntries();
    } catch (error) {
      console.error('Error saving payment update:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to save payment update: ${apiMessage}`);
    }
  };

  const handleRemarksBlur = async () => {
    if (!selectedOrder) {
      return;
    }

    const isRemarksEnabled =
      selectedOrder.status === ORDER_STATUS.IN_PRODUCTION ||
      selectedOrder.status === ORDER_STATUS.NOT_YET_FULLY_PAID;

    if (!isRemarksEnabled) {
      return;
    }

    try {
      await updateSelectedOrderStatus(selectedOrder.status);
    } catch (error) {
      // updateSelectedOrderStatus already shows the error message
    }
  };

  const handleSaveReferenceNumber = async () => {
    if (!selectedOrder) {
      return;
    }

    await updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID);
    setIsReferenceNumberEditing(false);
  };

  const handleCancelReferenceNumberEdit = () => {
    setReferenceNumber(selectedOrder?.referenceNumber || '');
    setIsReferenceNumberEditing(false);
  };

  const columns = [
    { key: 'jobOrderNo', label: 'Job Order No' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'teamName', label: 'Team Name' },
    { 
      key: 'items', 
      label: 'Products', 
      render: (items) => (items || []).map(i => `${i.productName} (x${i.quantity})`).join(', ') 
    },
    { key: 'status', label: 'Status', render: (value) => getStatusLabel(value) },
    { key: 'orderDate', label: 'Date' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case ORDER_STATUS.FOR_CLIENT_APPROVAL:
        return '#607D8B';
      case ORDER_STATUS.NOT_APPROVED:
        return '#E53935';
      case ORDER_STATUS.DOWN_PAYMENT_PENDING:
        return '#FFC107';
      case ORDER_STATUS.FULLY_PAID:
        return '#4CAF50';
      case ORDER_STATUS.IN_PRODUCTION:
        return '#FF9800';
      case ORDER_STATUS.NOT_YET_FULLY_PAID:
        return '#F9A825';
      case ORDER_STATUS.MANUFACTURED:
        return '#2196F3';
      default:
        return '#666';
    }
  };

  return (
    <PermissionGuard permission="CUSTOMIZED_ORDERS">
      <DashboardLayout>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <h1 style={styles.title}>🏭 Customized Orders</h1>
              <p style={styles.subtitle}>Orders to be manufactured</p>
            </div>
            <button onClick={handleOpenAddModal} style={styles.addButton}>
              + New Customized Order
            </button>
          </div>

          <div style={styles.searchSection}>
            <input
              type="text"
              placeholder="Search by Job Order No, Client, Product, etc..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterBar}>
            {ORDER_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...styles.filterButton,
                    ...(isActive ? styles.filterButtonActive : {}),
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <p>Loading orders...</p>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={paginatedOrders}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={(order) => order.status !== ORDER_STATUS.FULLY_PAID}
                canDelete={(order) => order.status !== ORDER_STATUS.FULLY_PAID}
                onRowClick={handleView}
                rowStyle={(row) => ({
                  cursor: 'pointer',
                  borderLeft: `4px solid ${getStatusColor(row.status)}`,
                })}
              />

              {filteredOrders.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No customized orders available for manufacturing</p>
                </div>
              ) : (
                <div style={styles.pagination}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={styles.paginationButton}
                  >
                    Previous
                  </button>
                  <span style={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={styles.paginationButton}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          <Modal
            isOpen={modalOpen}
            title={editingOrder ? 'Edit Customized Order' : 'Add Customized Order'}
            onClose={handleCloseModal}
            onSubmit={handleSubmitOrder}
            submitText={editingOrder ? 'Update Order' : 'Create Order'}
            size="large"
          >
            <div style={styles.formSection}>
                  {/* Row 1: Client and Team */}
                  <div style={{ ...styles.formGrid, gridTemplateColumns: '1fr 1fr' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Client Name*</label>
                      <div style={styles.autocompleteContainer}>
                        <input
                          type="text"
                          placeholder="Enter client name"
                          value={clientSearch}
                          onChange={(e) => handleClientInputChange(e.target.value)}
                          onFocus={() => setClientSuggestionsOpen(true)}
                          onBlur={handleClientInputBlur}
                          style={styles.input}
                        />
                        {clientSuggestionsOpen && filteredClients.length > 0 && (
                          <div style={styles.suggestionsList}>
                            {filteredClients.map((client) => (
                              <div
                                key={client.id}
                                onClick={() => handleClientSelect(client)}
                                style={styles.suggestionItem}
                              >
                                {client?.clientName || ''}
                              </div>
                            ))}
                          </div>
                        )}
                        <small style={styles.hint}>Type any client name. This does not need to match a saved client.</small>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Team (Optional)</label>
                      <div style={styles.autocompleteContainer}>
                        <input
                          type="text"
                          placeholder="Search team..."
                          value={teamSearch}
                          onChange={(e) => handleTeamInputChange(e.target.value)}
                          onFocus={() => setTeamSuggestionsOpen(true)}
                          onBlur={handleTeamInputBlur}
                          style={styles.input}
                        />
                        {teamSuggestionsOpen && filteredTeams.length > 0 && (
                          <div style={styles.suggestionsList}>
                            {filteredTeams.map((team) => (
                              <div
                                key={team.id}
                                onClick={() => handleTeamSelect(team.id)}
                                style={styles.suggestionItem}
                              >
                                {team?.teamName || ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

	                  {/* Dynamic Product Items */}
	                  {formData.items.map((item, index) => (
	                    <div key={index} style={{ ...styles.formGrid, gridTemplateColumns: '57% 13% 8% 15% 4%', gap: '10px', alignItems: 'end', marginBottom: '10px' }}>
	                      <div style={styles.formGroup}>
	                        <label style={styles.label}>{index === 0 ? 'Product Name *' : ''}</label>
	                        <input
	                          type="text"
	                          placeholder="Enter product name..."
	                          value={item.productName}
	                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
	                          style={styles.input}
	                        />
	                      </div>
	
	                      <div style={styles.formGroup}>
	                        <label style={styles.label}>{index === 0 ? 'Unit Price *' : ''}</label>
	                        <input
	                          type="number"
	                          value={item.unitPrice}
	                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
	                          placeholder="0.00"
	                          step="0.01"
	                          style={styles.input}
	                        />
	                      </div>
	
	                      <div style={styles.formGroup}>
	                        <label style={styles.label}>{index === 0 ? 'Qty *' : ''}</label>
	                        <input
	                          type="number"
	                          value={item.quantity}
	                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
	                          placeholder="0"
	                          style={styles.input}
	                        />
	                      </div>
	
	                      <div style={styles.formGroup}>
	                        <label style={styles.label}>{index === 0 ? 'Total' : ''}</label>
	                        <div style={{ ...styles.input, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center' }}>
	                          {formatMoney((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0))}
	                        </div>
	                      </div>
	
	                      <div style={styles.formGroup}>
	                        {formData.items.length > 1 ? (
	                          <button
	                            type="button"
	                            onClick={() => handleRemoveItem(index)}
	                            style={{
	                              ...styles.button,
	                              backgroundColor: '#ff5252',
	                              color: 'white',
	                              padding: '8px 0',
	                              width: '100%',
	                              marginBottom: '5px',
	                            }}
	                          >
	                            ✕
	                          </button>
	                        ) : <div style={{ marginBottom: '5px', height: '38px' }}></div>}
	                      </div>
	                    </div>
	                  ))}

                  <div style={{ marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{
                        ...styles.button,
                        backgroundColor: '#2196F3',
                        color: 'white',
                        fontSize: '0.85em',
                        padding: '6px 12px',
                      }}
                    >
                      + Add Another Product
                    </button>
                  </div>

                  {/* Row 3: Discount (10%), Down Payment (20%), Total Price (25%), Freebie (45%) */}
                  <div style={{ ...styles.formGrid, gridTemplateColumns: '0.1fr 0.2fr 0.25fr 0.45fr' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Discount %</label>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        placeholder="0"
                        step="0.01"
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Down Payment</label>
                      <input
                        type="number"
                        value={formData.downPayment}
                        onChange={handleDownPaymentChange}
                        placeholder="0.00"
                        step="0.01"
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Total Price</label>
                      <input
                        type="text"
                        value={formatMoney(calculateSubtotal())}
                        disabled
                        style={{ ...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Freebie</label>
                      <input
                        type="text"
                        value={formData.freebie}
                        onChange={(e) => setFormData({ ...formData, freebie: e.target.value })}
                        placeholder="e.g., T-shirt, Cap"
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Row 4: Shop, Mode of Payment, Order Date */}
                  <div style={{ ...styles.formGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Shop *</label>
                      <select
                        value={formData.shop}
                        onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
                        style={styles.input}
                      >
                        <option value="">Select Shop</option>
                        {SHOP_OPTIONS.map((shop) => (
                          <option key={shop} value={shop}>
                            {shop}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Mode of Payment *</label>
                      <select
                        value={formData.modeOfPayment}
                        onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                        style={styles.input}
                      >
                        <option value="">Select Payment Method</option>
                        {PAYMENT_OPTIONS.map((payment) => (
                          <option key={payment} value={payment}>
                            {payment}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Order Date *</label>
                      <input
                        type="date"
                        value={formData.orderDate}
                        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Row 5: Notes */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      style={styles.textarea}
                    />
                  </div>

                  {getDiscountedTotal() > 0 && (
                    <div style={styles.totalSection}>
                      <div style={styles.totalRow}>
                        <span>Total Amount:</span>
                        <span>{formatMoney(calculateSubtotal())}</span>
                      </div>
                      <div style={styles.totalRow}>
                        <span>After Discount:</span>
                        <span>{formatMoney(getDiscountedTotal())}</span>
                      </div>
                      <div style={styles.totalRow}>
                        <span>After Down Payment:</span>
                        <span>{formatMoney(getDiscountedTotal() - (Number(formData.downPayment) || 0))}</span>
                      </div>
                      <div style={{ ...styles.totalRow, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>Total Remaining:</span>
                        <span style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.1rem' }}>{formatMoney(getDiscountedTotal() - (Number(formData.downPayment) || 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
            </Modal>

            <Modal
              isOpen={detailsOpen}
              onClose={closeDetails}
              title={selectedOrder ? `Order Details - ${selectedOrder.jobOrderNo}` : ''}
              size="xlarge"
            >
                <div style={styles.detailsGrid}>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Client Name:</label>
                    <span>{selectedOrder?.clientName || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Team Name:</label>
                    <span>{selectedOrder?.teamName || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Shop:</label>
                    <span>{selectedOrder?.shop || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Payment Mode:</label>
                    <span>{selectedOrder?.modeOfPayment || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Order Date:</label>
                    <span>{selectedOrder?.orderDate || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <label style={styles.label}>Status:</label>
                    <span
                      style={{
                        color: getStatusColor(selectedOrder?.status),
                        fontWeight: 'bold',
                      }}
                    >
                      {getStatusLabel(selectedOrder?.status)}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
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
                      {(selectedOrder?.items || []).map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{item.productName}</td>
                          <td style={{ padding: '10px' }}>{formatMoney(item.unitPrice)}</td>
                          <td style={{ padding: '10px' }}>{item.quantity}</td>
                          <td style={{ padding: '10px' }}>{formatMoney(item.unitPrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <label style={styles.label}>Discount: {selectedOrder?.discount || 0}%</label>
                  </div>
                </div>

                <div style={styles.financialsSection}>
                  <h3>Financial Summary</h3>
                  {selectedOrder && (() => {
                    const financials = getOrderFinancials(selectedOrder);
                    const paidAmount = getRecordedPaidAmount(selectedOrder.jobOrderNo, selectedOrder.downPayment);
                    const remainingBalance = getRemainingBalance(selectedOrder);
                    return (
                      <>
                        <div style={styles.financialsGrid}>
                          <div>
                            <span style={styles.financialLabel}>Total Amount:</span>
                            <span>{formatMoney(financials.total)}</span>
                          </div>
                          <div>
                            <span style={styles.financialLabel}>After Discount:</span>
                            <span>{formatMoney(financials.afterDiscountTotal)}</span>
                          </div>
                          <div>
                            <span style={styles.financialLabel}>Total Paid:</span>
                            <span>{formatMoney(paidAmount)}</span>
                          </div>
                          <div>
                            <span style={styles.financialLabel}>Remaining Balance:</span>
                            <span>{formatMoney(remainingBalance)}</span>
                          </div>
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

                {(selectedOrder?.status === ORDER_STATUS.IN_PRODUCTION ||
                  selectedOrder?.status === ORDER_STATUS.NOT_YET_FULLY_PAID ||
                  selectedOrder?.status === ORDER_STATUS.FULLY_PAID) && (
                  <>
                    {(selectedOrder?.status === ORDER_STATUS.IN_PRODUCTION ||
                      selectedOrder?.status === ORDER_STATUS.NOT_YET_FULLY_PAID) && (
                      <div style={styles.statusActions}>
                        <p style={styles.statusPrompt}>Payment Update</p>
                        <div style={styles.formGroup}>
                          <input
                            type="number"
                            value={paymentUpdateAmount}
                            onChange={(e) => setPaymentUpdateAmount(e.target.value)}
                            placeholder="Input payment update"
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <input
                            type="text"
                            value={paymentCheckNumber}
                            onChange={(e) => setPaymentCheckNumber(e.target.value)}
                            placeholder="Check number (optional)"
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.modalActions}>
                          <button
                            onClick={handlePaymentUpdate}
                            style={{
                              ...styles.button,
                              ...styles.buttonPrimary,
                            }}
                          >
                            Save Payment Update
                          </button>
                          <button
                            onClick={handleFullPaymentYes}
                            style={{
                              ...styles.button,
                              ...styles.buttonSecondary,
                            }}
                          >
                            Mark Fully Paid
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Reference Number</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReferenceNumber(value);
                            setSelectedOrder((prev) =>
                              prev ? { ...prev, referenceNumber: value } : prev
                            );
                          }}
                          placeholder="Enter reference number"
                          readOnly={
                            selectedOrder?.status === ORDER_STATUS.FULLY_PAID &&
                            !isReferenceNumberEditing
                          }
                          style={{
                            ...styles.input,
                            ...(selectedOrder?.status === ORDER_STATUS.FULLY_PAID &&
                            !isReferenceNumberEditing
                              ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' }
                              : {}),
                          }}
                        />
                        {selectedOrder?.status === ORDER_STATUS.FULLY_PAID &&
                          !isReferenceNumberEditing && (
                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                ...styles.buttonSecondary,
                              }}
                              onClick={() => setIsReferenceNumberEditing(true)}
                            >
                              Edit
                            </button>
                          )}
                        {selectedOrder?.status === ORDER_STATUS.FULLY_PAID &&
                          isReferenceNumberEditing && (
                            <>
                              <button
                                type="button"
                                style={{
                                  ...styles.button,
                                  ...styles.buttonPrimary,
                                }}
                                onClick={handleSaveReferenceNumber}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                style={{
                                  ...styles.button,
                                  ...styles.buttonSecondary,
                                }}
                                onClick={handleCancelReferenceNumberEdit}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                      </div>
                    </div>
                    <div style={styles.notesSection}>
                      <label style={styles.label}>Remarks</label>
                      <textarea
                        value={manufacturingNotes}
                        onChange={(e) => {
                          const value = e.target.value;
                          setManufacturingNotes(value);
                          setSelectedOrder((prev) =>
                            prev ? { ...prev, remarks: value } : prev
                          );
                        }}
                        onBlur={handleRemarksBlur}
                        placeholder="Enter remarks or comments"
                        style={styles.notesTextarea}
                      />
                    </div>
                  </>
                )}

                {(selectedOrder?.status === ORDER_STATUS.FOR_CLIENT_APPROVAL ||
                  selectedOrder?.status === ORDER_STATUS.NOT_APPROVED ||
                  !selectedOrder?.status) && (
                  <div style={styles.statusActions}>
                    <p style={styles.statusPrompt}>For client approval</p>
                    <div style={styles.modalActions}>
                      <button
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.NOT_APPROVED)}
                        style={{
                          ...styles.button,
                          ...styles.buttonSecondary,
                        }}
                      >
                        Not Approved
                      </button>
                      <button
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.DOWN_PAYMENT_PENDING)}
                        style={{
                          ...styles.button,
                          ...styles.buttonPrimary,
                        }}
                      >
                        Approved
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder?.status === ORDER_STATUS.DOWN_PAYMENT_PENDING && (
                  <div style={styles.statusActions}>
                    <p style={styles.statusPrompt}>Deposit paid?</p>
                    <div style={styles.modalActions}>
                      <button
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.IN_PRODUCTION)}
                        style={{
                          ...styles.button,
                          ...styles.buttonPrimary,
                        }}
                      >
                        Deposit Paid  
                      </button>
                    </div>
                  </div>
                )}

                {(selectedOrder?.status === ORDER_STATUS.IN_PRODUCTION ||
                  selectedOrder?.status === ORDER_STATUS.NOT_YET_FULLY_PAID) && (
                  <div style={styles.statusActions}>
                    {selectedOrder?.status !== ORDER_STATUS.FULLY_PAID && (
                      <>
                        <p style={styles.statusPrompt}>Full Payment Complete?</p>
                        <div style={styles.modalActions}>
                          <button
                            onClick={() => updateSelectedOrderStatus(ORDER_STATUS.NOT_YET_FULLY_PAID)}
                            style={{
                              ...styles.button,
                              ...styles.buttonSecondary,
                            }}
                          >
                            Not Yet Fully Paid
                          </button>
                          <button
                            onClick={handleFullPaymentYes}
                            style={{
                              ...styles.button,
                              ...styles.buttonPrimary,
                            }}
                          >
                            Fully Paid
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedOrder?.status === ORDER_STATUS.FULLY_PAID && (
                  <div style={styles.successState}>
                    <p style={styles.statusPrompt}>This order is fully paid / completed.</p>
                  </div>
                )}

                <div style={styles.modalActions}>
                  <button
                    onClick={closeDetails}
                    style={{
                      ...styles.button,
                      ...styles.buttonSecondary,
                    }}
                  >
                    Close
                  </button>
                </div>
            </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    gap: '20px',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: '2em',
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '0.95em',
    color: '#666',
    margin: 0,
  },
  addButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.95em',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  searchSection: {
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px',
  },
  filterButton: {
    padding: '9px 14px',
    borderRadius: '999px',
    border: '1px solid #cfd8dc',
    backgroundColor: '#fff',
    color: '#455a64',
    cursor: 'pointer',
    fontSize: '0.88em',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#016667',
    borderColor: '#016667',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(1, 102, 103, 0.18)',
  },
  searchInput: {
    flex: 1,
    padding: '10px 15px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.95em',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontSize: '0.95em',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '20px',
    padding: '15px 0',
  },
  paginationButton: {
    padding: '8px 15px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.9em',
    transition: 'all 0.2s',
  },
  pageInfo: {
    color: '#666',
    fontSize: '0.9em',
  },
  modalContent: {
    padding: '30px',
    maxWidth: '65vw',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '1.5em',
    marginBottom: '20px',
    color: '#333',
  },
  formSection: {
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
    position: 'relative',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: '0.9em',
    display: 'block',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '0.9em',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontFamily: 'inherit',
    fontSize: '0.9em',
    minHeight: '80px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  autocompleteContainer: {
    position: 'relative',
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '150px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  suggestionItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.9em',
    borderBottom: '1px solid #f0f0f0',
  },
  hint: {
    color: '#999',
    fontSize: '0.85em',
    marginTop: '3px',
    display: 'block',
  },
  totalSection: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    borderLeft: '4px solid #2196F3',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '0.9em',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '15px',
    marginBottom: '25px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  financialsSection: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    borderLeft: '4px solid #2196F3',
  },
  financialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  financialLabel: {
    display: 'block',
    fontSize: '0.85em',
    color: '#666',
    marginBottom: '3px',
  },
  notesSection: {
    marginBottom: '20px',
  },
  notesTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontFamily: 'inherit',
    fontSize: '0.9em',
    minHeight: '80px',
    marginTop: '8px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  statusActions: {
    marginBottom: '20px',
  },
  statusPrompt: {
    margin: '0 0 12px',
    fontWeight: '600',
    color: '#444',
  },
  successState: {
    padding: '15px',
    backgroundColor: '#f1f8e9',
    borderLeft: '4px solid #4CAF50',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '15px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95em',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#FF9800',
    color: 'white',
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  buttonManufactured: {
    backgroundColor: '#2196F3',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
  },
};

export default CustomizedOrders;
