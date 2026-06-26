package sports.apparel.backend.features.orders;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.features.orders.CreateOrderRequest;
import sports.apparel.backend.features.orders.OrderDTO;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.Inventory;
import sports.apparel.backend.entity.Order;
import sports.apparel.backend.features.clients.ClientRepository;
import sports.apparel.backend.features.inventory.InventoryRepository;
import sports.apparel.backend.features.orders.OrderRepository;

import java.time.LocalDate;
import java.math.BigDecimal;
import sports.apparel.backend.entity.OrderItem;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class OrderService {

    public static final String STATUS_FOR_CLIENT_APPROVAL = "FOR_CLIENT_APPROVAL";
    public static final String STATUS_NOT_APPROVED = "NOT_APPROVED";
    public static final String STATUS_DOWN_PAYMENT_PENDING = "DOWN_PAYMENT_PENDING";
    public static final String STATUS_IN_PRODUCTION = "IN_PRODUCTION";
    public static final String STATUS_NOT_YET_FULLY_PAID = "NOT_YET_FULLY_PAID";
    public static final String STATUS_FULLY_PAID = "FULLY_PAID";
    public static final String STATUS_CANCELLED = "CANCELLED";

    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final InventoryRepository inventoryRepository;
    private final JobOrderNumberService jobOrderNumberService;
    private final sports.apparel.backend.features.income.IncomeSourceService incomeSourceService;

    public OrderService(OrderRepository orderRepository, ClientRepository clientRepository,
                       InventoryRepository inventoryRepository,
                       JobOrderNumberService jobOrderNumberService,
                       sports.apparel.backend.features.income.IncomeSourceService incomeSourceService) {
        this.orderRepository = orderRepository;
        this.clientRepository = clientRepository;
        this.inventoryRepository = inventoryRepository;
        this.jobOrderNumberService = jobOrderNumberService;
        this.incomeSourceService = incomeSourceService;
    }

    public OrderDTO createOrder(CreateOrderRequest request) {
        Client client = null;
        if (request.getClientId() != null) {
            client = clientRepository.findById(request.getClientId())
                    .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        }
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        Order order = new Order();
        order.setJobOrderNo(jobOrderNumberService.generateJobOrderNumber(request.getOrderDate()));
        order.setClient(client);
        order.setClientName(request.getClientName());
        order.setTeamName(request.getTeamName());
        order.setFreebie(request.getFreebie());
        order.setDiscount(discount);
        order.setDownPayment(downPayment);
        order.setShop(request.getShop());
        order.setOrderDate(request.getOrderDate());
        order.setModeOfPayment(request.getModeOfPayment());
        order.setRemarks(request.getRemarks());
        order.setReferenceNumber(request.getReferenceNumber());
        order.setStatus(resolveStatus(request.getStatus(), STATUS_FOR_CLIENT_APPROVAL));
        order.setInventoryDeducted(false);

        // Only deduct inventory if status is DOWN_PAYMENT_PENDING or further (meaning it's approved)
        // or if it's already past approval in the request.
        // User said: For Client Approval -> (Approved by Client?) -> Down Payment Pending
        // So we deduct when it hits Down Payment Pending.

        if (request.getItems() != null) {
            List<OrderItem> items = request.getItems().stream().map(itemReq -> {
                OrderItem item = new OrderItem();
                item.setProductName(itemReq.getProductName());
                item.setUnitPrice(itemReq.getUnitPrice());
                item.setQuantity(itemReq.getQuantity());
                item.setOrder(order);
                return item;
            }).collect(Collectors.toList());
            order.setItems(items);
        }

        populateLegacySummaryFields(order);

        Order savedOrder = orderRepository.save(order);
        
        // Deduct inventory immediately upon creation for all statuses except CANCELLED
        if (!STATUS_CANCELLED.equalsIgnoreCase(savedOrder.getStatus()) && !Boolean.TRUE.equals(savedOrder.getInventoryDeducted())) {
            deductInventoryForOrder(savedOrder);
        }

        // Logic for financial reporting based on status
        if (STATUS_FULLY_PAID.equalsIgnoreCase(savedOrder.getStatus())) {
            recordIncomeForOrder(savedOrder);
        }

        orderRepository.save(savedOrder);
        return new OrderDTO(savedOrder);
    }

    private boolean shouldDeductInventory(String status) {
        return !STATUS_CANCELLED.equalsIgnoreCase(status) && !STATUS_NOT_APPROVED.equalsIgnoreCase(status);
    }

    private void recordIncomeForOrder(Order order) {
        BigDecimal total = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;
        BigDecimal discountPercent = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        BigDecimal afterDiscountTotal = total.multiply(BigDecimal.ONE.subtract(discountPercent.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP)));

        sports.apparel.backend.features.income.CreateIncomeSourceRequest incomeRequest = new sports.apparel.backend.features.income.CreateIncomeSourceRequest();
        incomeRequest.setAmount(afterDiscountTotal);
        incomeRequest.setIncomeDate(LocalDate.now());
        incomeRequest.setJobOrderNo(order.getJobOrderNo());
        incomeRequest.setPaymentMethod(order.getModeOfPayment());
        incomeRequest.setShopType(order.getShop());
        incomeRequest.setReferenceNumber(order.getReferenceNumber());
        if (order.getClient() != null) {
            incomeRequest.setClientId(order.getClient().getId());
        }
        
        incomeSourceService.createIncomeSource(incomeRequest);
    }

    private void populateLegacySummaryFields(Order order) {
        List<OrderItem> items = order.getItems();
        if (items == null || items.isEmpty()) {
            order.setOrderRetail("");
            order.setQuantity(0);
            order.setPrice(BigDecimal.ZERO);
            return;
        }

        String orderRetail = items.stream()
                .map(OrderItem::getProductName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));
        if (orderRetail.length() > 255) {
            orderRetail = orderRetail.substring(0, 255);
        }

        int quantity = items.stream()
                .map(OrderItem::getQuantity)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .sum();

        BigDecimal price = items.stream()
                .map(item -> {
                    BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                    Integer itemQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
                    return unitPrice.multiply(BigDecimal.valueOf(itemQuantity));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setOrderRetail(orderRetail.isBlank() ? "" : orderRetail);
        order.setQuantity(quantity);
        order.setPrice(price);
    }

    public OrderDTO getOrderById(UUID id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return new OrderDTO(order);
    }

    public OrderDTO getOrderByJobOrderNo(String jobOrderNo) {
        Order order = orderRepository.findByJobOrderNo(jobOrderNo)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return new OrderDTO(order);
    }

    public Page<OrderDTO> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable)
                .map(OrderDTO::new);
    }

    public List<OrderDTO> getOrdersByClientId(UUID clientId) {
        return orderRepository.findByClientId(clientId).stream()
                .map(OrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getOrdersByDateRange(LocalDate startDate, LocalDate endDate) {
        return orderRepository.findByOrderDateBetween(startDate, endDate).stream()
                .map(OrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getOrdersByYearAndMonth(int year, int month) {
        return orderRepository.findByYearAndMonth(year, month).stream()
                .map(OrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status).stream()
                .map(OrderDTO::new)
                .collect(Collectors.toList());
    }

    public OrderDTO updateOrder(UUID id, CreateOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        Client client = null;
        if (request.getClientId() != null) {
            client = clientRepository.findById(request.getClientId())
                    .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        }
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        order.setClient(client);
        order.setClientName(request.getClientName());
        order.setTeamName(request.getTeamName());
        order.setFreebie(request.getFreebie());
        order.setDiscount(discount);
        order.setDownPayment(downPayment);
        order.setShop(request.getShop());
        order.setOrderDate(request.getOrderDate());
        order.setModeOfPayment(request.getModeOfPayment());
        if (request.getRemarks() != null) {
            order.setRemarks(request.getRemarks());
        }
        if (request.getReferenceNumber() != null) {
            order.setReferenceNumber(request.getReferenceNumber());
        }
        String oldStatus = order.getStatus();
        order.setStatus(resolveStatus(request.getStatus(), order.getStatus()));
        String newStatus = order.getStatus();

        if (request.getItems() != null) {
            order.getItems().clear();
            List<OrderItem> items = request.getItems().stream().map(itemReq -> {
                OrderItem item = new OrderItem();
                item.setProductName(itemReq.getProductName());
                item.setUnitPrice(itemReq.getUnitPrice());
                item.setQuantity(itemReq.getQuantity());
                item.setOrder(order);
                return item;
            }).collect(Collectors.toList());
            order.getItems().addAll(items);
        }

        populateLegacySummaryFields(order);

        // Inventory logic: deduct if transitioning to an active state, restore if cancelled or not approved
        if (shouldDeductInventory(newStatus) && !Boolean.TRUE.equals(order.getInventoryDeducted())) {
            deductInventoryForOrder(order);
        } else if ((STATUS_CANCELLED.equalsIgnoreCase(newStatus) || STATUS_NOT_APPROVED.equalsIgnoreCase(newStatus)) 
                    && Boolean.TRUE.equals(order.getInventoryDeducted())) {
            restoreInventoryForOrder(order);
        }

        // Financial logic: record income if transitioning to FULLY_PAID
        if (STATUS_FULLY_PAID.equalsIgnoreCase(newStatus) && !STATUS_FULLY_PAID.equalsIgnoreCase(oldStatus)) {
            recordIncomeForOrder(order);
        }

        Order updatedOrder = orderRepository.save(order);
        return new OrderDTO(updatedOrder);
    }

    private String resolveStatus(String requestedStatus, String fallbackStatus) {
        if (requestedStatus == null || requestedStatus.isBlank()) {
            return fallbackStatus;
        }
        return requestedStatus;
    }

    private void deductInventoryForOrder(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            order.setInventoryDeducted(false);
            return;
        }

        for (OrderItem item : order.getItems()) {
            Inventory inventory = findInventoryByRetailLabel(item.getProductName());
            if (inventory != null) {
                int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
                int orderedQuantity = item.getQuantity() != null ? item.getQuantity() : 0;

                if (orderedQuantity > 0 && currentStock >= orderedQuantity) {
                    inventory.setQuantity(currentStock - orderedQuantity);
                    inventoryRepository.save(inventory);
                }
            }
        }
        order.setInventoryDeducted(true);
    }

    private void restoreInventoryForOrder(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            order.setInventoryDeducted(false);
            return;
        }

        for (OrderItem item : order.getItems()) {
            Inventory inventory = findInventoryByRetailLabel(item.getProductName());
            if (inventory != null) {
                int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
                int orderedQuantity = item.getQuantity() != null ? item.getQuantity() : 0;

                inventory.setQuantity(currentStock + orderedQuantity);
                inventoryRepository.save(inventory);
            }
        }
        order.setInventoryDeducted(false);
    }

    private Inventory findInventoryByRetailLabel(String retailLabel) {
        if (retailLabel == null || retailLabel.isBlank()) {
            return null;
        }

        return inventoryRepository.findAll().stream()
                .filter(inventory -> buildInventoryLabel(inventory).equalsIgnoreCase(retailLabel.trim()))
                .findFirst()
                .orElse(null);
    }

    private String buildInventoryLabel(Inventory inventory) {
        String itemType = inventory.getItemType() != null ? inventory.getItemType() : "Inventory Item";
        String shopSuffix = (inventory.getShop() != null && !inventory.getShop().isBlank()) ? " (" + inventory.getShop() + ")" : "";

        if ("Jersey".equalsIgnoreCase(itemType) && inventory.getJerseyType() != null && !inventory.getJerseyType().isBlank()) {
            return String.format("%s - %s - %s%s", itemType, inventory.getJerseyType(), inventory.getName(), shopSuffix);
        }

        return String.format("%s - %s%s", itemType, inventory.getName(), shopSuffix);
    }

    public void deleteOrder(UUID id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        try {
            if (Boolean.TRUE.equals(order.getInventoryDeducted())) {
                restoreInventoryForOrder(order);
            }
            orderRepository.delete(order);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to delete order: " + e.getMessage(), e);
        }
    }
}
