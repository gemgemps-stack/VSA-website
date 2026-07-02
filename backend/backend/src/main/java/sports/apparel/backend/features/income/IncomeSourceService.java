package sports.apparel.backend.features.income;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.entity.IncomeSource;
import sports.apparel.backend.features.clients.ClientRepository;

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

    public IncomeSourceService(IncomeSourceRepository incomeSourceRepository, ClientRepository clientRepository) {
        this.incomeSourceRepository = incomeSourceRepository;
        this.clientRepository = clientRepository;
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
}
