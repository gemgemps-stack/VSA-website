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
import { generateLiquidationReferenceNumber } from './liquidationUtils';

const PAYMENT_METHODS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit', 'Cheques'];
const LIQUIDATION_CATEGORY = 'LIQUIDATION';
const LIQUIDATION_PAYMENT_METHOD = 'Liquidation';
const LIQUIDATION_SHOP_TYPE = 'Finance';
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

const formatMoney = (value) => `PHP ${(Number(value) || 0).toFixed(2)}`;
const getIncomeAmount = (entry) => Number.parseFloat(entry.amount) || 0;
const toAscii = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, '?');
const escapePdfText = (value) => toAscii(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');
const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const SourceIncome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [paymentData, setPaymentData] = useState({});
  const [loading, setLoading] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('WEEKLY');
  const [orderReferenceCache, setOrderReferenceCache] = useState({});
  const [creditOrders, setCreditOrders] = useState([]);
  const [selectedCreditOrder, setSelectedCreditOrder] = useState(null);
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [searchReferenceNumber, setSearchReferenceNumber] = useState('');
  const [chequeSearchNumber, setChequeSearchNumber] = useState('');
  const [liquidationModalOpen, setLiquidationModalOpen] = useState(false);
  const [liquidationAmount, setLiquidationAmount] = useState('');
  const [liquidationReason, setLiquidationReason] = useState('');
  const [liquidationDate, setLiquidationDate] = useState(new Date().toISOString().slice(0, 10));
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

  const getOrderItems = useCallback((order) => {
    if (Array.isArray(order?.items) && order.items.length > 0) {
      return order.items;
    }

    if (order?.orderRetail) {
      return [{
        id: order.id,
        productName: order.orderRetail,
        unitPrice: order.price,
        quantity: order.quantity,
      }];
    }

    return [];
  }, []);

  const getOrderTotal = useCallback((order) =>
    getOrderItems(order).reduce(
      (sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)),
      0,
    ), [getOrderItems]);

  const getPaymentLabel = useCallback((entry) =>
    entry.referenceNumber || entry.checkNumber || 'N/A', []);

  const getChequeLabel = useCallback((entry) =>
    entry.checkNumber || entry.referenceNumber || 'N/A', []);

  const isLiquidationEntry = useCallback((entry) => {
    if (!entry) return false;
    const paymentCategory = String(entry.paymentCategory || '').toUpperCase();
    const paymentMethod = String(entry.paymentMethod || '').trim().toLowerCase();
    return paymentCategory === LIQUIDATION_CATEGORY || paymentMethod === LIQUIDATION_PAYMENT_METHOD.toLowerCase();
  }, []);

  const getIncomeDate = useCallback((entry) => {
    const rawDate = entry.incomeDate || entry.createdAt;
    const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
    return Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
  }, []);

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
          .sort((a, b) => getIncomeDate(b) - getIncomeDate(a)), [incomeEntries, getIncomeDate]);

  const getIncomeEntriesByMethod = useCallback((method) =>
    incomeEntries
      .filter((entry) => (entry.paymentMethod || '').toLowerCase() === method.toLowerCase())
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a)), [incomeEntries, getIncomeDate]);

  const getOrderViewModel = useCallback((order, sourceType = '') => {
    if (!order) return null;

    const total = getOrderTotal(order);
    const discountPercent = Number(order.discount) || 0;
    const downPayment = Number(order.downPayment) || 0;
    const afterDiscountTotal = total * (1 - discountPercent / 100);
    const paidAmount = incomeEntries
      .filter((entry) => entry.jobOrderNo === order.jobOrderNo)
      .reduce((sum, entry) => sum + getIncomeAmount(entry), 0);
    const effectivePaidAmount = paidAmount > 0 ? paidAmount : downPayment;
    const remainingBalance = Math.max(0, afterDiscountTotal - effectivePaidAmount);

    return {
      ...order,
      sourceType,
      items: getOrderItems(order),
      total,
      afterDiscountTotal,
      paidAmount: effectivePaidAmount,
      remainingBalance,
    };
  }, [getOrderItems, getOrderTotal, incomeEntries]);

  const loadReceiptOrder = useCallback(async (jobOrderNo) => {
    const cachedOrder = creditOrders.find((order) => order.jobOrderNo === jobOrderNo);
    if (cachedOrder) {
      return getOrderViewModel(cachedOrder, cachedOrder.sourceType || '');
    }

    try {
      const customizedResponse = await customizedOrderService.getOrderByJobOrderNo(jobOrderNo);
      if (customizedResponse.data) {
        return getOrderViewModel(customizedResponse.data, 'Customized Order');
      }
    } catch (error) {
      // Fall through to inventory orders.
    }

    const orderResponse = await orderService.getOrderByJobOrderNo(jobOrderNo);
    if (orderResponse.data) {
      return getOrderViewModel(orderResponse.data, 'Inventory Order');
    }

    return null;
  }, [creditOrders, getOrderViewModel]);

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

  const getChequeEntries = useCallback(() => {
    return incomeEntries
      .filter((entry) => (entry.paymentMethod || '').toLowerCase() === 'cheques' || entry.checkNumber)
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a));
  }, [incomeEntries, getIncomeDate]);

  const filterChequeEntriesBySearch = useCallback((entries) => {
    if (!chequeSearchNumber.trim()) {
      return entries;
    }

    const searchTerm = chequeSearchNumber.toLowerCase().trim();
    return entries.filter((entry) => String(entry.checkNumber || '').toLowerCase().includes(searchTerm));
  }, [chequeSearchNumber]);

  const getTotalCheques = () =>
    getChequeEntries().reduce((total, entry) => total + getIncomeAmount(entry), 0);

  const getOrderFinancials = useCallback((order) => {
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
  }, [incomeEntries]);

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

  const openReceipt = useCallback(async (entry) => {
    if (isLiquidationEntry(entry)) {
      setReceiptTarget({ entry, order: null });
      setReceiptLoading(false);
      setReceiptError('');
      return;
    }

    if (!entry?.jobOrderNo) {
      setReceiptTarget(null);
      setReceiptError('No job order number is available for this transaction.');
      return;
    }

    setReceiptTarget({ entry, order: null });
    setReceiptLoading(true);
    setReceiptError('');

    try {
      const order = await loadReceiptOrder(entry.jobOrderNo);
      if (!order) {
        setReceiptError('No linked order could be found for this transaction.');
        setReceiptTarget({ entry, order: null });
        return;
      }

      setReceiptTarget({ entry, order });
    } catch (error) {
      console.error('Error loading receipt order:', error);
      setReceiptError('Unable to load the receipt for this transaction.');
      setReceiptTarget({ entry, order: null });
    } finally {
      setReceiptLoading(false);
    }
  }, [isLiquidationEntry, loadReceiptOrder]);

  const closeCreditDetails = () => {
    setSelectedCreditOrder(null);
  };

  const closeReceipt = () => {
    setReceiptTarget(null);
    setReceiptError('');
    setReceiptLoading(false);
  };

  const openLiquidationModal = () => {
    setLiquidationAmount('');
    setLiquidationReason('');
    setLiquidationDate(new Date().toISOString().slice(0, 10));
    setLiquidationModalOpen(true);
  };

  const getLiquidationReferenceNumber = useCallback((incomeDate) => generateLiquidationReferenceNumber(incomeEntries, incomeDate), [incomeEntries]);

  const closeLiquidationModal = () => {
    setLiquidationModalOpen(false);
  };

  const handleRecordLiquidation = async () => {
    const amount = Number(liquidationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid liquidation amount.');
      return;
    }

    if (!liquidationReason.trim()) {
      alert('Please enter a reason for the liquidation.');
      return;
    }

    try {
      const referenceNumber = getLiquidationReferenceNumber(liquidationDate);

      await incomeService.createIncomeSource({
        shopType: LIQUIDATION_SHOP_TYPE,
        paymentMethod: LIQUIDATION_PAYMENT_METHOD,
        incomeDate: liquidationDate,
        clientName: 'Liquidation Withdrawal',
        amount,
        paymentCategory: LIQUIDATION_CATEGORY,
        remarks: liquidationReason.trim(),
        referenceNumber,
      });

      setLiquidationAmount('');
      setLiquidationReason('');
      setLiquidationDate(new Date().toISOString().slice(0, 10));
      setLiquidationModalOpen(false);
      await loadIncomeEntries();
      alert('Liquidation recorded successfully.');
    } catch (error) {
      console.error('Error recording liquidation:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to record liquidation: ${apiMessage}`);
    }
  };

  const filterEntriesByReferenceNumber = useCallback((entries) => {
    if (!searchReferenceNumber.trim()) {
      return entries;
    }

    const searchTerm = searchReferenceNumber.toLowerCase().trim();
    return entries.filter((entry) => {
      const referenceLabel = (entry.referenceNumber || getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || '').toLowerCase();
      const jobOrderNo = String(entry.jobOrderNo || '').toLowerCase();
      const checkNumber = String(entry.checkNumber || '').toLowerCase();
      const remarks = String(entry.remarks || '').toLowerCase();
      const paymentCategory = String(entry.paymentCategory || '').toLowerCase();
      const paymentMethod = String(entry.paymentMethod || '').toLowerCase();

      return (
        referenceLabel.includes(searchTerm) ||
        jobOrderNo.includes(searchTerm) ||
        checkNumber.includes(searchTerm) ||
        remarks.includes(searchTerm) ||
        paymentCategory.includes(searchTerm) ||
        paymentMethod.includes(searchTerm)
      );
    });
  }, [searchReferenceNumber, orderReferenceCache, getPaymentLabel]);

  const handleClearSearch = () => {
    setSearchReferenceNumber('');
  };

  const handleViewOrder = useCallback(async (jobOrderNo) => {
    if (!jobOrderNo) return;

    try {
      await customizedOrderService.getOrderByJobOrderNo(jobOrderNo);
      navigate('/customized-orders', { state: { jobOrderNo, openDetails: true } });
      return;
    } catch (customizedError) {
      console.debug('No customized order found for View Order redirect, falling back to inventory order:', customizedError);
    }

    navigate('/orders', { state: { jobOrderNo, openDetails: true } });
  }, [navigate]);

  const getReceiptNumber = useCallback((order, entry) => {
    if (!order || !entry) return 'N/A';

    const jobOrderPart = toAscii(order.jobOrderNo || 'NOJOB').replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'NOJOB';
    const entryPart = toAscii(entry.id || '').replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'ENTRY';
    return `RCP-${jobOrderPart}-${entryPart}`;
  }, []);

  const getReceiptDocumentData = useCallback(() => {
    const order = receiptTarget?.order;
    const entry = receiptTarget?.entry;

    if (!entry || receiptLoading || receiptError) {
      return null;
    }

    if (isLiquidationEntry(entry)) {
      return {
        order: null,
        entry,
        receiptNumber: entry.referenceNumber || 'N/A',
        receiptDate: entry.createdAt || entry.incomeDate,
      };
    }

    if (!order) {
      return null;
    }

    return {
      order: {
        ...order,
        items: getOrderItems(order),
      },
      entry,
      receiptNumber: getReceiptNumber(order, entry),
      receiptDate: entry.createdAt || entry.incomeDate || order.orderDate,
    };
  }, [getOrderItems, getReceiptNumber, isLiquidationEntry, receiptError, receiptLoading, receiptTarget]);

  const buildReceiptPdfLines = useCallback((data) => {
    if (!data) return [];

    const { order, entry, receiptDate, receiptNumber } = data;
    const lines = [
      'VERDIDA SPORTS APPAREL',
      'OFFICIAL FINANCE RECEIPT',
      '----------------------------------------',
      'Premium teamwear and custom apparel',
      '----------------------------------------',
      '',
      'BRAND SNAPSHOT',
      'VSA | Trusted by athletes, teams, and communities',
      '',
      `Receipt No.: ${receiptNumber || 'N/A'}`,
      `Job Order No.: ${order?.jobOrderNo || 'N/A'}`,
      `Receipt Date: ${receiptDate ? new Date(receiptDate).toLocaleString() : 'No date available'}`,
      `Source Type: ${order?.sourceType || 'Order'}`,
      `Shop: ${order?.shop || 'Unknown shop'}`,
      `Client: ${order?.clientName || 'Walk-in Client'}`,
      `Payment Method: ${order?.modeOfPayment || entry.paymentMethod || 'N/A'}`,
      `Reference Number: ${entry.referenceNumber || order?.referenceNumber || 'N/A'}`,
      `Payment Status: ${entry.checkNumber ? 'With Check' : 'Recorded Payment'}`,
      '',
      'Items',
    ];

    if (order?.items?.length > 0) {
      order.items.forEach((item) => {
        const subtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
        lines.push(
          `${item.productName || 'Unnamed item'} | ${formatMoney(item.unitPrice)} x ${item.quantity || 0} = ${formatMoney(subtotal)}`,
        );
      });
    } else {
      lines.push('No line items available.');
    }

    lines.push(
      '',
      `Total Amount: ${formatMoney(order?.total || 0)}`,
      `After Discount: ${formatMoney(order?.afterDiscountTotal || 0)}`,
      `Paid: ${formatMoney(order?.paidAmount || 0)}`,
      `Remaining Balance: ${formatMoney(order?.remainingBalance || 0)}`,
      '',
      'Transaction Entry',
      `Job Order No.: ${entry.jobOrderNo || 'N/A'}`,
      `Amount: ${formatMoney(entry.amount)}`,
      `Shop Type: ${entry.shopType || 'Unknown source'}`,
      `Payment Method: ${entry.paymentMethod || 'N/A'}`,
      '',
      'Notes',
      'Please keep this receipt for your records.',
      'Payments are subject to confirmation and accounting review.',
      'Thank you for supporting Verdida Sports Apparel.',
    );

    return lines.flatMap((line) => {
      const safeLine = toAscii(line);
      if (!safeLine) return [''];
      const maxChars = 88;
      const chunks = [];
      for (let i = 0; i < safeLine.length; i += maxChars) {
        chunks.push(safeLine.substring(i, i + maxChars));
      }
      return chunks;
    });
  }, []);

  const buildReceiptPdfBlob = useCallback((data) => {
    const lines = buildReceiptPdfLines(data);
    const content = lines.join('\n');

    const pdfTemplate = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj',
      '5 0 obj << /Length ' + (content.length + 100) + ' >> stream',
      'BT /F1 10 Tf 50 800 Td 12 TL',
    ];

    lines.forEach((line) => {
      pdfTemplate.push(`(${escapePdfText(line)}) Tj T*`);
    });

    pdfTemplate.push('ET endstream endobj', 'xref', '0 6', '0000000000 65535 f', '0000000010 00000 n', '0000000060 00000 n', '0000000115 00000 n', '0000000225 00000 n', '0000000290 00000 n', 'trailer << /Size 6 /Root 1 0 R >>', 'startxref', '450', '%%EOF');

    return new Blob([pdfTemplate.join('\n')], { type: 'application/pdf' });
  }, [buildReceiptPdfLines]);

  const handlePrintReceipt = useCallback(() => {
    const data = getReceiptDocumentData();
    if (!data) return;

    const lines = buildReceiptPdfLines(data);
    const receiptTitle = data.order?.jobOrderNo || data.entry?.referenceNumber || 'transaction';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receiptTitle}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; white-space: pre-wrap; line-height: 1.4; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${lines.join('\n')}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [buildReceiptPdfLines, getReceiptDocumentData]);

  const handleDownloadReceiptPdf = useCallback(() => {
    const data = getReceiptDocumentData();
    if (!data) {
      setReceiptError('Please open a receipt before downloading the PDF.');
      return;
    }

    const blob = buildReceiptPdfBlob(data);
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `receipt-${data.order?.jobOrderNo || data.entry?.referenceNumber || 'transaction'}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);
  }, [buildReceiptPdfBlob, getReceiptDocumentData]);

  const getReportEntries = (period) => {
    const range = getPeriodRange(period);

    return incomeEntries
      .filter((entry) => isWithinRange(getIncomeDate(entry), range))
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a));
  };

  const getSalesEntries = useCallback((entries) => entries.filter((entry) => !isLiquidationEntry(entry)), [isLiquidationEntry]);

  const getLiquidationEntries = useCallback((entries) => entries.filter((entry) => isLiquidationEntry(entry)), [isLiquidationEntry]);

  const getSalesTotal = useCallback((entries) => getSalesEntries(entries).reduce((total, entry) => total + getIncomeAmount(entry), 0), [getSalesEntries]);

  const getLiquidationTotal = useCallback((entries) => getLiquidationEntries(entries).reduce((total, entry) => total + getIncomeAmount(entry), 0), [getLiquidationEntries]);

  const getReportNetTotal = useCallback((entries) => getSalesTotal(entries) - getLiquidationTotal(entries), [getLiquidationTotal, getSalesTotal]);

  const buildFinanceReportSpreadsheet = useCallback((period, entries, salesTotal, liquidationTotal, netTotal) => {
    const range = getPeriodRange(period);
    const salesEntries = getSalesEntries(entries);
    const liquidationEntries = getLiquidationEntries(entries);
    const periodLabel = REPORT_PERIODS.find((item) => item.key === period)?.label || period;
    const salesColumns = ['Date', 'Type', 'Job Order No.', 'Reference Number', 'Check Number', 'Source/Method', 'Remarks', 'Amount'];
    const liquidationColumns = ['Date', 'Type', 'Remarks', 'Amount'];

    const row = (cells, styleId = 'sCell') => `<Row>${cells.map((cell) => `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ''}${cell.mergeAcross ? ` ss:MergeAcross="${cell.mergeAcross}"` : ''}><Data ss:Type="${cell.type || 'String'}">${escapeXml(cell.value)}</Data></Cell>`).join('')}</Row>`;
    const blankCell = (mergeAcross = 0) => ({ value: '', mergeAcross, type: 'String' });

    const buildTransactionRows = (transactionEntries, transactionType) => {
      if (transactionEntries.length === 0) {
        return [row([
          { value: `No ${transactionType.toLowerCase()} entries found for this period.`, mergeAcross: transactionType === 'LIQUIDATION' ? 3 : 7 },
        ], 'sNote')];
      }

      if (transactionType === 'LIQUIDATION') {
        return transactionEntries.map((entry) => {
          const amount = getIncomeAmount(entry);
          const date = getIncomeDate(entry).toLocaleDateString();
          const remarks = entry.remarks || 'No reason provided';

          return row([
            { value: date },
            { value: 'Liquidation' },
            { value: remarks },
            { value: amount, type: 'Number' },
          ]);
        });
      }

      return transactionEntries.map((entry) => {
        const amount = getIncomeAmount(entry);
        const date = getIncomeDate(entry).toLocaleDateString();
        const displayType = 'Sale';
        const referenceNumber = entry.referenceNumber || '';
        const checkNumber = entry.checkNumber || '';
        const sourceMethod = entry.shopType || entry.paymentMethod || 'N/A';
        const remarks = entry.remarks || '';

        return row([
          { value: date },
          { value: displayType },
          { value: entry.jobOrderNo || 'No Job Order' },
          { value: referenceNumber || 'N/A' },
          { value: checkNumber || 'N/A' },
          { value: sourceMethod },
          { value: remarks || '' },
          { value: amount, type: 'Number' },
        ]);
      });
    };

    const sheetRows = [
      row([{ value: 'VERDIDA SPORTS APPAREL', mergeAcross: 7 }], 'sTitle'),
      row([{ value: 'FINANCE REPORT', mergeAcross: 7 }], 'sHeading'),
      row([{ value: `Period: ${periodLabel}`, mergeAcross: 7 }], 'sMeta'),
      row([{ value: `Date Range: ${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`, mergeAcross: 7 }], 'sMeta'),
      row([blankCell(7)], 'sBlank'),
      row([{ value: 'SALES', mergeAcross: 7 }], 'sSection'),
      row(salesColumns.map((column) => ({ value: column })), 'sHeader'),
      ...buildTransactionRows(salesEntries, 'SALE'),
      row([blankCell(7)], 'sBlank'),
      row([{ value: 'LIQUIDATIONS', mergeAcross: 7 }], 'sSection'),
      row(liquidationColumns.map((column) => ({ value: column })), 'sHeader'),
      ...buildTransactionRows(liquidationEntries, 'LIQUIDATION'),
      row([blankCell(7)], 'sBlank'),
      row([{ value: 'Sales Total' }, blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), { value: salesTotal, type: 'Number' }], 'sTotal'),
      row([{ value: 'Liquidation Total' }, blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), { value: liquidationTotal, type: 'Number' }], 'sTotal'),
      row([{ value: 'Report Total' }, blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), { value: netTotal, type: 'Number' }], netTotal < 0 ? 'sTotalNegative' : 'sTotal'),
    ];

    const xmlRows = sheetRows
      .map((rowMarkup) => rowMarkup)
      .join('');

    const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="sTitle"><Font ss:Bold="1" ss:Size="14"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="sHeading"><Font ss:Bold="1" ss:Size="12"/><Alignment ss:Horizontal="Center"/></Style>
    <Style ss:ID="sMeta"><Font ss:Italic="1"/><Alignment ss:Horizontal="Left"/></Style>
    <Style ss:ID="sSection"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0B6E6B" ss:Pattern="Solid"/></Style>
    <Style ss:ID="sHeader"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF0" ss:Pattern="Solid"/><Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders></Style>
    <Style ss:ID="sCell"><Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders></Style>
    <Style ss:ID="sNote"><Font ss:Italic="1" ss:Color="#666666"/><Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders></Style>
    <Style ss:ID="sTotal"><Font ss:Bold="1"/><Interior ss:Color="#E9F5EE" ss:Pattern="Solid"/><Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders></Style>
    <Style ss:ID="sTotalNegative"><Font ss:Bold="1" ss:Color="#C62828"/><Interior ss:Color="#FDECEC" ss:Pattern="Solid"/><Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders></Style>
    <Style ss:ID="sBlank"/>
  </Styles>
  <Worksheet ss:Name="Finance Report">
    <Table>
      <Column ss:Width="85"/>
      <Column ss:Width="90"/>
      <Column ss:Width="105"/>
      <Column ss:Width="120"/>
      <Column ss:Width="105"/>
      <Column ss:Width="120"/>
      <Column ss:Width="150"/>
      <Column ss:Width="90"/>
      ${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return new Blob([workbookXml], { type: 'application/vnd.ms-excel' });
  }, [getIncomeDate, getLiquidationEntries, getSalesEntries]);

  const openDetails = (type, item) => {
    setDetailsTarget({ type, item });
    setChequeSearchNumber('');
  };

  const closeDetails = () => {
    setDetailsTarget(null);
    setChequeSearchNumber('');
  };

  const renderReceiptContent = () => {
    if (!receiptTarget) {
      return null;
    }

    const data = getReceiptDocumentData();

    if (!data) {
      return (
        <div className="income-details-modal">
          {receiptLoading && <p className="income-details-empty">Loading receipt...</p>}
          {receiptError && <p className="income-details-empty">{receiptError}</p>}
        </div>
      );
    }

    return (
      <div className="income-details-modal">
        <div className="income-details-summary">
          <div>
            <span className="income-details-label">Receipt No.</span>
            <strong>{data.receiptNumber}</strong>
          </div>
          <div>
            <span className="income-details-label">Date</span>
            <strong>{data.receiptDate ? new Date(data.receiptDate).toLocaleString() : 'No date available'}</strong>
          </div>
          <div>
            <span className="income-details-label">Job Order</span>
            <strong>{data.order?.jobOrderNo || 'N/A'}</strong>
          </div>
        </div>

        <div className="income-details-list">
          <div className="income-detail-row">
            <div>
              <strong>{data.order?.clientName || (isLiquidationEntry(data.entry) ? 'Liquidation Withdrawal' : 'Walk-in Client')}</strong>
              <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                {data.order?.shop || (isLiquidationEntry(data.entry) ? 'Finance' : 'Unknown shop')} • {data.order?.sourceType || (isLiquidationEntry(data.entry) ? 'Liquidation' : 'Order')}
              </div>
            </div>
            <strong>{formatMoney(data.entry?.amount)}</strong>
          </div>

          {data.order?.items?.length > 0 ? (
            data.order.items.map((item, index) => (
              <div key={`${item.productName || 'item'}-${index}`} className="income-detail-row">
                <div>
                  <strong>{item.productName || 'Unnamed item'}</strong>
                  <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                    {item.quantity || 0} × {formatMoney(item.unitPrice)}
                  </div>
                </div>
                <strong>{formatMoney((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0))}</strong>
              </div>
            ))
          ) : (
            <div className="income-details-empty">
              {isLiquidationEntry(data.entry)
                ? 'No order items available for this liquidation withdrawal.'
                : 'No line items available for this receipt.'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="income-details-btn" onClick={handlePrintReceipt}>
            Print Receipt
          </button>
          <button type="button" className="income-details-btn" onClick={handleDownloadReceiptPdf}>
            Download PDF
          </button>
        </div>
      </div>
    );
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
          <div
            className="income-details-summary"
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap', width: '100%' }}
          >
            <div style={{ flex: '0 0 36%' }}>
              <span className="income-details-label">Source</span>
              <strong>{source.label}</strong>
            </div>
            <div style={{ flex: '0 0 46%' }}>
              <span className="income-details-label">Total</span>
              <strong>PHP {total.toFixed(2)}</strong>
            </div>
            <div style={{ flex: '0 0 15%' }}>
              <span className="income-details-label">Entries</span>
              <strong>{filteredChequeEntries.length}</strong>
            </div>
          </div>

          <div className="order-search-bar" style={{ marginBottom: 0, maxWidth: '520px' }}>
            <input
              type="text"
              value={chequeSearchNumber}
              onChange={(e) => setChequeSearchNumber(e.target.value)}
              placeholder="Search by check number..."
            />
          </div>

          <h3 className="transaction-histories-title">Transaction Histories</h3>
          <div className="income-details-list transaction-histories-grid">
            {filteredChequeEntries.length > 0 ? (
              filteredChequeEntries.map((entry) => (
                <div key={entry.id} className="income-detail-row">
                  <div className="transaction-history-meta">
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Reference Number:</span>
                    <strong className="transaction-reference-number">
                      {getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                    </strong>
                    </div>
                    <span className="transaction-client-id">
                      {getIncomeDate(entry).toLocaleDateString()}
                    </span>
                    <span className="transaction-client-id">
                      {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                      {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="income-details-btn"
                        onClick={() => openReceipt(entry)}
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                      >
                        View Receipt
                      </button>
                      {entry.jobOrderNo && (
                        <button
                          type="button"
                          className="income-details-btn"
                          onClick={() => handleViewOrder(entry.jobOrderNo)}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          View Order
                        </button>
                      )}
                    </div>
                  </div>
                  <strong>
                    PHP {getIncomeAmount(entry).toFixed(2)}
                  </strong>
                </div>
              ))
            ) : (
              <p className="income-details-empty">No transaction history found for this source.</p>
            )}
          </div>
        </div>
      );
    }

    const method = detailsTarget.item;
    const isChequeMethod = method === 'Cheques';
    const entries = isChequeMethod ? getChequeEntries() : getIncomeEntriesByMethod(method);
    const total = isChequeMethod ? getTotalCheques() : getTotalByMethod(method);
    const filteredChequeEntries = isChequeMethod ? filterChequeEntriesBySearch(entries) : entries;

    if (method === 'Credit') {
      return (
        <div className="income-details-modal">
          <div
            className="income-details-summary credit-summary"
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap', width: '100%' }}
          >
            <div style={{ flex: '0 0 23%' }}>
              <span className="income-details-label">Payment Method</span>
              <strong>{method}</strong>
            </div>
            <div style={{ flex: '0 0 49%' }}>
              <span className="income-details-label">Outstanding Credit Balance</span>
              <strong>PHP {getTotalCredit().toFixed(2)}</strong>
            </div>
            <div style={{ flex: '0 0 25%' }}>
              <span className="income-details-label">Orders With Balance</span>
              <strong>{creditEntries.length}</strong>
            </div>
          </div>

          <h3 className="transaction-histories-title">Outstanding Credit Orders</h3>
          <div className="income-details-list transaction-histories-grid">
            {creditEntries.length > 0 ? (
              creditEntries.map((order) => (
                <div
                  key={`${order.sourceType}-${order.id}`}
                  className="income-detail-row"
                  onClick={() => openCreditDetails(order)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="transaction-history-meta">
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Job Order No.:</span>
                      <strong className="transaction-reference-number">{order.jobOrderNo}</strong>
                    </div>
                    <span className="transaction-client-id">{order.sourceType}</span>
                    <span className="transaction-client-id">{order.clientName || 'Walk-in Client'}</span>
                    <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                      {order.shop || 'Unknown shop'} - {order.orderDate || 'No date'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>PHP {order.remainingBalance.toFixed(2)}</strong>
                    <div style={{ fontSize: '12px', color: '#6e645a' }}>Click to view history</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="income-details-empty">No outstanding credit balances found.</p>
            )}
          </div>
        </div>
      );
    }

    if (isChequeMethod) {
      const filteredChequeTotal = filteredChequeEntries.reduce((sum, entry) => sum + getIncomeAmount(entry), 0);

      return (
        <div className="income-details-modal">
          <div
            className="income-details-summary"
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap', width: '100%' }}
          >
            <div style={{ flex: '0 0 29%' }}>
              <span className="income-details-label">Payment Method</span>
              <strong>{method}</strong>
            </div>
            <div style={{ flex: '0 0 53%' }}>
              <span className="income-details-label">Total Received</span>
              <strong>PHP {filteredChequeTotal.toFixed(2)}</strong>
            </div>
            <div style={{ flex: '0 0 15%' }}>
              <span className="income-details-label">Entries</span>
              <strong>{filteredChequeEntries.length}</strong>
            </div>
          </div>

          <h3 className="transaction-histories-title">Transaction Histories</h3>
          <div className="income-details-list transaction-histories-grid">
            {filteredChequeEntries.length > 0 ? (
              filteredChequeEntries.map((entry) => (
                <div key={entry.id} className="income-detail-row">
                  <div className="transaction-history-meta">
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Check Number:</span>
                      <strong className="transaction-reference-number">
                        {getChequeLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                      </strong>
                    </div>
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Reference Number:</span>
                      <strong className="transaction-reference-number">
                        {entry.referenceNumber || orderReferenceCache[entry.jobOrderNo] || 'N/A'}
                      </strong>
                    </div>
                    <span className="transaction-client-id">
                      {getIncomeDate(entry).toLocaleDateString()}
                    </span>
                    <span className="transaction-client-id">
                      {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                      {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="income-details-btn"
                        onClick={() => openReceipt(entry)}
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                      >
                        View Receipt
                      </button>
                      {entry.jobOrderNo && (
                        <button
                          type="button"
                          className="income-details-btn"
                          onClick={() => handleViewOrder(entry.jobOrderNo)}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          View Order
                        </button>
                      )}
                    </div>
                  </div>
                  <strong>
                    PHP {getIncomeAmount(entry).toFixed(2)}
                  </strong>
                </div>
              ))
            ) : (
              <p className="income-details-empty">
                {chequeSearchNumber
                  ? `No cheque entries found matching "${chequeSearchNumber}".`
                  : 'No transaction history found for this payment method.'}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="income-details-modal">
        <div
          className="income-details-summary"
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap', width: '100%' }}
        >
          <div style={{ flex: '0 0 29%' }}>
            <span className="income-details-label">Payment Method</span>
            <strong>{method}</strong>
          </div>
          <div style={{ flex: '0 0 53%' }}>
            <span className="income-details-label">Total Received</span>
            <strong>PHP {total.toFixed(2)}</strong>
          </div>
          <div style={{ flex: '0 0 15%' }}>
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
                    <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Check Number:</span>
                    <strong className="transaction-reference-number">
                      {getChequeLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                    </strong>
                  </div>
                  <span className="transaction-client-id">
                    {getIncomeDate(entry).toLocaleDateString()}
                  </span>
                  <span className="transaction-client-id">
                    {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                  </span>
                  <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                    {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                  </div>
                  <button
                    type="button"
                    className="income-details-btn"
                    onClick={() => openReceipt(entry)}
                    style={{ marginTop: '12px', padding: '8px 14px', fontSize: '12px' }}
                  >
                    View Receipt
                  </button>
                </div>
                <strong>
                  PHP {getIncomeAmount(entry).toFixed(2)}
                </strong>
              </div>
            ))
          ) : (
            <p className="income-details-empty">No transaction history found for this payment method.</p>
          )}
        </div>
      </div>
    );
  };

  const currentReportEntries = getReportEntries(reportPeriod);
  const currentReportRange = getPeriodRange(reportPeriod);
  const currentSalesTotal = getSalesTotal(currentReportEntries);
  const currentLiquidationTotal = getLiquidationTotal(currentReportEntries);
  const currentReportTotal = getReportNetTotal(currentReportEntries);
  const incomeReportingEntries = currentReportEntries.filter((entry) => !isLiquidationEntry(entry));
  const filteredIncomeReportingEntries = filterEntriesByReferenceNumber(incomeReportingEntries);
  const currentLiquidationEntries = getLiquidationEntries(currentReportEntries);
  const filteredLiquidationEntries = filterEntriesByReferenceNumber(currentLiquidationEntries);
  const filteredLiquidationTotal = getLiquidationTotal(filteredLiquidationEntries);
  const filteredReportTotal = currentSalesTotal - filteredLiquidationTotal;

  const handleDownloadFinanceReportExcel = useCallback(() => {
    const blob = buildFinanceReportSpreadsheet(
      reportPeriod,
      currentReportEntries,
      currentSalesTotal,
      currentLiquidationTotal,
      currentReportTotal,
    );

    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `finance-report-${reportPeriod.toLowerCase()}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);
  }, [buildFinanceReportSpreadsheet, currentLiquidationTotal, currentReportEntries, currentReportTotal, currentSalesTotal, reportPeriod]);

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
                    // Special handling for Cheques
                    if (method === 'Cheques') {
                      const chequeEntries = getChequeEntries();
                      const totalCheques = getTotalCheques();
                      return (
                        <div
                          key={method}
                          className="payment-method-card active"
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
                            <div className="payment-detail">
                              <label>Total Income From Cheques:</label>
                              <p>PHP {totalCheques.toFixed(2)}</p>
                            </div>

                            <div className="payment-detail">
                              <label>Cheque Entries:</label>
                              <p>{chequeEntries.length}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular payment methods
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
                            <label>
                              {method === 'Credit'
                                ? 'Outstanding Credit Balance:'
                                : `Total Income From ${method}:`}
                            </label>
                            <p>
                              PHP {
                                method === 'Credit'
                                  ? getTotalCredit().toFixed(2)
                                  : getTotalByMethod(method).toFixed(2)
                              }
                            </p>
                          </div>

                          <div className="payment-detail">
                            <label>Entries:</label>
                            <p>{method === 'Credit' ? creditEntries.length : getMethodEntryCount(method)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {canAccessIncome && (
              <div className="finance-bottom-grid">
                <section className="finance-panel finance-panel-full">
                  <div className="page-header" style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>Income Reporting</h2>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
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

                    <div className="order-search-bar" style={{ marginBottom: 0, flex: '1 1 320px', maxWidth: '520px' }}>
                      <input
                        type="text"
                        value={searchReferenceNumber}
                        onChange={(e) => setSearchReferenceNumber(e.target.value)}
                        placeholder="Search by reference number..."
                      />
                    </div>
                  </div>

                  <div className="income-details-summary income-reporting-summary" style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'nowrap', width: '100%' }}>
                    <div style={{ flex: '0 0 28%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Sales Total</span>
                      <strong>PHP {currentSalesTotal.toFixed(2)}</strong>
                    </div>
                    <div style={{ flex: '0 0 28%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Report Total</span>
                      <strong style={{ color: currentReportTotal < 0 ? '#d32f2f' : undefined }}>
                        PHP {currentReportTotal.toFixed(2)}
                      </strong>
                    </div>
                    <div style={{ flex: '0 0 24%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Range</span>
                      <strong>
                        {currentReportRange.start.toLocaleDateString()} - {currentReportRange.end.toLocaleDateString()}
                      </strong>
                    </div>
                    <div style={{ flex: '0 0 14%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Entries</span>
                      <strong>{filteredIncomeReportingEntries.length}</strong>
                    </div>
                  </div>

                  <h3 className="transaction-histories-title" style={{ marginTop: '18px' }}>
                    Transaction Histories
                  </h3>
                  <div className="income-details-list transaction-histories-grid" style={{ marginTop: '12px' }}>
                    {filteredIncomeReportingEntries.length > 0 ? (
                      filteredIncomeReportingEntries.map((entry) => (
                        <div key={entry.id} className="income-detail-row">
                          <div className="transaction-history-meta">
                            <div>
                              <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>
                                Reference Number:
                              </span>
                              <strong className="transaction-reference-number">
                                {getPaymentLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                              </strong>
                            </div>
                            <span className="transaction-client-id">
                              {getIncomeDate(entry).toLocaleDateString()}
                            </span>
                            <span className="transaction-client-id">
                              {entry.jobOrderNo ? `Job Order No.: ${entry.jobOrderNo}` : 'Job Order No.: Not available'}
                            </span>
                            <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                              {entry.shopType || 'Unknown source'} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="income-details-btn"
                                onClick={() => openReceipt(entry)}
                                style={{ padding: '8px 14px', fontSize: '12px' }}
                              >
                                View Receipt
                              </button>
                              {entry.jobOrderNo && (
                                <button
                                  type="button"
                                  className="income-details-btn"
                                  onClick={() => handleViewOrder(entry.jobOrderNo)}
                                  style={{ padding: '8px 14px', fontSize: '12px' }}
                                >
                                  View Order
                                </button>
                              )}
                            </div>
                          </div>
                          <strong>
                            PHP {getIncomeAmount(entry).toFixed(2)}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="income-details-empty">
                        No income transaction history found for this period.
                      </p>
                    )}
                  </div>
                </section>

                <section
                  className="finance-panel finance-panel-full"
                  style={{
                    marginTop: '24px',
                    borderTop: '4px solid #c62828',
                    background: 'linear-gradient(180deg, #fffdfd 0%, #fff7f7 100%)',
                    boxShadow: '0 10px 28px rgba(198, 40, 40, 0.06)',
                  }}
                >
                  <div
                    className="page-header"
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0 }}>Liquidation</h2>
                      <div style={{ fontSize: '12px', color: '#7a5a5a', marginTop: '4px' }}>
                        Cash out records, liquidation totals, and withdrawal history
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div className="finance-search-bar">
                      <input
                        type="text"
                        placeholder="Search by liquidation reference number..."
                        value={searchReferenceNumber}
                        onChange={(e) => setSearchReferenceNumber(e.target.value)}
                      />
                      {searchReferenceNumber && (
                        <button
                          type="button"
                          className="finance-search-clear-btn"
                          onClick={handleClearSearch}
                          title="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="income-details-btn"
                        onClick={openLiquidationModal}
                      >
                        Liquidation / Withdraw Money
                      </button>
                      <button
                        type="button"
                        className="income-details-btn"
                        onClick={handleDownloadFinanceReportExcel}
                      >
                        Download Excel
                      </button>
                    </div>
                  </div>

                  <div className="income-details-summary income-reporting-summary" style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'nowrap', width: '100%' }}>
                    <div style={{ flex: '0 0 28%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Liquidation Total</span>
                      <strong>PHP {filteredLiquidationTotal.toFixed(2)}</strong>
                    </div>
                    <div style={{ flex: '0 0 28%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Report Total</span>
                      <strong style={{ color: filteredReportTotal < 0 ? '#d32f2f' : undefined }}>
                        PHP {filteredReportTotal.toFixed(2)}
                      </strong>
                    </div>
                    <div style={{ flex: '0 0 24%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Range</span>
                      <strong>
                        {currentReportRange.start.toLocaleDateString()} - {currentReportRange.end.toLocaleDateString()}
                      </strong>
                    </div>
                    <div style={{ flex: '0 0 14%', minWidth: 0, boxSizing: 'border-box' }}>
                      <span className="income-details-label">Entries</span>
                      <strong>{filteredLiquidationEntries.length}</strong>
                    </div>
                  </div>

                  <h3 className="transaction-histories-title" style={{ marginTop: '18px' }}>
                    Liquidation Histories
                  </h3>
                  <div className="income-details-list transaction-histories-grid" style={{ marginTop: '12px' }}>
                    {filteredLiquidationEntries.length > 0 ? (
                      filteredLiquidationEntries.map((entry) => (
                        <div key={entry.id} className="income-detail-row">
                          <div className="transaction-history-meta">
                            <div>
                              <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>
                                Reference Number:
                              </span>
                              <strong className="transaction-reference-number">
                                {entry.referenceNumber || 'Auto-generated on save'}
                              </strong>
                            </div>
                            <span className="transaction-client-id">
                              {getIncomeDate(entry).toLocaleDateString()}
                            </span>
                            <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                              {entry.remarks || 'No reason provided'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="income-details-btn"
                                onClick={() => openReceipt(entry)}
                                style={{ padding: '8px 14px', fontSize: '12px' }}
                              >
                                View Receipt
                              </button>
                            </div>
                          </div>
                          <strong>
                            - PHP {getIncomeAmount(entry).toFixed(2)}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="income-details-empty">
                        {searchReferenceNumber
                          ? `No liquidation history found matching "${searchReferenceNumber}" for this period.`
                          : 'No liquidation history found for this period.'}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        <Modal
          isOpen={!!detailsTarget}
          onClose={closeDetails}
          title={detailsTarget?.type === 'income' ? 'Income Source Details' : 'Payment Method Details'}
          size="finance"
        >
          {renderDetailsContent()}
        </Modal>

        <Modal
          isOpen={!!selectedCreditOrder}
          onClose={closeCreditDetails}
          title="Credit Payment History"
          size="finance"
        >
          <div className="income-details-modal">
            <div className="income-details-summary">
              <div>
                <span className="income-details-label">Job Order No.</span>
                <strong>{selectedCreditOrder?.jobOrderNo}</strong>
              </div>
              <div>
                <span className="income-details-label">Total Amount</span>
                <strong>PHP {selectedCreditOrder?.afterDiscountTotal.toFixed(2)}</strong>
              </div>
              <div>
                <span className="income-details-label">Total Paid</span>
                <strong>PHP {selectedCreditOrder?.paidAmount.toFixed(2)}</strong>
              </div>
              <div>
                <span className="income-details-label">Remaining</span>
                <strong style={{ color: '#c0392b' }}>PHP {selectedCreditOrder?.remainingBalance.toFixed(2)}</strong>
              </div>
            </div>

            <h3 className="transaction-histories-title">Payment History</h3>
            <div className="income-details-list transaction-histories-grid">
              {getCreditPaymentHistory(selectedCreditOrder).length > 0 ? (
                getCreditPaymentHistory(selectedCreditOrder).map((entry) => (
                  <div key={entry.id} className="income-detail-row">
                    <div className="transaction-history-meta">
                      <div>
                        <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Check Number:</span>
                        <strong className="transaction-reference-number">
                          {getChequeLabel(entry) || orderReferenceCache[entry.jobOrderNo] || 'Loading...'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6e645a', marginTop: '4px' }}>
                        {entry.paymentMethod} - {entry.incomeDate || entry.createdAt?.slice?.(0, 10) || 'No date'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="income-details-btn"
                          onClick={() => openReceipt(entry)}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          View Receipt
                        </button>
                        {entry.jobOrderNo && (
                          <button
                            type="button"
                            className="income-details-btn"
                            onClick={() => handleViewOrder(entry.jobOrderNo)}
                            style={{ padding: '8px 14px', fontSize: '12px' }}
                          >
                            View Order
                          </button>
                        )}
                      </div>
                    </div>
                    <strong>
                      PHP {getIncomeAmount(entry).toFixed(2)}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="income-details-empty">No payment history found. Initial down payment might not be recorded as a separate income entry.</p>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={liquidationModalOpen}
          onClose={closeLiquidationModal}
          onSubmit={handleRecordLiquidation}
          title="Record Liquidation"
          submitText="Save Liquidation"
          size="finance"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="income-details-label" style={{ fontSize: '14px' }}>Withdrawal Date</label>
              <input
                type="date"
                value={liquidationDate}
                onChange={(e) => setLiquidationDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="income-details-label" style={{ fontSize: '14px' }}>Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={liquidationAmount}
                onChange={(e) => setLiquidationAmount(e.target.value)}
                placeholder="Enter amount to withdraw"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="income-details-label" style={{ fontSize: '14px' }}>Reason</label>
              <textarea
                value={liquidationReason}
                onChange={(e) => setLiquidationReason(e.target.value)}
                placeholder="Enter reason for liquidation"
                style={{ width: '100%', minHeight: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!receiptTarget}
          onClose={closeReceipt}
          title="Finance Receipt"
          size="finance"
        >
          {renderReceiptContent()}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default SourceIncome;
