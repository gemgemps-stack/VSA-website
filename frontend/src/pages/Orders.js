import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import PermissionGuard from '../components/PermissionGuard';
import inventoryService from '../services/inventoryService';
import clientService from '../services/clientService';
import incomeService from '../services/incomeService';
import orderService from '../services/orderService';

const SHOP_OPTIONS = ['VSA Online Shop', 'Tiktok Shop', 'Shoppee Shop', 'Verdida Sports Apparel'];
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
  { key: ORDER_STATUS.IN_PRODUCTION, label: 'In Production' },
  { key: ORDER_STATUS.NOT_YET_FULLY_PAID, label: 'Not Yet Fully Paid' },
  { key: ORDER_STATUS.FULLY_PAID, label: 'Fully Paid / Completed' },
  { key: ORDER_STATUS.CANCELLED, label: 'Cancelled Orders' },
];

const getStatusLabel = (status) => {
  const labels = {
    [ORDER_STATUS.FOR_CLIENT_APPROVAL]: 'For Client Approval',
    [ORDER_STATUS.NOT_APPROVED]: 'Not Approved',
    [ORDER_STATUS.DOWN_PAYMENT_PENDING]: 'Down Payment Pending',
    [ORDER_STATUS.IN_PRODUCTION]: 'In Production',
    [ORDER_STATUS.NOT_YET_FULLY_PAID]: 'Not Yet Fully Paid',
    [ORDER_STATUS.FULLY_PAID]: 'Fully Paid',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
  };

  return labels[status] || status || 'For Client Approval';
};

const getInventoryLabel = (item) => {
  const typeLabel = item.itemType || 'Inventory Item';

  if (typeLabel.toLowerCase() === 'jersey' && item.jerseyType) {
    return `${typeLabel} - ${item.jerseyType} - ${item.name}`;
  }

  return `${typeLabel} - ${item.name}`;
};

