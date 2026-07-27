package sports.apparel.backend.features.orders;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    private UUID clientId;

    private String clientName;

    private String teamName;

    private List<ItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRequest {
        private String productName;
        private String size;
        private String number;
        private String jerseyType;
        private BigDecimal unitPrice;
        private Integer quantity;
    }

    private String orderRetail;

    private Integer quantity;

    private String freebie;

    private BigDecimal discount;

    private BigDecimal price;

    @DecimalMin(value = "0.0", message = "Down payment must be non-negative")
    private BigDecimal downPayment;

    @NotBlank(message = "Shop is required")
    private String shop;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    private String modeOfPayment;

    private String remarks;

    private String referenceNumber;

    private String checkNumber;

    private String status;
}
