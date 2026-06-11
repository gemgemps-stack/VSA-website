package sports.apparel.backend.features.orders;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    @NotNull(message = "Client ID is required")
    private UUID clientId;

    private String teamName;

    @NotBlank(message = "Order retail is required")
    private String orderRetail;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private String freebie;

    @DecimalMin(value = "0.0", message = "Discount must be non-negative")
    private BigDecimal discount;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private BigDecimal price;

    @DecimalMin(value = "0.0", message = "Down payment must be non-negative")
    private BigDecimal downPayment;

    @NotBlank(message = "Shop is required")
    private String shop;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    @NotBlank(message = "Mode of payment is required")
    private String modeOfPayment;

    private String remarks;

    private String referenceNumber;

    private String status;
}
