package sports.apparel.backend.features.income;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.features.income.CreateIncomeSourceRequest;
import sports.apparel.backend.features.income.IncomeSourceDTO;
import sports.apparel.backend.entity.IncomeSource;
import sports.apparel.backend.features.income.IncomeSourceRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class IncomeSourceService {

    private final IncomeSourceRepository incomeSourceRepository;

    public IncomeSourceService(IncomeSourceRepository incomeSourceRepository) {
        this.incomeSourceRepository = incomeSourceRepository;
    }

    public IncomeSourceDTO createIncomeSource(CreateIncomeSourceRequest request) {
        IncomeSource incomeSource = new IncomeSource();
        incomeSource.setShopType(request.getShopType());
        incomeSource.setPaymentMethod(request.getPaymentMethod());
        incomeSource.setIncomeDate(request.getIncomeDate());
        incomeSource.setReferenceNumber(request.getReferenceNumber());
        incomeSource.setAmount(request.getAmount());

        IncomeSource savedIncomeSource = incomeSourceRepository.save(incomeSource);
        return new IncomeSourceDTO(savedIncomeSource);
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
        incomeSource.setReferenceNumber(request.getReferenceNumber());
        incomeSource.setAmount(request.getAmount());

        IncomeSource updatedIncomeSource = incomeSourceRepository.save(incomeSource);
        return new IncomeSourceDTO(updatedIncomeSource);
    }

    public void deleteIncomeSource(UUID id) {
        IncomeSource incomeSource = incomeSourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Income source not found"));
        incomeSourceRepository.delete(incomeSource);
    }
}
