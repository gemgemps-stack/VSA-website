package sports.apparel.backend.features.customizedorders;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.CustomizedOrder;
import sports.apparel.backend.features.clients.ClientRepository;
import sports.apparel.backend.features.income.IncomeSourceService;
import sports.apparel.backend.features.income.PaymentUpdateRequest;

import sports.apparel.backend.entity.CustomizedOrderItem;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class CustomizedOrderService {

    public static final String STATUS_FOR_CLIENT_APPROVAL = "FOR_CLIENT_APPROVAL";
    public static final String STATUS_NOT_APPROVED = "NOT_APPROVED";
    public static final String STATUS_DOWN_PAYMENT_PENDING = "DOWN_PAYMENT_PENDING";
    public static final String STATUS_IN_PRODUCTION = "IN_PRODUCTION";
    public static final String STATUS_NOT_YET_FULLY_PAID = "NOT_YET_FULLY_PAID";
    public static final String STATUS_FULLY_PAID = "FULLY_PAID";
    public static final String STATUS_CANCELLED = "CANCELLED";

    private final CustomizedOrderRepository customizedOrderRepository;
    private final ClientRepository clientRepository;
    private final CustomizedJobOrderNumberService jobOrderNumberService;
    private final IncomeSourceService incomeSourceService;

    public CustomizedOrderService(CustomizedOrderRepository customizedOrderRepository,
                                  ClientRepository clientRepository,
                                  CustomizedJobOrderNumberService jobOrderNumberService,
                                  IncomeSourceService incomeSourceService) {
        this.customizedOrderRepository = customizedOrderRepository;
        this.clientRepository = clientRepository;
        this.jobOrderNumberService = jobOrderNumberService;
        this.incomeSourceService = incomeSourceService;
    }

    public CustomizedOrderDTO createOrder(CreateCustomizedOrderRequest request) {
        Client client = null;
        if (request.getClientId() != null) {
            client = clientRepository.findById(request.getClientId())
                    .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        }
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        CustomizedOrder order = new CustomizedOrder();
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

        if (request.getItems() != null) {
            List<CustomizedOrderItem> items = request.getItems().stream().map(itemReq -> {
                CustomizedOrderItem item = new CustomizedOrderItem();
                item.setProductName(itemReq.getProductName());
                item.setUnitPrice(itemReq.getUnitPrice());
                item.setQuantity(itemReq.getQuantity());
                item.setCustomizedOrder(order);
                return item;
            }).collect(Collectors.toList());
            order.setItems(items);
        }

        populateLegacySummaryFields(order);

        CustomizedOrder savedOrder = customizedOrderRepository.save(order);

        BigDecimal paymentAmount = determineInitialPaymentAmount(savedOrder, request.getDownPayment());
        if (paymentAmount.compareTo(BigDecimal.ZERO) > 0) {
            recordIncomeForOrder(savedOrder, paymentAmount, request.getReferenceNumber(), null);
        }

        return new CustomizedOrderDTO(savedOrder);
    }

    public CustomizedOrderDTO getOrderById(UUID id) {
        CustomizedOrder order = customizedOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return new CustomizedOrderDTO(order);
    }

    public CustomizedOrderDTO getOrderByJobOrderNo(String jobOrderNo) {
        CustomizedOrder order = customizedOrderRepository.findByJobOrderNo(jobOrderNo)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return new CustomizedOrderDTO(order);
    }

    public Page<CustomizedOrderDTO> getAllOrders(Pageable pageable) {
        return customizedOrderRepository.findAll(pageable)
                .map(CustomizedOrderDTO::new);
    }

    public List<CustomizedOrderDTO> getOrdersByClientId(UUID clientId) {
        return customizedOrderRepository.findByClientId(clientId).stream()
                .map(CustomizedOrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<CustomizedOrderDTO> getOrdersByDateRange(LocalDate startDate, LocalDate endDate) {
        return customizedOrderRepository.findByOrderDateBetween(startDate, endDate).stream()
                .map(CustomizedOrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<CustomizedOrderDTO> getOrdersByYearAndMonth(int year, int month) {
        return customizedOrderRepository.findByYearAndMonth(year, month).stream()
                .map(CustomizedOrderDTO::new)
                .collect(Collectors.toList());
    }

    public List<CustomizedOrderDTO> getOrdersByStatus(String status) {
        return customizedOrderRepository.findByStatus(status).stream()
                .map(CustomizedOrderDTO::new)
                .collect(Collectors.toList());
    }

    public CustomizedOrderDTO updateOrder(UUID id, CreateCustomizedOrderRequest request) {
        CustomizedOrder order = customizedOrderRepository.findById(id)
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
            List<CustomizedOrderItem> existingItems = order.getItems();
            List<UUID> requestItemIds = request.getItems().stream()
                    .map(CreateCustomizedOrderRequest.ItemRequest::getId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());

            // Remove items not in the request
            existingItems.removeIf(item -> !requestItemIds.contains(item.getId()));

            // Update or Add items
            for (CreateCustomizedOrderRequest.ItemRequest itemReq : request.getItems()) {
                if (itemReq.getId() != null) {
                    // Update existing item
                    existingItems.stream()
                            .filter(item -> item.getId().equals(itemReq.getId()))
                            .findFirst()
                            .ifPresent(item -> {
                                item.setProductName(itemReq.getProductName());
                                item.setUnitPrice(itemReq.getUnitPrice());
                                item.setQuantity(itemReq.getQuantity());
                            });
                } else {
                    // Add new item
                    CustomizedOrderItem newItem = new CustomizedOrderItem();
                    newItem.setProductName(itemReq.getProductName());
                    newItem.setUnitPrice(itemReq.getUnitPrice());
                    newItem.setQuantity(itemReq.getQuantity());
                    newItem.setCustomizedOrder(order);
                    existingItems.add(newItem);
                }
            }
        }

        populateLegacySummaryFields(order);

        if (STATUS_FULLY_PAID.equalsIgnoreCase(newStatus) && !STATUS_FULLY_PAID.equalsIgnoreCase(oldStatus)) {
            BigDecimal remainingBalance = calculateRemainingBalance(order);
            if (remainingBalance.compareTo(BigDecimal.ZERO) > 0) {
                recordIncomeForOrder(order, remainingBalance, request.getReferenceNumber(), null);
            }
        }

        CustomizedOrder updatedOrder = customizedOrderRepository.save(order);
        return new CustomizedOrderDTO(updatedOrder);
    }

    private BigDecimal calculateTotalDue(CustomizedOrder order) {
        BigDecimal total = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;
        BigDecimal discountPercent = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        return total.multiply(BigDecimal.ONE.subtract(discountPercent.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)));
    }

    private BigDecimal getRecordedPayments(CustomizedOrder order) {
        return incomeSourceService.getTotalIncomeByJobOrderNo(order.getJobOrderNo());
    }

    private BigDecimal calculateRemainingBalance(CustomizedOrder order) {
        BigDecimal remaining = calculateTotalDue(order).subtract(getRecordedPayments(order));
        return remaining.compareTo(BigDecimal.ZERO) > 0 ? remaining : BigDecimal.ZERO;
    }

    private BigDecimal determineInitialPaymentAmount(CustomizedOrder order, BigDecimal requestedDownPayment) {
        BigDecimal totalDue = calculateTotalDue(order);
        if (totalDue.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (STATUS_FULLY_PAID.equalsIgnoreCase(order.getStatus())) {
            return totalDue;
        }

        BigDecimal downPayment = requestedDownPayment != null ? requestedDownPayment : BigDecimal.ZERO;
        return downPayment.min(totalDue);
    }

    private void recordIncomeForOrder(CustomizedOrder order, BigDecimal amount, String referenceNumber, String checkNumber) {
        BigDecimal paymentAmount = amount != null ? amount : BigDecimal.ZERO;
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        sports.apparel.backend.features.income.CreateIncomeSourceRequest incomeRequest = new sports.apparel.backend.features.income.CreateIncomeSourceRequest();
        incomeRequest.setAmount(paymentAmount);
        incomeRequest.setIncomeDate(LocalDate.now());
        incomeRequest.setJobOrderNo(order.getJobOrderNo());
        incomeRequest.setPaymentMethod(order.getModeOfPayment());
        incomeRequest.setShopType(order.getShop());
        incomeRequest.setReferenceNumber(referenceNumber != null && !referenceNumber.isBlank() ? referenceNumber : order.getReferenceNumber());
        incomeRequest.setCheckNumber(checkNumber);
        incomeRequest.setClientName(order.getClientName());
        if (order.getClient() != null) {
            incomeRequest.setClientId(order.getClient().getId());
        }

        incomeSourceService.createIncomeSource(incomeRequest);
    }

    public CustomizedOrderDTO applyPaymentUpdate(UUID id, PaymentUpdateRequest request) {
        CustomizedOrder order = customizedOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        BigDecimal remainingBalance = calculateRemainingBalance(order);
        BigDecimal amount = request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO;

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        if (remainingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("This order is already fully paid");
        }

        if (amount.compareTo(remainingBalance) > 0) {
            throw new IllegalArgumentException("Payment update cannot exceed the remaining balance");
        }

        recordIncomeForOrder(order, amount, request.getReferenceNumber(), request.getCheckNumber());
        order.setRemarks(request.getRemarks() != null ? request.getRemarks() : order.getRemarks());
        if (amount.compareTo(remainingBalance) >= 0) {
            order.setStatus(STATUS_FULLY_PAID);
        } else {
            order.setStatus(STATUS_NOT_YET_FULLY_PAID);
        }

        CustomizedOrder updatedOrder = customizedOrderRepository.save(order);
        return new CustomizedOrderDTO(updatedOrder);
    }

    private void populateLegacySummaryFields(CustomizedOrder order) {
        List<CustomizedOrderItem> items = order.getItems();
        if (items == null || items.isEmpty()) {
            order.setOrderRetail("");
            order.setQuantity(0);
            order.setPrice(BigDecimal.ZERO);
            return;
        }

        String orderRetail = items.stream()
                .map(CustomizedOrderItem::getProductName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));
        if (orderRetail.length() > 255) {
            orderRetail = orderRetail.substring(0, 255);
        }

        int quantity = items.stream()
                .map(CustomizedOrderItem::getQuantity)
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

    private String resolveStatus(String requestedStatus, String fallbackStatus) {
        if (requestedStatus == null || requestedStatus.isBlank()) {
            return fallbackStatus;
        }
        return requestedStatus;
    }

    public void deleteOrder(UUID id) {
        CustomizedOrder order = customizedOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        customizedOrderRepository.delete(order);
    }
}
