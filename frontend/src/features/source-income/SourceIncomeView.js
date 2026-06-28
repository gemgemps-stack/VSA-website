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

const PAYMENT_METHODS = ['Debit', 'Gcash', 'Cash', 'Bank Transfer', 'Credit', 'Cheques'];
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
const toAscii = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, '?');
const escapePdfText = (value) => toAscii(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

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
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
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

  const getOrderItems = (order) => {
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
  };

  const getOrderTotal = (order) =>
    getOrderItems(order).reduce(
      (sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)),
      0,
    );

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
  }, [incomeEntries]);

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
      .filter((entry) => entry.checkNumber)
      .sort((a, b) => getIncomeDate(b) - getIncomeDate(a));
  }, [incomeEntries]);

  const getTotalCheques = () =>
    getChequeEntries().reduce((total, entry) => total + getIncomeAmount(entry), 0);

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

  const openReceipt = useCallback(async (entry) => {
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
  }, [loadReceiptOrder]);

  const handleOpenOrder = (order) => {
    const targetPath = order?.sourceType === 'Customized Order' ? '/customized-orders' : '/orders';
    navigate(targetPath, {
      state: { jobOrderNo: order?.jobOrderNo },
    });
  };

  const closeCreditDetails = () => {
    setSelectedCreditOrder(null);
  };

  const closeReceipt = () => {
    setReceiptTarget(null);
    setReceiptError('');
    setReceiptLoading(false);
  };

  const getReceiptNumber = useCallback((order, entry) => {
    if (!order || !entry) return 'N/A';

    const jobOrderPart = toAscii(order.jobOrderNo || 'NOJOB').replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'NOJOB';
    const entryPart = toAscii(entry.id || '').replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'ENTRY';
    return `RCP-${jobOrderPart}-${entryPart}`;
  }, []);

  const getReceiptDocumentData = useCallback(() => {
    const order = receiptTarget?.order;
    const entry = receiptTarget?.entry;

    if (!order || !entry || receiptLoading || receiptError) {
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
  }, [getOrderItems, getReceiptNumber, receiptError, receiptLoading, receiptTarget]);

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
      `Job Order No.: ${order.jobOrderNo || 'N/A'}`,
      `Receipt Date: ${receiptDate ? new Date(receiptDate).toLocaleString() : 'No date available'}`,
      `Source Type: ${order.sourceType || 'Order'}`,
      `Shop: ${order.shop || 'Unknown shop'}`,
      `Client: ${order.clientName || 'Walk-in Client'}`,
      `Payment Method: ${order.modeOfPayment || entry.paymentMethod || 'N/A'}`,
      `Reference Number: ${entry.referenceNumber || order.referenceNumber || 'N/A'}`,
      `Payment Status: ${entry.checkNumber ? 'With Check' : 'Recorded Payment'}`,
      '',
      'Items',
    ];

    if (order.items.length > 0) {
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
      `Total Amount: ${formatMoney(order.total)}`,
      `After Discount: ${formatMoney(order.afterDiscountTotal)}`,
      `Paid: ${formatMoney(order.paidAmount)}`,
      `Remaining Balance: ${formatMoney(order.remainingBalance)}`,
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
      if (safeLine.length <= maxChars) return [safeLine];
      const wrapped = [];
      let remaining = safeLine;
      while (remaining.length > maxChars) {
        let splitAt = remaining.lastIndexOf(' ', maxChars);
        if (splitAt <= 0) splitAt = maxChars;
        wrapped.push(remaining.slice(0, splitAt).trimEnd());
        remaining = remaining.slice(splitAt).trimStart();
      }
      if (remaining.length > 0) wrapped.push(remaining);
      return wrapped;
    });
  }, []);

  const buildReceiptPdfBlob = useCallback((data) => {
    const lines = buildReceiptPdfLines(data);
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 48;
    const fontSize = 11;
    const lineHeight = 14;
    const usableHeight = pageHeight - (margin * 2);
    const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight));
    const pages = [];

    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }

    const header = '%PDF-1.4\n';
    const objects = [''];
    const pageObjectIds = [];
    const contentObjectIds = [];
    let objectId = 4;

    pages.forEach(() => {
      pageObjectIds.push(objectId++);
      contentObjectIds.push(objectId++);
    });

    objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`;
    objects[3] = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

    pages.forEach((pageLines, pageIndex) => {
      const contentLines = [
        'BT',
        `/F1 ${fontSize} Tf`,
        `${lineHeight} TL`,
      ];

      let y = pageHeight - margin;
      pageLines.forEach((line) => {
        contentLines.push(`1 0 0 1 ${margin} ${y} Tm`);
        contentLines.push(`(${escapePdfText(line)}) Tj`);
        y -= lineHeight;
      });
      contentLines.push('ET');

      const content = contentLines.join('\n');
      const contentLength = content.length;
      const contentId = contentObjectIds[pageIndex];
      objects[contentId] = `${contentId} 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`;
      objects[pageObjectIds[pageIndex]] = `${pageObjectIds[pageIndex]} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`;
    });

    let pdf = header;
    const offsets = [0];
    for (let i = 1; i < objects.length; i += 1) {
      const obj = objects[i] || '';
      offsets[i] = pdf.length;
      pdf += obj;
    }

    const xrefOffset = pdf.length;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i += 1) {
      const offset = String(offsets[i] || 0).padStart(10, '0');
      xref += `${offset} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    pdf += xref + trailer;

    return new Blob([pdf], { type: 'application/pdf' });
  }, [buildReceiptPdfLines]);

  const handlePrintReceipt = useCallback(() => {
    const data = getReceiptDocumentData();
    if (!data) {
      setReceiptError('Please open a receipt before printing.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      setReceiptError('Popup blocked. Please allow popups to print the receipt.');
      return;
    }

    const { order, entry, receiptDate, receiptNumber } = data;
    const rows = order.items.length > 0
      ? order.items.map((item) => {
          const subtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
          return `
            <tr>
              <td>${toAscii(item.productName || 'Unnamed item')}</td>
              <td>${formatMoney(item.unitPrice)}</td>
              <td>${item.quantity || 0}</td>
              <td>${formatMoney(subtotal)}</td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;">No line items available.</td></tr>';

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Receipt - ${toAscii(order.jobOrderNo || '')}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, sans-serif; color: #10212f; margin: 0; padding: 0; background: #f3f7f6; }
            .receipt-page { max-width: 760px; margin: 0 auto; padding: 0; }
            .brand-header { display:flex; align-items:center; gap:16px; padding:20px 22px; border:1px solid #d9e4e1; border-radius:18px; background: linear-gradient(135deg, #0b2433 0%, #123d55 100%); color:#fff; }
            .brand-logo { width: 72px; height: 72px; flex: 0 0 72px; border-radius: 50%; background:#fff; padding: 4px; object-fit: contain; }
            .brand-copy { flex: 1; min-width: 0; }
            .brand-eyebrow { margin:0 0 4px 0; font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#d8e7f0; }
            .brand-title { margin:0; font-size:24px; font-weight:800; letter-spacing:.03em; color:#fff; }
            .brand-subtitle { margin:6px 0 0 0; font-size:13px; color:#e7f1f6; }
            .receipt-eyebrow { margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#6e645a; }
            h1, h2, h3, p { margin: 0; }
            h2 { font-size: 22px; }
            .receipt-muted { margin-top:6px; font-size:13px; color:#d8e7f0; }
            .receipt-meta { text-align:right; font-size:13px; font-weight:700; color:#10212f; }
            .receipt-block { margin-top:18px; border:1px solid #dfe7e3; border-radius:16px; overflow:hidden; background:#fff; }
            .receipt-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:16px 18px; background:#fff; }
            .receipt-summary > div { padding:12px 14px; border:1px solid #edf2ef; border-radius:12px; background:#f7faf9; }
            .label { display:block; font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#6e645a; margin-bottom:4px; }
            table { width:100%; border-collapse:collapse; }
            th, td { padding:10px 12px; border-bottom:1px solid #edf2ef; text-align:left; font-size:13px; }
            th { background:#f7faf9; text-transform:uppercase; letter-spacing:.04em; font-size:11px; color:#6e645a; }
            .section-title { margin:16px 0 10px; font-size:16px; font-weight:700; }
            .transaction-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 14px; padding:16px 18px; }
            .transaction-grid span { font-size:13px; }
          </style>
        </head>
        <body>
          <div class="receipt-page">
            <div class="brand-header">
              <img src="/verdida-logo.svg" alt="Verdida Sports Apparel" class="brand-logo" />
              <div class="brand-copy">
                <p class="brand-eyebrow">Verdida Sports Apparel</p>
                <h1 class="brand-title">Official Finance Receipt</h1>
                <p class="brand-subtitle">Premium teamwear and custom apparel</p>
              </div>
            </div>

            <div class="receipt-block" style="margin-top:18px;">
              <div class="receipt-summary" style="align-items:start;">
                <div>
                  <span class="label">Job Order No.</span>
                  <strong>${toAscii(order.jobOrderNo || 'N/A')}</strong>
                </div>
                <div style="text-align:right;">
                  <span class="label">Receipt Date</span>
                  <strong>${receiptDate ? new Date(receiptDate).toLocaleString() : 'No date available'}</strong>
                </div>
                <div>
                  <span class="label">Source Type</span>
                  <strong>${toAscii(order.sourceType || 'Order')}</strong>
                </div>
                <div style="text-align:right;">
                  <span class="label">Shop</span>
                  <strong>${toAscii(order.shop || 'Unknown shop')}</strong>
                </div>
                <div>
                  <span class="label">Receipt No.</span>
                  <strong>${toAscii(receiptNumber || 'N/A')}</strong>
                </div>
                <div style="text-align:right;">
                  <span class="label">Reference No.</span>
                  <strong>${toAscii(entry.referenceNumber || order.referenceNumber || 'N/A')}</strong>
                </div>
              </div>
            </div>

            <div class="receipt-block">
              <div class="receipt-summary">
                <div><span class="label">Client</span><strong>${toAscii(order.clientName || 'Walk-in Client')}</strong></div>
                <div><span class="label">Payment Method</span><strong>${toAscii(order.modeOfPayment || entry.paymentMethod || 'N/A')}</strong></div>
                <div><span class="label">Reference Number</span><strong>${toAscii(entry.referenceNumber || order.referenceNumber || 'N/A')}</strong></div>
                <div><span class="label">Payment Status</span><strong>${entry.checkNumber ? 'With Check' : 'Recorded Payment'}</strong></div>
              </div>
            </div>

            <h3 class="section-title">Items</h3>
            <div class="receipt-block">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <div class="receipt-block" style="margin-top:18px;">
              <div class="receipt-summary">
                <div><span class="label">Total Amount</span><strong>${formatMoney(order.total)}</strong></div>
                <div><span class="label">After Discount</span><strong>${formatMoney(order.afterDiscountTotal)}</strong></div>
                <div><span class="label">Paid</span><strong>${formatMoney(order.paidAmount)}</strong></div>
                <div><span class="label">Remaining Balance</span><strong>${formatMoney(order.remainingBalance)}</strong></div>
              </div>
            </div>

            <h3 class="section-title">Transaction Entry</h3>
            <div class="receipt-block">
              <div class="transaction-grid">
                <span><strong>Job Order No.:</strong> ${toAscii(entry.jobOrderNo || 'N/A')}</span>
                <span><strong>Amount:</strong> ${formatMoney(entry.amount)}</span>
                <span><strong>Shop Type:</strong> ${toAscii(entry.shopType || 'Unknown source')}</span>
                <span><strong>Payment Method:</strong> ${toAscii(entry.paymentMethod || 'N/A')}</span>
              </div>
            </div>

            <div class="receipt-block" style="margin-top:18px;">
              <div class="receipt-summary">
                <div><span class="label">Note</span><strong>Please keep this receipt for your records.</strong></div>
                <div><span class="label">Note</span><strong>Payments are subject to confirmation and accounting review.</strong></div>
                <div style="grid-column: 1 / -1;"><span class="label">Note</span><strong>Thank you for supporting Verdida Sports Apparel.</strong></div>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    printWindow.document.close();
  }, [getReceiptDocumentData]);

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
    anchor.download = `receipt-${data.order.jobOrderNo || 'order'}.pdf`;
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
                    <button
                      type="button"
                      className="income-details-btn"
                      onClick={() => openReceipt(entry)}
                      style={{ marginTop: '10px', padding: '6px 10px', fontSize: '12px' }}
                    >
                      Receipt
                    </button>
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

    // Special handling for Cheques
    if (method === 'Cheques') {
      const chequeEntries = getChequeEntries();
      const totalCheques = getTotalCheques();

      return (
        <div className="income-details-modal">
          <div className="income-details-summary">
            <div>
              <span className="income-details-label">Payment Method</span>
              <strong>{method}</strong>
            </div>
            <div>
              <span className="income-details-label">Status</span>
              <strong>Active</strong>
            </div>
            <div>
              <span className="income-details-label">Total Income</span>
              <strong>PHP {totalCheques.toFixed(2)}</strong>
            </div>
            <div>
              <span className="income-details-label">Cheque Entries</span>
              <strong>{chequeEntries.length}</strong>
            </div>
          </div>

          <h3 className="transaction-histories-title">Cheque Transaction Histories</h3>
          <div className="income-details-list transaction-histories-grid">
            {chequeEntries.length > 0 ? (
              chequeEntries.map((entry) => (
                <div key={entry.id} className="income-detail-row">
                  <div className="transaction-history-meta">
                    <div>
                      <span className="transaction-client-id" style={{ fontSize: '11px', color: '#999', marginRight: '8px' }}>Check No.:</span>
                      <strong className="transaction-reference-number">
                        {entry.checkNumber || 'N/A'}
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
                    <button
                      type="button"
                      className="income-details-btn"
                      onClick={() => openReceipt(entry)}
                      style={{ marginTop: '10px', padding: '6px 10px', fontSize: '12px' }}
                    >
                      Receipt
                    </button>
                  </div>
                  <strong>PHP {getIncomeAmount(entry).toFixed(2)}</strong>
                </div>
              ))
            ) : (
              <p className="income-details-empty">No cheque payments recorded yet.</p>
            )}
          </div>
        </div>
      );
    }

    // Regular payment methods
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
                  <button
                    type="button"
                    className="income-details-btn"
                    onClick={() => openReceipt(entry)}
                    style={{ marginTop: '10px', padding: '6px 10px', fontSize: '12px' }}
                  >
                    Receipt
                  </button>
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

  const renderReceiptContent = () => {
    const order = receiptTarget?.order;
    const entry = receiptTarget?.entry;
    const receiptNumber = order && entry ? getReceiptNumber(order, entry) : 'N/A';

    if (receiptLoading) {
      return <p className="income-details-empty">Loading receipt...</p>;
    }

    if (receiptError) {
      return <p className="income-details-empty">{receiptError}</p>;
    }

    if (!order || !entry) {
      return <p className="income-details-empty">No receipt data available.</p>;
    }

    const receiptDate = entry.createdAt || entry.incomeDate || order.orderDate;

    return (
      <div className="receipt-modal">
        <div className="receipt-actions">
          <button
            type="button"
            className="income-details-btn"
            onClick={handlePrintReceipt}
            disabled={receiptLoading || Boolean(receiptError)}
            style={{ marginTop: 0, padding: '8px 12px', fontSize: '12px' }}
          >
            Print
          </button>
          <button
            type="button"
            className="income-details-btn"
            onClick={handleDownloadReceiptPdf}
            disabled={receiptLoading || Boolean(receiptError)}
            style={{ marginTop: 0, padding: '8px 12px', fontSize: '12px' }}
          >
            Download PDF
          </button>
        </div>
        <div className="receipt-header">
          <div>
            <p className="receipt-eyebrow">Order Receipt</p>
            <h3>{order.jobOrderNo}</h3>
            <p className="receipt-muted">{order.sourceType || 'Order'}</p>
          </div>
          <div className="receipt-meta">
            <span>{receiptDate ? new Date(receiptDate).toLocaleString() : 'No date available'}</span>
            <span>{order.shop || 'Unknown shop'}</span>
          </div>
        </div>

        <div className="income-details-summary receipt-summary">
          <div>
            <span className="income-details-label">Client</span>
            <strong>{order.clientName || 'Walk-in Client'}</strong>
          </div>
          <div>
            <span className="income-details-label">Payment Method</span>
            <strong>{order.modeOfPayment || entry.paymentMethod || 'N/A'}</strong>
          </div>
          <div>
            <span className="income-details-label">Reference Number</span>
            <strong>{entry.referenceNumber || order.referenceNumber || 'N/A'}</strong>
          </div>
          <div>
            <span className="income-details-label">Receipt No.</span>
            <strong>{receiptNumber}</strong>
          </div>
          <div>
            <span className="income-details-label">Payment Status</span>
            <strong>{entry.checkNumber ? 'With Check' : 'Recorded Payment'}</strong>
          </div>
        </div>

        <div>
          <h3 className="transaction-histories-title">Items</h3>
          <div className="receipt-items">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <tr key={item.id || `${item.productName}-${item.unitPrice}-${item.quantity}`}>
                      <td>{item.productName || 'Unnamed item'}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{formatMoney((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="receipt-empty-cell">
                      No line items available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="income-details-summary receipt-summary">
          <div>
            <span className="income-details-label">Total Amount</span>
            <strong>{formatMoney(order.total)}</strong>
          </div>
          <div>
            <span className="income-details-label">After Discount</span>
            <strong>{formatMoney(order.afterDiscountTotal)}</strong>
          </div>
          <div>
            <span className="income-details-label">Paid</span>
            <strong>{formatMoney(order.paidAmount)}</strong>
          </div>
          <div>
            <span className="income-details-label">Remaining Balance</span>
            <strong>{formatMoney(order.remainingBalance)}</strong>
          </div>
        </div>

        <div>
          <h3 className="transaction-histories-title">Transaction Entry</h3>
          <div className="receipt-transaction">
            <span>Job Order No.: {entry.jobOrderNo || 'N/A'}</span>
            <span>Amount: {formatMoney(entry.amount)}</span>
            <span>Shop Type: {entry.shopType || 'Unknown source'}</span>
            <span>Payment Method: {entry.paymentMethod || 'N/A'}</span>
          </div>
        </div>

        <div className="receipt-footer-notes">
          <h3 className="transaction-histories-title">Notes</h3>
          <p>Please keep this receipt for your records.</p>
          <p>Payments are subject to confirmation and accounting review.</p>
          <p>Thank you for supporting Verdida Sports Apparel.</p>
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
              <div className="finance-bottom-grid">
                <section className="finance-panel">
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

                <section className="finance-panel">
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
                            <button
                              type="button"
                              className="income-details-btn"
                              onClick={() => openReceipt(entry)}
                              style={{ marginTop: '10px', padding: '6px 10px', fontSize: '12px' }}
                            >
                              Receipt
                            </button>
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
              </div>
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

        <Modal
          isOpen={Boolean(receiptTarget)}
          title={receiptTarget?.order ? `Receipt - ${receiptTarget.order.jobOrderNo}` : 'Receipt'}
          onClose={closeReceipt}
          cancelText="Close"
          size="xlarge"
        >
          {renderReceiptContent()}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default SourceIncome;
