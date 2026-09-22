package sports.apparel.backend.features.returneditems;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReturnedItemRequest {

    private UUID orderId;

    private UUID customizedOrderId;

    private String productName;

    private String size;

    private String number;

    private String jerseyType;

    private Integer quantity;

    private String reason;

    private LocalDate returnDate;
}