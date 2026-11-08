package sports.apparel.backend.features.returneditems;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.CustomizedOrderItem;
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
    private String teamName;
    private String orderStatus;
    private String productName;
    private String surname;
    private String size;
    private String number;
    private String jerseyType;
    private Integer quantity;
    private String reason;
    private LocalDate returnDate;
    private Boolean addedToInventory;
    private LocalDateTime createdAt;

    public ReturnedItemDTO(ReturnedItem returnedItem) {
        this.id = returnedItem.getId();
        this.orderId = returnedItem.getOrder() != null ? returnedItem.getOrder().getId() : null;
        this.customizedOrderId = returnedItem.getCustomizedOrder() != null ? returnedItem.getCustomizedOrder().getId() : null;
        this.jobOrderNo = returnedItem.getOrder() != null
                ? returnedItem.getOrder().getJobOrderNo()
                : (returnedItem.getCustomizedOrder() != null ? returnedItem.getCustomizedOrder().getJobOrderNo() : null);
        this.orderType = returnedItem.getOrder() != null ? "RETAIL" : "CUSTOMIZED";
        if (returnedItem.getOrder() != null) {
            sports.apparel.backend.entity.Order order = returnedItem.getOrder();
            this.clientName = order.getClient() != null && order.getClient().getClientName() != null
                    ? order.getClient().getClientName()
                    : order.getClientName();
            this.teamName = order.getTeamName();
            this.orderStatus = order.getStatus();
        } else if (returnedItem.getCustomizedOrder() != null) {
            sports.apparel.backend.entity.CustomizedOrder customizedOrder = returnedItem.getCustomizedOrder();
            this.clientName = customizedOrder.getClient() != null && customizedOrder.getClient().getClientName() != null
                    ? customizedOrder.getClient().getClientName()
                    : customizedOrder.getClientName();
            this.teamName = customizedOrder.getTeamName();
            this.orderStatus = customizedOrder.getStatus();
        }
        this.productName = returnedItem.getProductName();
        this.surname = returnedItem.getSurname() != null
                ? returnedItem.getSurname()
                : resolveSurnameFromCustomizedOrder(returnedItem);
        this.size = returnedItem.getSize();
        this.number = returnedItem.getNumber();
        this.jerseyType = returnedItem.getJerseyType();
        this.quantity = returnedItem.getQuantity();
        this.reason = returnedItem.getReason();
        this.returnDate = returnedItem.getReturnDate();
        this.addedToInventory = Boolean.TRUE.equals(returnedItem.getAddedToInventory());
        this.createdAt = returnedItem.getCreatedAt();
    }

    private String resolveSurnameFromCustomizedOrder(ReturnedItem returnedItem) {
        if (returnedItem.getCustomizedOrder() == null || returnedItem.getCustomizedOrder().getItems() == null) {
            return null;
        }
        String productName = returnedItem.getProductName();
        String size = returnedItem.getSize();
        return returnedItem.getCustomizedOrder().getItems().stream()
                .filter(item -> item.getSurname() != null)
                .filter(item -> productName != null && productName.equalsIgnoreCase(item.getProductName()))
                .filter(item -> size == null || item.getSize() == null || size.equalsIgnoreCase(item.getSize()))
                .map(CustomizedOrderItem::getSurname)
                .findFirst()
                .orElse(null);
    }
}