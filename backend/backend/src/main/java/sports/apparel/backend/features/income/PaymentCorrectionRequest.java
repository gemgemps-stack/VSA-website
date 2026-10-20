package sports.apparel.backend.features.income;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCorrectionRequest {

    @NotNull(message = "Corrected amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Corrected amount must be greater than 0")
    private BigDecimal amount;

    private LocalDate incomeDate;

    private String paymentMethod;

    private String referenceNumber;

    private String checkNumber;

    private String paymentCategory;

    private String remarks;
}
