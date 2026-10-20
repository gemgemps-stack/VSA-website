package sports.apparel.backend.features.income;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.IncomeSource;
import sports.apparel.backend.features.clients.ClientRepository;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.orders.OrderRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional
public class IncomeSourceService {

    private final IncomeSourceRepository incomeSourceRepository;
    private final ClientRepository clientRepository;
    private final OrderRepository orderRepository;
    private final CustomizedOrderRepository customizedOrderRepository;

    public IncomeSourceService(IncomeSourceRepository incomeSourceRepository, ClientRepository clientRepository,
                               OrderRepository orderRepository, CustomizedOrderRepository customizedOrderRepository) {
        this.incomeSourceRepository = incomeSourceRepository;
        this.clientRepository = clientRepository;
        this.orderRepository = orderRepository;
        this.customizedOrderRepository = customizedOrderRepository;
    }

    private String resolveTeamName(String jobOrderNo, String fallbackTeamName) {
        if (fallbackTeamName != null && !fallbackTeamName.isBlank()) {
            return fallbackTeamName.trim();
        }
        if (jobOrderNo == null || jobOrderNo.isBlank()) {
            return null;
        }
        return orderRepository.findByJobOrderNo(jobOrderNo)
                .map(order -> order.getTeamName())
                .filter(teamName -> teamName != null && !teamName.isBlank())
                .or(() -> customizedOrderRepository.findByJobOrderNo(jobOrderNo)
                        .map(order -> order.getTeamName())
                        .filter(teamName -> teamName != null && !teamName.isBlank()))
                .orElse(null);
    }

    public IncomeSourceDTO createIncomeSource(CreateIncomeSourceRequest request) {
        IncomeSource incomeSource = new IncomeSource();
        incomeSource.setShopType(request.getShopType());
        incomeSource.setPaymentMethod(request.getPaymentMethod());
        incomeSource.setIncomeDate(request.getIncomeDate());
        incomeSource.setJobOrderNo(request.getJobOrderNo());
        incomeSource.setAmount(request.getAmount());
        incomeSource.setReferenceNumber(resolveReferenceNumber(request));
        incomeSource.setCheckNumber(request.getCheckNumber());
        incomeSource.setPaymentCategory(request.getPaymentCategory());
        incomeSource.setRemarks(request.getRemarks());
        incomeSource.setTeamName(resolveTeamName(request.getJobOrderNo(), request.getTeamName()));

        // Set client relationship
        if (request.getClientId() != null) {
            Optional<Client> client = clientRepository.findById(request.getClientId());
            client.ifPresent(incomeSource::setClient);
        } else if (request.getClientCode() != null) {
            Optional<Client> client = clientRepository.findByClientCode(request.getClientCode());
            client.ifPresent(incomeSource::setClient);
        }

        // Set clientCode as fallback if not found in relationship
        if (incomeSource.getClient() == null && request.getClientCode() != null) {
            incomeSource.setClientCode(request.getClientCode());
        }

        // Preserve client name for walk-ins and registered clients
        if (incomeSource.getClient() != null) {
            incomeSource.setClientName(incomeSource.getClient().getClientName());
        } else {
            incomeSource.setClientName(request.getClientName());
        }

        IncomeSource savedIncomeSource = incomeSourceRepository.save(incomeSource);
        return new IncomeSourceDTO(savedIncomeSource);
    }

    private String resolveReferenceNumber(CreateIncomeSourceRequest request) {
        if (request.getReferenceNumber() != null && !request.getReferenceNumber().isBlank()) {
            return request.getReferenceNumber();
        }

        if (!isLiquidationRequest(request)) {
            return request.getReferenceNumber();
        }

        LocalDate incomeDate = request.getIncomeDate() != null ? request.getIncomeDate() : LocalDate.now();
        String prefix = "LIQ-" + incomeDate.toString().replace("-", "");

        int nextSequence = incomeSourceRepository.findByIncomeDate(incomeDate).stream()
                .map(IncomeSource::getReferenceNumber)
                .filter(reference -> reference != null && reference.startsWith(prefix))
                .map(IncomeSourceService::extractLiquidationSequence)
                .filter(sequence -> sequence != null && sequence > 0)
                .mapToInt(Integer::intValue)
                .max()
                .orElse(0) + 1;

        return String.format("%s-%04d", prefix, nextSequence);
    }

    private boolean isLiquidationRequest(CreateIncomeSourceRequest request) {
        if (request == null) {
            return false;
        }

        String paymentCategory = request.getPaymentCategory() != null ? request.getPaymentCategory().trim() : "";
        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod().trim() : "";
        return "LIQUIDATION".equalsIgnoreCase(paymentCategory) || "Liquidation".equalsIgnoreCase(paymentMethod);
    }

