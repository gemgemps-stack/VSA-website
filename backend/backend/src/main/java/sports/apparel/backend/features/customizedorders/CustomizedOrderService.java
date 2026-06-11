package sports.apparel.backend.features.customizedorders;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.CustomizedOrder;
import sports.apparel.backend.features.clients.ClientRepository;

import java.math.BigDecimal;
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

    public CustomizedOrderService(CustomizedOrderRepository customizedOrderRepository,
                                  ClientRepository clientRepository,
                                  CustomizedJobOrderNumberService jobOrderNumberService) {
        this.customizedOrderRepository = customizedOrderRepository;
        this.clientRepository = clientRepository;
        this.jobOrderNumberService = jobOrderNumberService;
    }

    public CustomizedOrderDTO createOrder(CreateCustomizedOrderRequest request) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal downPayment = request.getDownPayment() != null ? request.getDownPayment() : BigDecimal.ZERO;

        CustomizedOrder order = new CustomizedOrder();
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
        order.setRemarks(request.getRemarks());
        order.setReferenceNumber(request.getReferenceNumber());
        order.setStatus(resolveStatus(request.getStatus(), STATUS_FOR_CLIENT_APPROVAL));

        CustomizedOrder savedOrder = customizedOrderRepository.save(order);
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
        if (request.getRemarks() != null) {
            order.setRemarks(request.getRemarks());
        }
        if (request.getReferenceNumber() != null) {
            order.setReferenceNumber(request.getReferenceNumber());
        }
        order.setStatus(resolveStatus(request.getStatus(), order.getStatus()));

        CustomizedOrder updatedOrder = customizedOrderRepository.save(order);
        return new CustomizedOrderDTO(updatedOrder);
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
