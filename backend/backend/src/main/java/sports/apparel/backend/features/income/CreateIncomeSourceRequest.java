package sports.apparel.backend.features.income;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateIncomeSourceRequest {

    @NotBlank(message = "Shop type is required")
    private String shopType;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    @NotNull(message = "Date is required")
    private LocalDate incomeDate;

    private UUID clientId;

    private String clientCode;

    private String clientName;

    private String jobOrderNo;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
    private BigDecimal amount;

    private String referenceNumber;

    private String checkNumber;

    private String paymentCategory;
}
