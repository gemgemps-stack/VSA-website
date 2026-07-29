import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import SectionIcon, { sectionIconBadgeStyle } from '../../components/SectionIcon';
import { useLocation } from 'react-router-dom';
import incomeService from '../../services/incomeService';
import customizedOrderService from '../../services/customizedOrderService';
import clientService from '../../services/clientService';
import authService from '../../services/authService';
import { getApiErrorMessage, isAuthOrPermissionError } from '../../utils/apiErrors';

const SHOP_OPTIONS = ['VSA Online Shop', 'Tiktok Shop', 'Shoppee', 'Verdida Sports Apparel'];
const PAYMENT_OPTIONS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Cheques'];

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

const PAYMENT_MODE_REQUIRED_STATUSES = new Set([
  ORDER_STATUS.DOWN_PAYMENT_PENDING,
  ORDER_STATUS.IN_PRODUCTION,
  ORDER_STATUS.NOT_YET_FULLY_PAID,
]);

const requiresModeOfPayment = (status) => PAYMENT_MODE_REQUIRED_STATUSES.has((status || '').toUpperCase());
const isChequePayment = (value) => (value || '').trim().toLowerCase() === 'cheques';
const isApprovalToDownPaymentPendingTransition = (currentStatus, nextStatus) =>
  (currentStatus || '').toUpperCase() === ORDER_STATUS.FOR_CLIENT_APPROVAL &&
  (nextStatus || '').toUpperCase() === ORDER_STATUS.DOWN_PAYMENT_PENDING;

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
  teamName: '',
  items: [{ productName: '', size: '', unitPrice: '', quantity: '' }],
  freebie: '',
  discount: '0',
  downPayment: '0',
  referenceNumber: '',
  checkNumber: '',
  shop: '',
  orderDate: new Date().toISOString().split('T')[0],
  modeOfPayment: '',
  notes: '',
});

const CustomizedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState('');
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('');
  const [paymentModeOfPayment, setPaymentModeOfPayment] = useState('');
  const [downPaymentAmount, setDownPaymentAmount] = useState('');
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [manufacturingNotes, setManufacturingNotes] = useState('');
  const [formData, setFormData] = useState(createInitialFormData());
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
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

  const resetPaymentInputFields = useCallback(() => {
    setReferenceNumber('');
    setPaymentCheckNumber('');
    setPaymentModeOfPayment('');
    setDownPaymentAmount('');
    setPaymentUpdateAmount('');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.matches && e.target.matches('input[type="number"]')) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    loadClients();
    loadIncomeEntries();
  }, [loadClients, loadIncomeEntries]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const populateOrderDetails = useCallback((order) => {
    if (!order) return;

    setSelectedOrder(order);
    setManufacturingNotes(order.remarks || '');
    setReferenceNumber(order.referenceNumber || '');
    setPaymentUpdateAmount('');
    setPaymentCheckNumber('');
    setPaymentModeOfPayment(order.modeOfPayment || '');
    setDownPaymentAmount('');
    setDetailsOpen(true);
  }, []);

  useEffect(() => {
    if (selectedOrder?.status === ORDER_STATUS.DOWN_PAYMENT_PENDING) {
      setDownPaymentAmount('');
      setReferenceNumber('');
      setPaymentCheckNumber('');
    }
  }, [selectedOrder?.id, selectedOrder?.status]);

  useEffect(() => {
    const targetJobOrderNo = location.state?.jobOrderNo;
    const shouldOpenDetails = location.state?.openDetails !== false;
    if (!targetJobOrderNo || !shouldOpenDetails || openedCreditJobOrderRef.current === targetJobOrderNo) {
      return;
    }

    const targetOrder = orders.find((order) => order.jobOrderNo === targetJobOrderNo);
    if (targetOrder) {
      openedCreditJobOrderRef.current = targetJobOrderNo;
      populateOrderDetails(targetOrder);
      return;
    }

    let cancelled = false;

    const loadTargetOrder = async () => {
      try {
        const response = await customizedOrderService.getOrderByJobOrderNo(targetJobOrderNo);
        const fetchedOrder = response?.data;
        if (!cancelled && fetchedOrder) {
          openedCreditJobOrderRef.current = targetJobOrderNo;
          populateOrderDetails(fetchedOrder);
        }
      } catch (error) {
        console.error(`Error loading customized order ${targetJobOrderNo} for details redirect:`, error);
      }
    };

    loadTargetOrder();

    return () => {
      cancelled = true;
    };
  }, [location.state, orders, populateOrderDetails]);

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

  const getStoredOrderPaymentMethod = useCallback((order) => {
    if (!order?.jobOrderNo) return '';

    const paymentEntry = incomeEntries.find((entry) => {
      if (entry.jobOrderNo !== order.jobOrderNo) {
        return false;
      }
      const category = String(entry.paymentCategory || '').toUpperCase();
      return category === 'DOWN_PAYMENT' || category === 'FULL_PAYMENT' || category === 'PAYMENT_UPDATE';
    });

    return paymentEntry?.paymentMethod || '';
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

  const summaryCards = [
    {
      label: 'Open Manufacturing Orders',
      value: filteredOrders.filter((order) => ![ORDER_STATUS.FULLY_PAID, ORDER_STATUS.CANCELLED].includes((order.status || '').toUpperCase())).length,
      accent: '#0f766e',
    },
    {
      label: 'Awaiting Approval',
      value: filteredOrders.filter((order) => (order.status || '').toUpperCase() === ORDER_STATUS.FOR_CLIENT_APPROVAL).length,
      accent: '#2563eb',
    },
  ];

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

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productName: '', size: '', unitPrice: '', quantity: '' }],
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
      // Prevent negative quantities
      if (field === 'quantity') {
        if (value === '') {
          newItems[index] = { ...newItems[index], [field]: '' };
        } else {
          const n = Number.parseInt(value, 10);
          newItems[index] = { ...newItems[index], [field]: Number.isFinite(n) ? String(Math.max(0, n)) : newItems[index][field] };
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
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
      setFormData({ ...formData, downPayment: value, referenceNumber: '', checkNumber: '' });
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
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingOrder(null);
    setFormData(createInitialFormData());
    setClientSearch('');
    setClientSuggestionsOpen(false);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      clientId: order?.clientId || null,
      teamName: order?.teamName || '',
      items: (order?.items || []).map(item => ({
        id: item.id,
        productName: item.productName || '',
        size: item.size || '',
        unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
        quantity: item.quantity != null ? String(item.quantity) : '',
      })),
      freebie: order?.freebie || '',
      discount: order?.discount != null ? String(order.discount) : '0',
      downPayment: order?.downPayment != null ? String(order.downPayment) : '0',
      shop: order?.shop || '',
      orderDate: order?.orderDate || new Date().toISOString().split('T')[0],
      modeOfPayment: order?.modeOfPayment || '',
      notes: order?.remarks || '',
    });
    if (order?.items?.length === 0) {
      setFormData(prev => ({ ...prev, items: [{ productName: '', size: '', unitPrice: '', quantity: '' }] }));
    }
    setClientSearch(order?.clientName || '');
    setClientSuggestionsOpen(false);
    setModalOpen(true);
  };

  const handleView = (order) => {
    populateOrderDetails(order);
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

      const discount = Number(formData.discount || 0);
      const downPaymentAmount = Number(formData.downPayment || 0);
      const discountedTotal = getDiscountedTotal();

      // Validate non-negative discount and quantities
      if (discount < 0) {
        alert('Discount cannot be less than zero.');
        return;
      }

      const negativeQty = formData.items.find(item => Number(item.quantity) < 0);
      if (negativeQty) {
        alert('Item quantity cannot be less than zero.');
        return;
      }

      if (downPaymentAmount > discountedTotal) {
        alert(`Down payment cannot exceed the total discounted amount (${discountedTotal.toFixed(2)}).`);
        return;
      }
      const statusToSave = editingOrder?.status || ORDER_STATUS.FOR_CLIENT_APPROVAL;
      const selectedModeOfPayment = formData.modeOfPayment.trim();
      if (downPaymentAmount > 0 && !selectedModeOfPayment) {
        alert('Please select a mode of payment.');
        return;
      }
      const trimmedReferenceNumber = formData.referenceNumber.trim();
      const trimmedCheckNumber = formData.checkNumber.trim();
      if (downPaymentAmount > 0 && !trimmedReferenceNumber) {
        alert('Please provide a Reference Number.');
        return;
      }
      if (downPaymentAmount > 0 && isChequePayment(selectedModeOfPayment) && !trimmedCheckNumber) {
        alert('Please provide a Check Number for cheque payments.');
        return;
      }

      const payload = {
        clientId: formData.clientId || null,
        clientName: clientSearch.trim(),
        teamName: formData.teamName.trim() || null,
        items: formData.items.map(item => ({
          id: item.id,
          productName: item.productName.trim(),
          size: item.size || null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })),
        discount: Number.isFinite(discount) ? discount : 0,
        downPayment: Number.isFinite(downPaymentAmount) ? downPaymentAmount : 0,
        referenceNumber: trimmedReferenceNumber || null,
        checkNumber: isChequePayment(selectedModeOfPayment) ? trimmedCheckNumber || null : null,
        shop: formData.shop.trim() || null,
        orderDate: formData.orderDate,
        modeOfPayment: Number.isFinite(downPaymentAmount) && downPaymentAmount > 0
          ? selectedModeOfPayment
          : null,
        remarks: formData.notes.trim() || null,
        freebie: formData.freebie.trim() || null,
        status: statusToSave,
      };

      await authService.refreshCsrfToken().catch(() => {});

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

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
    setManufacturingNotes('');
    resetPaymentInputFields();
    openedCreditJobOrderRef.current = null;
  };

  const buildOrderPayload = (order, statusOverride) => ({
    clientId: order.clientId,
    clientName: order.clientName || null,
    teamName: order.teamName || null,
    items: (order.items || []).map(item => ({
      id: item.id,
      productName: item.productName,
      size: item.size || null,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
    freebie: order.freebie || null,
    discount: Number(order.discount || 0),
    downPayment: Number(order.downPayment || 0),
    shop: order.shop,
    orderDate: order.orderDate,
    modeOfPayment: paymentModeOfPayment.trim() || order.modeOfPayment || null,
    remarks: order.remarks || '',
    referenceNumber: referenceNumber.trim() || null,
    status: statusOverride || order.status || ORDER_STATUS.FOR_CLIENT_APPROVAL,
  });

  const updateSelectedOrderStatus = async (newStatus, options = {}) => {
    if (!selectedOrder) {
      return;
    }

    const { skipModeValidation = false } = options;
    const previousStatus = selectedOrder.status;
    const effectiveModeOfPayment =
      paymentModeOfPayment.trim() ||
      selectedOrder.modeOfPayment ||
      getStoredOrderPaymentMethod(selectedOrder) ||
      '';
    if (requiresModeOfPayment(newStatus) && !effectiveModeOfPayment && !skipModeValidation && !isApprovalToDownPaymentPendingTransition(selectedOrder.status, newStatus)) {
      alert('Please select a mode of payment before changing the order to this status.');
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
      if (previousStatus !== newStatus) {
        alert(`Order's status changed to "${getStatusLabel(newStatus)}".`);
      }

      resetPaymentInputFields();
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

  const handlePaymentUpdate = async () => {
    if (!selectedOrder) {
      return;
    }

    const amount = Number(paymentUpdateAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid payment update amount.');
      return;
    }

    const remainingBalance = getRemainingBalance(selectedOrder);
    if (amount > remainingBalance) {
      alert(`Payment update cannot exceed the remaining balance of ${formatMoney(remainingBalance)}.`);
      return;
    }

    const trimmedReferenceNumber = referenceNumber.trim();
    const trimmedCheckNumber = paymentCheckNumber.trim();
    const effectiveModeOfPayment =
      paymentModeOfPayment.trim() ||
      selectedOrder.modeOfPayment ||
      getStoredOrderPaymentMethod(selectedOrder) ||
      '';
    if (!trimmedReferenceNumber) {
      alert('Please provide a Reference Number.');
      return;
    }
    if (isChequePayment(effectiveModeOfPayment) && !trimmedCheckNumber) {
      alert('Please provide a Check Number for cheque payments.');
      return;
    }

    try {
      if (!effectiveModeOfPayment) {
        alert('Please select a mode of payment before recording this payment.');
        return;
      }

      await customizedOrderService.applyPaymentUpdate(selectedOrder.id, {
        amount,
        checkNumber: trimmedCheckNumber || null,
        referenceNumber: trimmedReferenceNumber || null,
        modeOfPayment: effectiveModeOfPayment,
        remarks: manufacturingNotes.trim() || null,
      });

      const nextStatus = (selectedOrder.status === ORDER_STATUS.IN_PRODUCTION || selectedOrder.status === ORDER_STATUS.NOT_YET_FULLY_PAID)
        && Math.abs((remainingBalance - amount)) <= 0.01
        ? ORDER_STATUS.FULLY_PAID
        : null;

      if (nextStatus) {
        await updateSelectedOrderStatus(nextStatus, { skipModeValidation: true });
      } else {
        alert('Payment saved successfully.');
      }

      resetPaymentInputFields();
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

  const handleDownPaymentPaid = async () => {
    if (!selectedOrder) {
      return;
    }

    const remainingBalance = getRemainingBalance(selectedOrder);
    const existingDownPayment = Number(selectedOrder.downPayment || 0);
    const enteredAmount = Number(downPaymentAmount || 0);
    const hasNewDownPayment = Number.isFinite(enteredAmount) && enteredAmount > 0;
    const hasRecordedInitialPayment = getOrderPaymentHistory(selectedOrder).length > 0 || existingDownPayment > 0;

    if (!hasNewDownPayment && !hasRecordedInitialPayment) {
      alert('Cannot proceed. Please enter a down payment amount.');
      return;
    }

    if (enteredAmount > remainingBalance) {
      alert(`Down payment cannot exceed the remaining balance of ${formatMoney(remainingBalance)}.`);
      return;
    }

    try {
      const effectiveModeOfPayment =
        paymentModeOfPayment.trim() ||
        selectedOrder.modeOfPayment ||
        getStoredOrderPaymentMethod(selectedOrder) ||
        '';
      if (hasNewDownPayment && !effectiveModeOfPayment) {
        alert('Please select a mode of payment before recording this down payment.');
        return;
      }

      if (hasNewDownPayment) {
        if (!referenceNumber.trim()) {
          alert('Please provide a Reference Number.');
          return;
        }
        if (isChequePayment(effectiveModeOfPayment) && !paymentCheckNumber.trim()) {
          alert('Please provide a Check Number for cheque payments.');
          return;
        }
        await customizedOrderService.applyPaymentUpdate(selectedOrder.id, {
          amount: enteredAmount,
          checkNumber: paymentCheckNumber.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          modeOfPayment: effectiveModeOfPayment,
          remarks: manufacturingNotes.trim() || null,
        });
        alert('Down payment saved successfully.');
      }

      const nextStatus = hasNewDownPayment && Math.abs(enteredAmount - remainingBalance) < 0.01
        ? ORDER_STATUS.FULLY_PAID
        : ORDER_STATUS.IN_PRODUCTION;

      await updateSelectedOrderStatus(nextStatus, {
        skipModeValidation: !hasNewDownPayment && hasRecordedInitialPayment,
      });
      resetPaymentInputFields();
      loadIncomeEntries();
    } catch (error) {
      console.error('Error recording down payment:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to record down payment: ${apiMessage}`);
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

  const columns = [
    { key: 'jobOrderNo', label: 'Job Order No' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'teamName', label: 'Team Name' },
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
        <style>{`input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type="number"] { -moz-appearance: textfield; }`}</style>
        <div style={styles.container}>
          <div style={styles.heroCard}>
            <div style={styles.heroContent}>
              <div>
                <span style={sectionIconBadgeStyle} aria-hidden="true">
                  <SectionIcon variant="customized" />
                </span>
                <div style={styles.eyebrow}>Manufacturing</div>
                <h1 style={styles.title}>Customized Orders</h1>
                <p style={styles.subtitle}>Keep production workstreams, approvals, and payments organized across every customized order.</p>
              </div>
              <button onClick={handleOpenAddModal} style={{ ...styles.addButton }}>
                + New Customized Order
              </button>
            </div>

            <div style={styles.statsGrid}>
              {summaryCards.map((card) => (
                <div key={card.label} style={{ ...styles.statCard, borderTop: `4px solid ${card.accent}` }}>
                  <span style={styles.statLabel}>{card.label}</span>
                  <strong style={styles.statValue}>{card.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.searchSection}>
            <div style={styles.searchInputWrap}>
              <span style={styles.searchIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" style={styles.searchIconSvg} focusable="false">
                  <circle cx="10.5" cy="10.5" r="6.25" />
                  <path d="M15.25 15.25L20 20" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by job order, client, product, or status"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ ...styles.searchInput, border: 'none', boxShadow: 'none', padding: '0' }}
              />
            </div>
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

          <div style={styles.tableCard}>
            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingDot} />
                <p style={styles.loadingText}>Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <h3 style={styles.emptyTitle}>No customized orders available for manufacturing</h3>
                <p style={styles.emptyText}>Try broadening the search or switching filters to see more records.</p>
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
              </>
            )}
          </div>

          <Modal
            isOpen={modalOpen}
            title={editingOrder ? 'Edit Customized Order' : 'Add Customized Order'}
            onClose={handleCloseModal}
            onSubmit={handleSubmitOrder}
            submitText={editingOrder ? 'Update Order' : 'Create Order'}
            size="medium"
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
                      <label style={styles.label}>Team Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter team name"
                        value={formData.teamName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, teamName: e.target.value }))}
                        style={styles.input}
                        autoComplete="off"
                      />
                    </div>
                  </div>

	                  {/* Dynamic Product Items */}
	                  {formData.items.map((item, index) => (
	                    <div key={index} style={{ ...styles.formGrid, gridTemplateColumns: '47% 10% 13% 8% 15% 4%', gap: '10px', alignItems: 'end', marginBottom: '10px' }}>
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
	                        <label style={styles.label}>{index === 0 ? 'Size' : ''}</label>
	                        <select
	                          value={item.size}
	                          onChange={(e) => handleItemChange(index, 'size', e.target.value)}
	                          style={styles.input}
	                        >
	                          <option value="">N/A</option>
	                          <option value="Small">Small</option>
	                          <option value="Medium">Medium</option>
	                          <option value="Large">Large</option>
	                          <option value="XL">XL</option>
	                          <option value="XXL">XXL</option>
	                          <option value="XXXL">XXXL</option>
	                        </select>
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
	                          onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
	                        />
	                      </div>
	
                        <div style={styles.formGroup}>
                          <label style={styles.label}>{index === 0 ? 'Qty *' : ''}</label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            placeholder="0"
                            style={styles.input}
                            onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
                            &times;
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
                        min="0"
                        value={formData.discount}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') {
                            setFormData({ ...formData, discount: v });
                            return;
                          }
                          const n = Number.parseFloat(v);
                          if (!Number.isFinite(n)) return;
                          setFormData({ ...formData, discount: String(Math.max(0, n)) });
                        }}
                        onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
                        min="0"
                        style={styles.input}
                        onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
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

              {(Number(formData.downPayment || 0) > 0 || requiresModeOfPayment(editingOrder?.status || ORDER_STATUS.FOR_CLIENT_APPROVAL)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Mode of Payment</label>
                    <select
                      value={formData.modeOfPayment}
                      onChange={(e) => {
                        const nextMode = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          modeOfPayment: nextMode,
                          checkNumber: isChequePayment(nextMode) ? prev.checkNumber : '',
                        }));
                      }}
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
                  <div style={{ ...styles.formGrid, gridTemplateColumns: isChequePayment(formData.modeOfPayment) ? '1fr 1fr' : '1fr', gap: '10px' }}>
                    {isChequePayment(formData.modeOfPayment) && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Check Number</label>
                        <input
                          type="text"
                          value={formData.checkNumber}
                          onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                          placeholder="Enter check number"
                          style={styles.input}
                        />
                      </div>
                    )}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Reference Number</label>
                      <input
                        type="text"
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        placeholder="Enter reference number"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )}

                  {/* Row 4: Shop and Order Date */}
                  <div style={{ ...styles.formGrid, gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
              size="finance"
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '36%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Product Name</th>
                        <th style={{ padding: '10px' }}>Size</th>
                        <th style={{ padding: '10px' }}>Unit Price</th>
                        <th style={{ padding: '10px' }}>Quantity</th>
                        <th style={{ padding: '10px' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder?.items || []).map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{item.productName}</td>
                          <td style={{ padding: '10px' }}>{item.size || '-'}</td>
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

                <div style={{ marginBottom: '15px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const order = selectedOrder;
                      if (!order) return;
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <html>
                        <head><title>Order ${order.jobOrderNo || ''}</title>
                        <style>
                          body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 30px; color: #334155; }
                          h2 { margin: 0 0 5px 0; }
                          .header-info { margin-bottom: 20px; }
                          .header-info p { margin: 4px 0; }
                          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                          th { background: #f8fafc; }
                        </style>
                        </head>
                        <body>
                          <h2>Order ${order.jobOrderNo || ''}</h2>
                          <div class="header-info">
                            <p><strong>Client Name:</strong> ${order.clientName || '-'}</p>
                            <p><strong>Team Name:</strong> ${order.teamName || '-'}</p>
                            <p><strong>Shop:</strong> ${order.shop || '-'}</p>
                            <p><strong>Order Date:</strong> ${order.orderDate || '-'}</p>
                          </div>
                          <table>
                            <thead>
                              <tr><th>Product Name</th><th>Size</th><th>Quantity</th></tr>
                            </thead>
                            <tbody>
                              ${(order.items || []).map(item => '<tr><td>' + (item.productName || '-') + '</td><td>' + (item.size || '-') + '</td><td>' + (item.quantity || 0) + '</td></tr>').join('')}
                            </tbody>
                          </table>
                        </body></html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: '#1976d2',
                      color: 'white',
                      padding: '8px 16px',
                      marginBottom: '10px',
                    }}
                  >
                    Print Order
                  </button>
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
                                    <span style={styles.financialLabel}>
                                      Mode of Payment: {payment.paymentMethod || 'N/A'}
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
                      <div style={styles.paymentUpdateCard}>
                        <h4 style={styles.paymentUpdateTitle}>Payment Update</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={styles.formGroup}>
                            <input
                              type="number"
                              value={paymentUpdateAmount}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                if (rawValue === '') {
                                  setPaymentUpdateAmount('');
                                  return;
                                }
                                const amount = Number(rawValue);
                                const remainingBalance = selectedOrder ? getRemainingBalance(selectedOrder) : 0;
                                if (!Number.isFinite(amount) || amount < 0) return;
                                setPaymentUpdateAmount(String(Math.min(amount, remainingBalance)));
                              }}
                              onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              placeholder="Input payment update"
                              style={styles.input}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <select
                              value={paymentModeOfPayment}
                              onChange={(e) => {
                                const nextMode = e.target.value;
                                setPaymentModeOfPayment(nextMode);
                                if (!isChequePayment(nextMode)) {
                                  setPaymentCheckNumber('');
                                }
                              }}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {isChequePayment(paymentModeOfPayment) && (
                              <div style={styles.formGroup}>
                                <p style={styles.statusPrompt}>Check Number</p>
                                <input
                                  type="text"
                                  value={paymentCheckNumber}
                                  onChange={(e) => setPaymentCheckNumber(e.target.value)}
                                  placeholder="Enter Check Number"
                                  style={styles.input}
                                />
                              </div>
                            )}
                            <div style={styles.formGroup}>
                              <p style={styles.statusPrompt}>Reference Number</p>
                              <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="Enter Reference Number"
                                style={styles.input}
                              />
                            </div>
                          </div>
                          <div style={styles.formGroup}>
                            <textarea
                              style={styles.textarea}
                              placeholder="Enter Remarks"
                              value={manufacturingNotes}
                              onChange={(e) => setManufacturingNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={styles.paymentUpdateActions}>
                          <button
                            onClick={handlePaymentUpdate}
                            style={{
                              ...styles.button,
                              ...styles.buttonPrimary,
                              width: '100%',
                            }}
                          >
                            Save Payment Update
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedOrder?.status === ORDER_STATUS.FULLY_PAID && (
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
                    )}
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
                    <div style={{ width: '60%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Enter Down Payment Amount</label>
                        <input
                          type="number"
                          value={downPaymentAmount}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === '') {
                              setDownPaymentAmount('');
                              return;
                            }
                            const numValue = Number(rawValue);
                            const remainingBalance = selectedOrder ? getRemainingBalance(selectedOrder) : 0;
                            if (!Number.isFinite(numValue) || numValue < 0) return;
                            setDownPaymentAmount(String(Math.min(numValue, remainingBalance)));
                          }}
                          onWheelCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          placeholder="0"
                          min="0"
                          style={styles.input}
                        />
                      </div>
                      {(Number(downPaymentAmount) > 0) && (
                        <>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Mode of Payment</label>
                            <select
                              value={paymentModeOfPayment}
                              onChange={(e) => {
                                const nextMode = e.target.value;
                                setPaymentModeOfPayment(nextMode);
                                if (!isChequePayment(nextMode)) {
                                  setPaymentCheckNumber('');
                                }
                              }}
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
                          {isChequePayment(paymentModeOfPayment) && (
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Check Number</label>
                              <input
                                type="text"
                                value={paymentCheckNumber}
                                onChange={(e) => setPaymentCheckNumber(e.target.value)}
                                placeholder="Enter check number"
                                style={styles.input}
                              />
                            </div>
                          )}
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Reference Number</label>
                            <input
                              type="text"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                              placeholder="Enter reference number"
                              style={styles.input}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <p style={styles.statusPrompt}>Down Payment Paid?</p>
                    <div style={styles.modalActions}>
                      <button
                        onClick={handleDownPaymentPaid}
                        style={{
                          ...styles.button,
                          ...styles.buttonPrimary,
                        }}
                      >
                        Down Payment Paid
                      </button>
                    </div>
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
    padding: '24px',
    maxWidth: '1320px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  heroCard: {
    background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)',
    border: '1px solid #dbeafe',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 10px 35px rgba(15, 23, 42, 0.06)',
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontSize: '0.72rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#2563eb',
    fontWeight: '700',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.85rem',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0,
    maxWidth: '720px',
    lineHeight: 1.5,
  },
  addButton: {
    padding: '10px 20px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#0f766e',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.95em',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    boxShadow: '0 8px 20px rgba(15, 118, 110, 0.18)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(210px, 240px))',
    gap: '12px',
    justifyContent: 'flex-start',
  },
  statCard: {
    background: '#fff',
    borderRadius: '14px',
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    minWidth: 0,
  },
  statLabel: {
    display: 'block',
    fontSize: '0.78rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
  },
  statValue: {
    fontSize: '1.3rem',
    color: '#0f172a',
  },
  searchSection: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #dbe4ee',
    borderRadius: '18px',
    padding: '14px 16px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  searchInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  searchIcon: {
    width: '18px',
    height: '18px',
    flex: '0 0 auto',
    color: '#94a3b8',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconSvg: {
    width: '18px',
    height: '18px',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  filterButton: {
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid #dbe2ea',
    backgroundColor: '#fff',
    color: '#475569',
    cursor: 'pointer',
    fontSize: '0.85em',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
    color: '#fff',
    boxShadow: '0 8px 20px rgba(15, 118, 110, 0.18)',
  },
  searchInput: {
    flex: 1,
    padding: '2px 0',
    borderRadius: 0,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '0.98rem',
    color: '#0f172a',
    boxShadow: 'none',
  },
  tableCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '18px',
    boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '220px',
    color: '#64748b',
  },
  loadingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
  },
  loadingText: {
    margin: 0,
    fontSize: '0.95rem',
  },
  emptyState: {
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#64748b',
    gap: '8px',
  },
  emptyTitle: {
    margin: 0,
    color: '#334155',
    fontSize: '1rem',
  },
  emptyText: {
    margin: 0,
    fontSize: '0.9rem',
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
    borderRadius: '999px',
    border: '1px solid #dbe2ea',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.9em',
    transition: 'all 0.2s',
    color: '#334155',
  },
  pageInfo: {
    color: '#475569',
    fontSize: '0.9em',
  },
  modalContent: {
    padding: '30px',
    maxWidth: '65vw',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '1.45rem',
    marginBottom: '20px',
    color: '#0f172a',
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
    fontWeight: '600',
    color: '#334155',
    fontSize: '0.9em',
    display: 'block',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d8e0e8',
    backgroundColor: '#fff',
    fontSize: '0.95em',
    color: '#0f172a',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    appearance: 'textfield',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d8e0e8',
    fontFamily: 'inherit',
    fontSize: '0.95em',
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
    border: '1px solid #d8e0e8',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    maxHeight: '150px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
  },
  suggestionItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '0.92em',
    borderBottom: '1px solid #f1f5f9',
  },
  hint: {
    color: '#64748b',
    fontSize: '0.85em',
    marginTop: '5px',
    display: 'block',
  },
  totalSection: {
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    borderLeft: '4px solid #0f766e',
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
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    borderLeft: '4px solid #0f766e',
  },
  financialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '10px',
  },
  financialLabel: {
    display: 'block',
    fontSize: '0.85em',
    color: '#64748b',
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
  paymentUpdateCard: {
    marginTop: '20px',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '15px',
    border: '1px solid #dbe2ea',
    borderRadius: '12px',
    backgroundColor: '#fff',
    width: '50%',
    minWidth: '360px',
    boxSizing: 'border-box',
  },
  paymentUpdateTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.1rem',
    color: '#0f172a',
  },
  statusPrompt: {
    margin: '0 0 12px',
    fontWeight: '600',
    color: '#334155',
  },
  paymentUpdateActions: {
    marginTop: '10px',
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
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95em',
    fontWeight: '500',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease',
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