const createInitialFormData = () => ({
  clientId: '',
  teamName: '',
  orderRetail: '',
  quantity: '',
  freebie: '',
  discount: '0',
  price: '',
  downPayment: '0',
  shop: '',
  orderDate: new Date().toISOString().split('T')[0],
  modeOfPayment: 'Cash',
});

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const [retailSearch, setRetailSearch] = useState('');
  const [retailSuggestionsOpen, setRetailSuggestionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [formData, setFormData] = useState(createInitialFormData());

  const loadClients = useCallback(async () => {
    try {
      const response = await clientService.getAllClients(0, 1000);
      setClients(response.data.content || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      alert('Failed to load clients');
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const response = await inventoryService.getAllInventory(0, 1000);
      setInventoryItems(response.data.content || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Failed to load inventory');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders(0, 1000);
      setOrders(response.data.content || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedClient = clients.find((client) => client.id === formData.clientId);
  const isVipClient = Boolean(selectedClient?.vip);
  const filteredOrders = orders.filter((order) => {
    const normalizedStatus = (order.status || '').toUpperCase();

    if (statusFilter === 'ALL') {
      return normalizedStatus !== ORDER_STATUS.FULLY_PAID && normalizedStatus !== ORDER_STATUS.CANCELLED;
    }
    return normalizedStatus === statusFilter;
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);
  
  const filteredClients = clients.filter((client) =>
    client.clientName.toLowerCase().includes(clientSearch.trim().toLowerCase())
  );
  
  const filteredInventory = inventoryItems.filter((item) => {
    const searchTerm = retailSearch.trim().toLowerCase();
    const itemText = getInventoryLabel(item).toLowerCase();
    return itemText.includes(searchTerm);
  });

  useEffect(() => {
    if (modalOpen && isVipClient && formData.downPayment !== '0') {
      setFormData((prev) => ({
        ...prev,
        downPayment: '0',
      }));
    }
  }, [formData.downPayment, isVipClient, modalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleClientSelect = (clientId) => {
    const client = clients.find((item) => item.id === clientId);
    setFormData((prev) => ({
      ...prev,
      clientId,
      downPayment: client?.vip ? '0' : prev.downPayment || '0',
    }));
    setClientSearch(client?.clientName || '');
    setClientSuggestionsOpen(false);
  };

  const handleClientInputChange = (value) => {
    setClientSearch(value);
    setClientSuggestionsOpen(true);
    setFormData((prev) => ({
      ...prev,
      clientId: '',
      downPayment: prev.downPayment,
    }));
  };

  const handleClientInputBlur = () => {
    window.setTimeout(() => setClientSuggestionsOpen(false), 150);
  };

  const handleRetailSelect = (item) => {
    const retailValue = getInventoryLabel(item);
    setSelectedInventoryItem(item);
    setFormData((prev) => ({
      ...prev,
      orderRetail: retailValue,
      price: String(item.price || ''),
      quantity: '',
    }));
    setRetailSearch(retailValue);
    setRetailSuggestionsOpen(false);
  };

  const handleRetailInputChange = (value) => {
    setRetailSearch(value);
    setRetailSuggestionsOpen(true);
    setFormData((prev) => ({
      ...prev,
      orderRetail: value,
    }));
  };

  const handleRetailInputBlur = () => {
    window.setTimeout(() => setRetailSuggestionsOpen(false), 150);
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, quantity: value });
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && selectedInventoryItem) {
      if (numValue > selectedInventoryItem.quantity) {
        // Set to max available
        setFormData({ ...formData, quantity: String(selectedInventoryItem.quantity) });
      } else if (numValue >= 0) {
        setFormData({ ...formData, quantity: value });
      }
    } else if (!isNaN(numValue) && numValue >= 0) {
      setFormData({ ...formData, quantity: value });
    }
  };

  const getDiscountedTotal = () => {
    const basePrice = Number.parseFloat(formData.price || 0);
    const quantity = Number.parseInt(formData.quantity || 0, 10);
    const discountPercent = Number.parseFloat(formData.discount || 0);

    if (!Number.isFinite(basePrice) || !Number.isFinite(quantity)) {
      return 0;
    }

    const originalTotal = basePrice * quantity;
    return originalTotal * (1 - discountPercent / 100);
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

  const handleEdit = (order) => {
    const retailRecord = inventoryItems.find(
      (item) =>
        getInventoryLabel(item).toLowerCase() ===
        (order.orderRetail || '').toLowerCase()
    );
    setSelectedInventoryItem(retailRecord || null);
    setEditingOrder(order);
    setFormData({
      clientId: order.clientId || '',
      teamName: order.teamName || '',
      orderRetail: order.orderRetail || '',
      quantity: order.quantity != null ? String(order.quantity) : '',
      freebie: order.freebie || '',
      discount: order.discount != null ? String(order.discount) : '0',
      price: order.price != null ? String(order.price) : '',
      downPayment: order.downPayment != null ? String(order.downPayment) : '0',
      shop: order.shop || '',
      orderDate: order.orderDate || new Date().toISOString().split('T')[0],
      modeOfPayment: order.modeOfPayment || 'Cash',
    });
    setClientSearch(clients.find(c => c.id === order.clientId)?.clientName || '');
    setRetailSearch(order.orderRetail || '');
    setClientSuggestionsOpen(false);
    setRetailSuggestionsOpen(false);
    setModalOpen(true);
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setReferenceNumber('');
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
    setReferenceNumber('');
  };

  const buildOrderPayload = (order, statusOverride) => ({
    clientId: order.clientId,
    teamName: order.teamName || null,
    orderRetail: order.orderRetail,
    quantity: Number(order.quantity),
    freebie: order.freebie || null,
    discount: Number(order.discount || 0),
    price: Number(order.price),
    downPayment: Number(order.downPayment || 0),
    shop: order.shop,
    orderDate: order.orderDate,
    modeOfPayment: order.modeOfPayment,
    status: statusOverride || order.status || ORDER_STATUS.FOR_CLIENT_APPROVAL,
  });

  const updateSelectedOrderStatus = async (newStatus) => {
    if (!selectedOrder) {
      return;
    }

    try {
      const payload = buildOrderPayload(selectedOrder, newStatus);
      const response = await orderService.updateOrder(selectedOrder.id, payload);
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
    const trimmedReference = referenceNumber.trim();

    if (!trimmedReference) {
      alert('Please enter a reference number first.');
      return;
    }

    if (!selectedOrder) {
      return;
    }

    try {
      const amount = ((Number(selectedOrder.price) || 0) * (Number(selectedOrder.quantity) || 0)) *
        (1 - (Number(selectedOrder.discount) || 0) / 100);

      await incomeService.createIncomeSource({
        shopType: selectedOrder.shop,
        paymentMethod: selectedOrder.modeOfPayment,
        incomeDate: new Date().toISOString().split('T')[0],
        referenceNumber: trimmedReference,
        amount,
      });

      await updateSelectedOrderStatus(ORDER_STATUS.FULLY_PAID);
      setReferenceNumber('');
    } catch (error) {
      console.error('Error saving income source:', error);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Unknown error';
      alert(`Failed to save income source: ${apiMessage}`);
    }
  };

  const handleCancelSelectedOrder = async () => {
    const confirmed = window.confirm('Cancel this order and return the quantity to inventory?');
    if (!confirmed) {
      return;
    }

    await updateSelectedOrderStatus(ORDER_STATUS.CANCELLED);
  };

  const handleDelete = async (id) => {
    try {
      await orderService.deleteOrder(id);
      alert('Order deleted successfully');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const handleSubmit = async () => {
    try {
      const clientRecord =
        clients.find((client) => client.id === formData.clientId) ||
        clients.find(
          (client) =>
            client.clientName.toLowerCase() === clientSearch.trim().toLowerCase()
        );

      if (!clientRecord) {
        alert('Please select a valid client from the search list.');
        return;
      }

      const retailRecord = inventoryItems.find(
        (item) =>
          getInventoryLabel(item).toLowerCase() ===
          retailSearch.trim().toLowerCase()
      );

      if (!retailRecord) {
        alert('Please select a valid inventory item from the search list.');
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

      const orderQuantity = Number(formData.quantity);
      if (!Number.isFinite(orderQuantity) || orderQuantity < 1) {
        alert('Please enter a valid quantity.');
        return;
      }

      if (orderQuantity > retailRecord.quantity) {
        alert(`Quantity cannot exceed available inventory (${retailRecord.quantity})`);
        return;
      }

      const unitPrice = Number(formData.price || retailRecord.price || 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        alert('Please enter a valid price.');
        return;
      }

      const discount = Number(formData.discount || 0);
      const downPayment = clientRecord.vip ? 0 : Number(formData.downPayment || 0);
      const discountedTotal = unitPrice * orderQuantity * (1 - discount / 100);

      if (!clientRecord.vip && downPayment > discountedTotal) {
        alert(`Down payment cannot exceed the total discounted amount (${discountedTotal.toFixed(2)}).`);
        return;
      }

      const payload = {
        ...formData,
        clientId: clientRecord.id,
        orderRetail: getInventoryLabel(retailRecord),
        teamName: formData.teamName.trim() || null,
        quantity: orderQuantity,
        discount: Number.isFinite(discount) ? discount : 0,
        price: unitPrice,
        downPayment: Number.isFinite(downPayment) ? downPayment : 0,
        shop: formData.shop.trim(),
        modeOfPayment: formData.modeOfPayment.trim(),
        freebie: formData.freebie.trim() || null,
        status: editingOrder?.status || ORDER_STATUS.FOR_CLIENT_APPROVAL,
      };

      if (editingOrder) {
        await orderService.updateOrder(editingOrder.id, payload);
        alert('Order updated successfully');
      } else {
        await orderService.createOrder(payload);
        alert('Order created successfully');
      }

      setModalOpen(false);
      setEditingOrder(null);
      setSelectedInventoryItem(null);
      setFormData(createInitialFormData());
      setClientSearch('');
      setClientSuggestionsOpen(false);
      setRetailSearch('');
      setRetailSuggestionsOpen(false);
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

  const columns = [
    { key: 'jobOrderNo', label: 'Job Order No' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'teamName', label: 'Team Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'price', label: 'Price' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className="order-status-badge" data-status={value}>
          {getStatusLabel(value)}
        </span>
      ),
    },
    { key: 'orderDate', label: 'Date' },
  ];

  const openNewOrderModal = () => {
    setEditingOrder(null);
    setSelectedInventoryItem(null);
    setFormData(createInitialFormData());
    setClientSearch('');
    setClientSuggestionsOpen(false);
    setRetailSearch('');
    setRetailSuggestionsOpen(false);
    setModalOpen(true);
  };

  return (
    <PermissionGuard permission="ORDERS">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Orders</h1>
            <button className="btn-primary" onClick={openNewOrderModal}>
              + New Order
            </button>
          </div>

          <div className="orders-filter-bar">
            {ORDER_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`order-filter-btn ${statusFilter === filter.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={paginatedOrders}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <Modal
            isOpen={modalOpen}
            title={editingOrder ? 'Edit Order' : 'New Order'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingOrder ? 'Update' : 'Create'}
            size="large"
          >
            <form className="order-form-grid">
              <div className="form-group">
                <label>Client Name *</label>
                <div className="client-search-wrapper">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => handleClientInputChange(e.target.value)}
                    onFocus={() => setClientSuggestionsOpen(true)}
                    onBlur={handleClientInputBlur}
                    placeholder={clients.length === 0 ? 'No clients available' : 'Search client name'}
                    autoComplete="off"
                    required
                    disabled={clients.length === 0}
                  />
                  {clientSuggestionsOpen && filteredClients.length > 0 && (
                    <div className="client-search-results">
                      {filteredClients.map((client) => (
                        <button
                          type="button"
                          key={client.id}
                          className="client-search-item"
                          onClick={() => handleClientSelect(client.id)}
                        >
                          <span>{client.clientName}</span>
                          {client.vipClient && <span className="vip-badge">VIP</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSuggestionsOpen && filteredClients.length === 0 && (
                    <div className="client-search-results empty">No matching clients found</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Team Name (Optional)</label>
                <input
                  type="text"
                  value={formData.teamName}
                  placeholder="Enter team name"
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Order Retail *</label>
                <div className="order-retail-search-wrapper">
                  <input
                    type="text"
                    value={retailSearch}
                    onChange={(e) => handleRetailInputChange(e.target.value)}
                    onFocus={() => setRetailSuggestionsOpen(true)}
                    onBlur={handleRetailInputBlur}
                    placeholder={inventoryItems.length === 0 ? 'No inventory available' : 'Search inventory item'}
                    autoComplete="off"
                    required
                    disabled={inventoryItems.length === 0}
                  />
                  {retailSuggestionsOpen && filteredInventory.length > 0 && (
                    <div className="order-retail-results">
                      {filteredInventory.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="order-retail-item"
                          onClick={() => handleRetailSelect(item)}
                        >
                          <span>{getInventoryLabel(item)}</span>
                          <span className="order-retail-meta">
                            Qty {item.quantity}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {retailSuggestionsOpen && filteredInventory.length === 0 && (
                    <div className="order-retail-results empty">No matching inventory found</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInventoryItem?.quantity || undefined}
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  placeholder={selectedInventoryItem ? `Max: ${selectedInventoryItem.quantity}` : 'Select item first'}
                  disabled={!selectedInventoryItem}
                  required
                />
                {selectedInventoryItem && (
                  <small className="form-help-text">Available: {selectedInventoryItem.quantity}</small>
                )}
              </div>

              <div className="form-group">
                <label>Freebie</label>
                <input
                  type="text"
                  value={formData.freebie}
                  placeholder="Enter freebie if any"
                  onChange={(e) => setFormData({ ...formData, freebie: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="Enter discount percentage"
                />
              </div>

              <div className="form-group">
                <label>Price *</label>
                <div className="price-display">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    readOnly
                    disabled={!selectedInventoryItem}
                    placeholder={selectedInventoryItem ? `Unit: ${selectedInventoryItem.price}` : 'Select item first'}
                    required
                  />
                  {selectedInventoryItem && formData.quantity && (
                    <div className="price-calculation">
                      <small>
                        {(() => {
                          const basePrice = parseFloat(formData.price || 0);
                          const quantity = parseInt(formData.quantity || 0);
                          const discountPercent = parseFloat(formData.discount || 0);
                          const discountedPrice = basePrice * (1 - discountPercent / 100);
                          const total = discountedPrice * quantity;
                          
                          return discountPercent > 0 
                            ? `Original: ${(basePrice * quantity).toFixed(2)} | After ${discountPercent}% Discount: ${total.toFixed(2)}`
                            : `Total: ${(basePrice * quantity).toFixed(2)}`;
                        })()}
                      </small>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Down Payment</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={getDiscountedTotal() > 0 ? getDiscountedTotal() : undefined}
                    value={formData.downPayment}
                    onChange={handleDownPaymentChange}
                    disabled={isVipClient}
                    placeholder={
                      selectedInventoryItem && formData.quantity && formData.price
                        ? `Max: ${getDiscountedTotal().toFixed(2)}`
                        : 'Enter down payment'
                    }
                  />
                  {isVipClient && (
                    <small className="form-help-text">Auto-set to 0 for VIP clients.</small>
                  )}
                  {selectedInventoryItem && formData.quantity && formData.price && (
                    <div className="payment-calculation">
                      <small>
                        {(() => {
                          const discountedTotal = getDiscountedTotal();
                          const downPayment = Number.parseFloat(formData.downPayment || 0);
                          const remaining = discountedTotal - downPayment;
                          
                          return discountedTotal > 0 || downPayment > 0
                            ? `Total: ${discountedTotal.toFixed(2)} | Down: ${Math.min(downPayment, discountedTotal).toFixed(2)} | Remaining: ${Math.max(0, remaining).toFixed(2)}`
                            : `Total: ${discountedTotal.toFixed(2)} | Remaining: ${discountedTotal.toFixed(2)}`;
                        })()}
                      </small>
                    </div>
                  )}
              </div>

              <div className="form-group">
                <label>Shop *</label>
                <select
                  value={formData.shop}
                  onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
                  required
                >
                  <option value="">Select shop</option>
                  {SHOP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mode of Payment *</label>
                <select
                  value={formData.modeOfPayment}
                  onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                  required
                >
                  <option value="">Select mode of payment</option>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </Modal>

          <Modal
            isOpen={detailsOpen}
            title={selectedOrder ? `Order Details - ${selectedOrder.jobOrderNo}` : 'Order Details'}
            onClose={closeDetails}
            cancelText="Close"
          >
            {selectedOrder && (
              <div className="order-details-panel">
                <div className="order-details-grid">
                  <div>
                    <span>Client</span>
                    <strong>{selectedOrder.clientName}</strong>
                  </div>
                  <div>
                    <span>Shop</span>
                    <strong>{selectedOrder.shop}</strong>
                  </div>
                  <div>
                    <span>Mode of Payment</span>
                    <strong>{selectedOrder.modeOfPayment}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{getStatusLabel(selectedOrder.status)}</strong>
                  </div>
                </div>

                <div className="order-details-summary">
                  <p>
                    Total: <strong>PHP {((Number(selectedOrder.price) || 0) * (Number(selectedOrder.quantity) || 0)).toFixed(2)}</strong>
                  </p>
                  <p>
                    Down Payment: <strong>PHP {(Number(selectedOrder.downPayment) || 0).toFixed(2)}</strong>
                  </p>
                </div>

                {(selectedOrder.status === ORDER_STATUS.FOR_CLIENT_APPROVAL ||
                  selectedOrder.status === ORDER_STATUS.NOT_APPROVED ||
                  !selectedOrder.status) && (
                  <div className="order-status-actions">
                    <p className="order-status-prompt">For client approval</p>
                    <div className="order-status-buttons">
                      <button
                        type="button"
                        className="status-btn status-btn-secondary"
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.NOT_APPROVED)}
                      >
                        Not Approved
                      </button>
                      <button
                        type="button"
                        className="status-btn status-btn-primary"
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.DOWN_PAYMENT_PENDING)}
                      >
                        Approved
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status === ORDER_STATUS.DOWN_PAYMENT_PENDING && (
                  <div className="order-status-actions">
                    <p className="order-status-prompt">Down amount paid?</p>
                    <div className="order-status-buttons">
                      <button
                        type="button"
                        className="status-btn status-btn-secondary"
                        onClick={() => alert('No changes made.')}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className="status-btn status-btn-primary"
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.IN_PRODUCTION)}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )}

                {(selectedOrder.status === ORDER_STATUS.IN_PRODUCTION ||
                  selectedOrder.status === ORDER_STATUS.NOT_YET_FULLY_PAID) && (
                  <div className="order-status-actions">
                    {selectedOrder.status === ORDER_STATUS.IN_PRODUCTION ||
                    selectedOrder.status === ORDER_STATUS.NOT_YET_FULLY_PAID ? (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Reference Number</label>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Enter reference number"
                        />
                      </div>
                    ) : null}

                    <p className="order-status-prompt">Full amount paid?</p>
                    <div className="order-status-buttons">
                      <button
                        type="button"
                        className="status-btn status-btn-secondary"
                        onClick={() => updateSelectedOrderStatus(ORDER_STATUS.NOT_YET_FULLY_PAID)}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className="status-btn status-btn-primary"
                        onClick={handleFullPaymentYes}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status === ORDER_STATUS.FULLY_PAID && (
                  <div className="order-status-actions success">
                    <p className="order-status-prompt">This order is fully paid / completed.</p>
                  </div>
                )}

                {selectedOrder.status !== ORDER_STATUS.CANCELLED &&
                  selectedOrder.status !== ORDER_STATUS.FULLY_PAID && (
                  <div className="order-status-actions">
                    <button
                      type="button"
                      className="status-btn status-btn-secondary"
                      onClick={handleCancelSelectedOrder}
                    >
                      Order Cancelled
                    </button>
                  </div>
                )}

                {selectedOrder.status === ORDER_STATUS.CANCELLED && (
                  <div className="order-status-actions success">
                    <p className="order-status-prompt">This order is cancelled.</p>
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
