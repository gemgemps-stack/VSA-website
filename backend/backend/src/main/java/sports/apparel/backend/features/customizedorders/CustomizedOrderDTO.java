package sports.apparel.backend.features.customizedorders;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.CustomizedOrder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomizedOrderDTO {

    private UUID id;
    private String jobOrderNo;
    private UUID clientId;
    private String clientName;
    private String clientCode;
    private String teamName;
    private String orderRetail;
    private Integer quantity;
    private List<ItemDTO> items;
    private String freebie;
    private BigDecimal discount;
    private BigDecimal price;
    private BigDecimal downPayment;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemDTO {
        private UUID id;
        private String productName;
        private String size;
        private BigDecimal unitPrice;
        private Integer quantity;
        private UUID inventoryId;
    }
    private String shop;
    private String graphicArtist;
    private LocalDate orderDate;
    private LocalDate pickupDate;
    private String modeOfPayment;
    private String remarks;
    private String referenceNumber;
    private String status;
    private LocalDateTime createdAt;
    private BigDecimal itemsTotal;
    private BigDecimal afterDiscountTotal;
    private BigDecimal remainingBalance;

    public CustomizedOrderDTO(CustomizedOrder order) {
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
        this.orderRetail = order.getOrderRetail();
        this.quantity = order.getQuantity();
        this.items = order.getItems().stream()
                .map(item -> new ItemDTO(item.getId(), item.getProductName(), item.getSize(), item.getUnitPrice(), item.getQuantity(), item.getInventoryId()))
                .collect(Collectors.toList());
        this.freebie = order.getFreebie();
        this.discount = order.getDiscount();
        this.price = order.getPrice();
        this.downPayment = order.getDownPayment();
        this.shop = order.getShop();
        this.graphicArtist = order.getGraphicArtist();
        this.orderDate = order.getOrderDate();
        this.pickupDate = order.getPickupDate();
        this.modeOfPayment = order.getModeOfPayment();
        this.remarks = order.getRemarks();
        this.referenceNumber = order.getReferenceNumber();
        this.status = order.getStatus();
        this.createdAt = order.getCreatedAt();

        BigDecimal lineItemsTotal = BigDecimal.ZERO;
        if (this.items != null) {
            lineItemsTotal = this.items.stream()
                    .map(item -> {
                        BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                        BigDecimal itemQuantity = item.getQuantity() != null
                                ? BigDecimal.valueOf(item.getQuantity())
                                : BigDecimal.ZERO;
                        return unitPrice.multiply(itemQuantity);
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        this.itemsTotal = lineItemsTotal;

        BigDecimal discountPercent = order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO;
        BigDecimal afterDiscountTotal = lineItemsTotal
                .multiply(BigDecimal.valueOf(100).subtract(discountPercent))
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.afterDiscountTotal = afterDiscountTotal;

        BigDecimal paidAmount = order.getDownPayment() != null ? order.getDownPayment() : BigDecimal.ZERO;
        this.remainingBalance = afterDiscountTotal.subtract(paidAmount).max(BigDecimal.ZERO);
    }
}
