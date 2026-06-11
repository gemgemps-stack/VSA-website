package sports.apparel.backend.features.income;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.IncomeSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncomeSourceDTO {

    private UUID id;
    private String shopType;
    private String paymentMethod;
    private LocalDate incomeDate;
    private String referenceNumber;
    private UUID clientId;
    private String clientCode;
    private String jobOrderNo;
    private BigDecimal amount;
    private LocalDateTime createdAt;

    public IncomeSourceDTO(IncomeSource incomeSource) {
        this.id = incomeSource.getId();
        this.shopType = incomeSource.getShopType();
        this.paymentMethod = incomeSource.getPaymentMethod();
        this.incomeDate = incomeSource.getIncomeDate();
        this.referenceNumber = incomeSource.getReferenceNumber();
        this.clientId = incomeSource.getClient() != null ? incomeSource.getClient().getId() : null;
        this.clientCode = incomeSource.getClient() != null ? incomeSource.getClient().getClientCode() : incomeSource.getClientCode();
        this.jobOrderNo = incomeSource.getJobOrderNo();
        this.amount = incomeSource.getAmount();
        this.createdAt = incomeSource.getCreatedAt();
    }
}
