package sports.apparel.backend.features.orders;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Order;

import java.math.BigDecimal;
import java.time.LocalDate;
import sports.apparel.backend.entity.OrderItem;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {

    private UUID id;
    private String jobOrderNo;
    private UUID clientId;
    private String clientName;
    private String clientCode;
    private String teamName;
    private List<ItemDTO> items;
    private String orderRetail;
    private Integer quantity;
    private String freebie;
    private BigDecimal discount;
    private BigDecimal price;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemDTO {
        private UUID id;
        private String productName;
        private BigDecimal unitPrice;
        private Integer quantity;

        public ItemDTO(OrderItem item) {
            this.id = item.getId();
            this.productName = item.getProductName();
            this.unitPrice = item.getUnitPrice();
            this.quantity = item.getQuantity();
        }
    }
    private BigDecimal downPayment;
    private String shop;
    private LocalDate orderDate;
    private String modeOfPayment;
    private String remarks;
    private String referenceNumber;
    private String status;
    private Boolean inventoryDeducted;
    private LocalDateTime createdAt;

    public OrderDTO(Order order) {
        this.id = order.getId();
        this.jobOrderNo = order.getJobOrderNo();
        if (order.getClient() != null) {
            this.clientId = order.getClient().getId();
            this.clientName = order.getClient().getClientName();
            this.clientCode = order.getClient().getClientCode();
        } else {
            this.clientId = null;
            this.clientName = order.getClientName() != null ? order.getClientName() : "Walk-in Client";
            this.clientCode = null;
        }
        this.teamName = order.getTeamName();
        if (order.getItems() != null) {
            this.items = order.getItems().stream()
                    .map(ItemDTO::new)
                    .collect(Collectors.toList());
        }
        this.orderRetail = order.getOrderRetail();
        this.quantity = order.getQuantity();
        this.freebie = order.getFreebie();
        this.discount = order.getDiscount();
        this.price = order.getPrice();
        this.downPayment = order.getDownPayment();
        this.shop = order.getShop();
        this.orderDate = order.getOrderDate();
        this.modeOfPayment = order.getModeOfPayment();
        this.remarks = order.getRemarks();
        this.referenceNumber = order.getReferenceNumber();
        this.status = order.getStatus();
        this.inventoryDeducted = order.getInventoryDeducted();
        this.createdAt = order.getCreatedAt();
    }
}
