package sports.apparel.backend.features.returneditems;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.ReturnedItem;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReturnedItemDTO {

    private UUID id;
    private UUID orderId;
    private UUID customizedOrderId;
    private String jobOrderNo;
    private String orderType;
    private String clientName;
    private String productName;
    private String size;
    private String number;
    private String jerseyType;
    private Integer quantity;
    private String reason;
    private LocalDate returnDate;
    private LocalDateTime createdAt;

    public ReturnedItemDTO(ReturnedItem returnedItem) {
        this.id = returnedItem.getId();
        this.orderId = returnedItem.getOrder() != null ? returnedItem.getOrder().getId() : null;
        this.customizedOrderId = returnedItem.getCustomizedOrder() != null ? returnedItem.getCustomizedOrder().getId() : null;
        this.jobOrderNo = returnedItem.getOrder() != null
                ? returnedItem.getOrder().getJobOrderNo()
                : (returnedItem.getCustomizedOrder() != null ? returnedItem.getCustomizedOrder().getJobOrderNo() : null);
        this.orderType = returnedItem.getOrder() != null ? "RETAIL" : "CUSTOMIZED";
        this.clientName = returnedItem.getOrder() != null
                ? returnedItem.getOrder().getClientName()
                : (returnedItem.getCustomizedOrder() != null ? returnedItem.getCustomizedOrder().getClientName() : null);
        this.productName = returnedItem.getProductName();
        this.size = returnedItem.getSize();
        this.number = returnedItem.getNumber();
        this.jerseyType = returnedItem.getJerseyType();
        this.quantity = returnedItem.getQuantity();
        this.reason = returnedItem.getReason();
        this.returnDate = returnedItem.getReturnDate();
        this.createdAt = returnedItem.getCreatedAt();
    }
}