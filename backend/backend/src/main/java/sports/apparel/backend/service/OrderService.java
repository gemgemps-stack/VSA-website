package sports.apparel.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.CreateOrderRequest;
import sports.apparel.backend.dto.OrderDTO;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.Inventory;
import sports.apparel.backend.entity.Order;
import sports.apparel.backend.repository.ClientRepository;
import sports.apparel.backend.repository.InventoryRepository;
import sports.apparel.backend.repository.OrderRepository;

import java.time.LocalDate;
import java.math.BigDecimal;
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

    public OrderService(OrderRepository orderRepository, ClientRepository clientRepository,
                       InventoryRepository inventoryRepository,
                       JobOrderNumberService jobOrderNumberService) {
        this.orderRepository = orderRepository;
        this.clientRepository = clientRepository;
        this.inventoryRepository = inventoryRepository;
        this.jobOrderNumberService = jobOrderNumberService;
    }

    public OrderDTO createOrder(CreateOrderRequest request) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        Order order = new Order();
        order.setJobOrderNo(jobOrderNumberService.generateJobOrderNumber(request.getOrderDate()));
        order.setClient(client);
        order.setTeamName(request.getTeamName());
        order.setOrderRetail(request.getOrderRetail());
        order.setQuantity(request.getQuantity());
        order.setFreebie(request.getFreebie());
        order.setDiscount(discount);
        order.setPrice(request.getPrice());
        order.setDownPayment(downPayment);
        order.setShop(request.getShop());
        order.setOrderDate(request.getOrderDate());
        order.setModeOfPayment(request.getModeOfPayment());
        order.setStatus(resolveStatus(request.getStatus(), STATUS_FOR_CLIENT_APPROVAL));
        order.setInventoryDeducted(false);

        Order savedOrder = orderRepository.save(order);
        if (!STATUS_CANCELLED.equalsIgnoreCase(savedOrder.getStatus())) {
            deductInventoryForOrder(savedOrder);
        }
        return new OrderDTO(savedOrder);
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

    public OrderDTO updateOrder(UUID id, CreateOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        order.setClient(client);
        order.setTeamName(request.getTeamName());
        order.setOrderRetail(request.getOrderRetail());
        order.setQuantity(request.getQuantity());
        order.setFreebie(request.getFreebie());
        order.setDiscount(discount);
        order.setPrice(request.getPrice());
        order.setDownPayment(downPayment);
        order.setShop(request.getShop());
        order.setOrderDate(request.getOrderDate());
        order.setModeOfPayment(request.getModeOfPayment());
        order.setStatus(resolveStatus(request.getStatus(), order.getStatus()));

        if (Boolean.TRUE.equals(order.getInventoryDeducted())) {
            restoreInventoryForOrder(order);
        }

        if (!STATUS_CANCELLED.equalsIgnoreCase(order.getStatus())) {
            deductInventoryForOrder(order);
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
        Inventory inventory = findInventoryByRetailLabel(order.getOrderRetail());
        if (inventory == null) {
            throw new IllegalArgumentException("Matching inventory item not found for order retail: " + order.getOrderRetail());
        }

        int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
        int orderedQuantity = order.getQuantity() != null ? order.getQuantity() : 0;

        if (orderedQuantity <= 0) {
            throw new IllegalArgumentException("Order quantity must be greater than zero");
        }

        if (currentStock < orderedQuantity) {
            throw new IllegalArgumentException(
                    "Insufficient inventory for " + order.getOrderRetail() + ". Available: " + currentStock);
        }

        inventory.setQuantity(currentStock - orderedQuantity);
        inventoryRepository.save(inventory);
        order.setInventoryDeducted(true);
    }

    private void restoreInventoryForOrder(Order order) {
        Inventory inventory = findInventoryByRetailLabel(order.getOrderRetail());
        if (inventory == null) {
            throw new IllegalArgumentException("Matching inventory item not found for order retail: " + order.getOrderRetail());
        }

        int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
        int orderedQuantity = order.getQuantity() != null ? order.getQuantity() : 0;

        inventory.setQuantity(currentStock + orderedQuantity);
        inventoryRepository.save(inventory);
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

        if ("Jersey".equalsIgnoreCase(itemType) && inventory.getJerseyType() != null && !inventory.getJerseyType().isBlank()) {
            return String.format("%s - %s - %s", itemType, inventory.getJerseyType(), inventory.getName());
        }

        return String.format("%s - %s", itemType, inventory.getName());
    }

    public void deleteOrder(UUID id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (Boolean.TRUE.equals(order.getInventoryDeducted())) {
            restoreInventoryForOrder(order);
        }
        orderRepository.delete(order);
    }
}