    private static Integer extractLiquidationSequence(String referenceNumber) {
        if (referenceNumber == null || referenceNumber.isBlank()) {
            return null;
        }

        Matcher matcher = Pattern.compile("-(\\d{4})$").matcher(referenceNumber.trim());
        if (!matcher.find()) {
          return null;
        }

        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public BigDecimal getTotalIncomeByJobOrderNo(String jobOrderNo) {
        if (jobOrderNo == null || jobOrderNo.isBlank()) {
            return BigDecimal.ZERO;
        }

        return incomeSourceRepository.findByJobOrderNo(jobOrderNo).stream()
                .map(income -> income.getAmount() != null ? income.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void syncOrderPayment(CreateIncomeSourceRequest request) {
        if (request.getJobOrderNo() == null || request.getJobOrderNo().isBlank()) {
            return;
        }

        IncomeSource existingPayment = findOrderPaymentEntry(request.getJobOrderNo(), request.getPaymentCategory());
        BigDecimal amount = request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO;

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            if (existingPayment != null) {
                incomeSourceRepository.delete(existingPayment);
            }
            return;
        }

        if (existingPayment == null) {
            createIncomeSource(request);
            return;
        }

        existingPayment.setShopType(request.getShopType());
        existingPayment.setPaymentMethod(request.getPaymentMethod());
        existingPayment.setIncomeDate(request.getIncomeDate());
        existingPayment.setAmount(amount);
        existingPayment.setReferenceNumber(request.getReferenceNumber());
        existingPayment.setCheckNumber(request.getCheckNumber());
        existingPayment.setPaymentCategory(request.getPaymentCategory());
        existingPayment.setRemarks(request.getRemarks());
        existingPayment.setTeamName(resolveTeamName(request.getJobOrderNo(), request.getTeamName()));

        if (request.getClientId() != null) {
            Optional<Client> client = clientRepository.findById(request.getClientId());
            client.ifPresent(existingPayment::setClient);
        } else if (request.getClientCode() != null) {
            Optional<Client> client = clientRepository.findByClientCode(request.getClientCode());
            client.ifPresent(existingPayment::setClient);
        } else {
            existingPayment.setClient(null);
        }

        if (existingPayment.getClient() == null && request.getClientCode() != null) {
            existingPayment.setClientCode(request.getClientCode());
        } else {
            existingPayment.setClientCode(null);
        }

        if (existingPayment.getClient() != null) {
            existingPayment.setClientName(existingPayment.getClient().getClientName());
        } else {
            existingPayment.setClientName(request.getClientName());
        }

        incomeSourceRepository.save(existingPayment);
    }

    private IncomeSource findOrderPaymentEntry(String jobOrderNo, String paymentCategory) {
        List<IncomeSource> entries = incomeSourceRepository.findByJobOrderNoOrderByCreatedAtAsc(jobOrderNo);
        if (entries.isEmpty()) {
            return null;
        }

        if (paymentCategory != null && !paymentCategory.isBlank()) {
            Optional<IncomeSource> categorizedEntry = entries.stream()
                    .filter(entry -> paymentCategory.equalsIgnoreCase(entry.getPaymentCategory()))
                    .findFirst();
            if (categorizedEntry.isPresent()) {
                return categorizedEntry.get();
            }
        }

        return entries.get(0);
    }

    public IncomeSourceDTO getIncomeSourceById(UUID id) {
        IncomeSource incomeSource = incomeSourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Income source not found"));
        return new IncomeSourceDTO(incomeSource);
    }

    public Page<IncomeSourceDTO> getAllIncomeSources(Pageable pageable) {
        return incomeSourceRepository.findAll(pageable)
                .map(IncomeSourceDTO::new);
    }

    public List<IncomeSourceDTO> getIncomeSourceByDate(LocalDate date) {
        return incomeSourceRepository.findByIncomeDate(date).stream()
                .map(IncomeSourceDTO::new)
                .collect(Collectors.toList());
    }

    public List<IncomeSourceDTO> getIncomeSourcesByDateRange(LocalDate startDate, LocalDate endDate) {
        return incomeSourceRepository.findByIncomeDateBetween(startDate, endDate).stream()
                .map(IncomeSourceDTO::new)
                .collect(Collectors.toList());
    }

    public IncomeSourceDTO updateIncomeSource(UUID id, CreateIncomeSourceRequest request) {
        IncomeSource incomeSource = incomeSourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Income source not found"));

        incomeSource.setShopType(request.getShopType());
        incomeSource.setPaymentMethod(request.getPaymentMethod());
        incomeSource.setIncomeDate(request.getIncomeDate());
        incomeSource.setJobOrderNo(request.getJobOrderNo());
        incomeSource.setAmount(request.getAmount());
        incomeSource.setReferenceNumber(request.getReferenceNumber());
        incomeSource.setCheckNumber(request.getCheckNumber());
        incomeSource.setRemarks(request.getRemarks());
        incomeSource.setTeamName(resolveTeamName(request.getJobOrderNo(), request.getTeamName()));
        if (request.getPaymentCategory() != null) {
            incomeSource.setPaymentCategory(request.getPaymentCategory());
        }

        // Update client relationship
        if (request.getClientId() != null) {
            Optional<Client> client = clientRepository.findById(request.getClientId());
            client.ifPresent(incomeSource::setClient);
        } else if (request.getClientCode() != null) {
            Optional<Client> client = clientRepository.findByClientCode(request.getClientCode());
            client.ifPresent(incomeSource::setClient);
        } else {
            incomeSource.setClient(null);
        }

        // Set clientCode as fallback if not found in relationship
        if (incomeSource.getClient() == null && request.getClientCode() != null) {
            incomeSource.setClientCode(request.getClientCode());
        } else {
            incomeSource.setClientCode(null);
        }

        // Preserve client name for walk-ins and registered clients
        if (incomeSource.getClient() != null) {
            incomeSource.setClientName(incomeSource.getClient().getClientName());
        } else {
            incomeSource.setClientName(request.getClientName());
        }

        IncomeSource updatedIncomeSource = incomeSourceRepository.save(incomeSource);
        return new IncomeSourceDTO(updatedIncomeSource);
    }

    public void deleteIncomeSource(UUID id) {
        IncomeSource incomeSource = incomeSourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Income source not found"));
        incomeSourceRepository.delete(incomeSource);
    }

    public IncomeSourceDTO correctPayment(UUID id, PaymentCorrectionRequest request) {
        IncomeSource incomeSource = incomeSourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Income source not found"));

        BigDecimal correctedAmount = request.getAmount();
        if (correctedAmount == null || correctedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Corrected amount must be greater than zero");
        }

        incomeSource.setAmount(correctedAmount);
        if (request.getIncomeDate() != null) {
            incomeSource.setIncomeDate(request.getIncomeDate());
        }
        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            incomeSource.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getPaymentCategory() != null && !request.getPaymentCategory().isBlank()) {
            incomeSource.setPaymentCategory(request.getPaymentCategory());
        }
        incomeSource.setReferenceNumber(request.getReferenceNumber());
        incomeSource.setCheckNumber(request.getCheckNumber());
        incomeSource.setRemarks(request.getRemarks());

        IncomeSource savedIncomeSource = incomeSourceRepository.save(incomeSource);
        recalculateLinkedOrderPaymentStatus(savedIncomeSource.getJobOrderNo());
        return new IncomeSourceDTO(savedIncomeSource);
    }

    private void recalculateLinkedOrderPaymentStatus(String jobOrderNo) {
        if (jobOrderNo == null || jobOrderNo.isBlank()) {
            return;
        }

        BigDecimal totalPaid = getTotalIncomeByJobOrderNo(jobOrderNo);

        Optional<sports.apparel.backend.entity.Order> inventoryOrder = orderRepository.findByJobOrderNo(jobOrderNo);
        if (inventoryOrder.isPresent()) {
            sports.apparel.backend.entity.Order order = inventoryOrder.get();
            BigDecimal totalDue = calculateOrderTotalDue(order);
            if (totalDue.compareTo(BigDecimal.ZERO) > 0) {
                order.setStatus(totalPaid.compareTo(totalDue) >= 0 ? "FULLY_PAID" : "NOT_YET_FULLY_PAID");
                orderRepository.save(order);
            }
            return;
        }

        Optional<sports.apparel.backend.entity.CustomizedOrder> customizedOrder = customizedOrderRepository.findByJobOrderNo(jobOrderNo);
        if (customizedOrder.isPresent()) {
            sports.apparel.backend.entity.CustomizedOrder order = customizedOrder.get();
            BigDecimal totalDue = calculateCustomizedOrderTotalDue(order);
            if (totalDue.compareTo(BigDecimal.ZERO) > 0) {
                order.setStatus(totalPaid.compareTo(totalDue) >= 0 ? "FULLY_PAID" : "NOT_YET_FULLY_PAID");
                customizedOrderRepository.save(order);
            }
        }
    }

    private BigDecimal calculateOrderTotalDue(sports.apparel.backend.entity.Order order) {
        BigDecimal total = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;
        BigDecimal discountPercent = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        return total.multiply(BigDecimal.ONE.subtract(
                discountPercent.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP)));
    }

    private BigDecimal calculateCustomizedOrderTotalDue(sports.apparel.backend.entity.CustomizedOrder order) {
        BigDecimal total = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;
        BigDecimal discountPercent = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        return total.multiply(BigDecimal.ONE.subtract(
                discountPercent.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP)));
    }
}
