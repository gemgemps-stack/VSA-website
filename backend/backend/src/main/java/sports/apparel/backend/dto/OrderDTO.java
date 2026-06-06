package sports.apparel.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Order;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {

    private UUID id;
    private String jobOrderNo;
    private UUID clientId;
    private String clientName;
    private String teamName;
    private String orderRetail;
    private Integer quantity;
    private String freebie;
    private BigDecimal discount;
    private BigDecimal price;
    private BigDecimal downPayment;
    private String shop;
    private LocalDate orderDate;
    private String modeOfPayment;
    private String status;
    private Boolean inventoryDeducted;
    private LocalDateTime createdAt;

    public OrderDTO(Order order) {
        this.id = order.getId();
        this.jobOrderNo = order.getJobOrderNo();
        this.clientId = order.getClient().getId();
        this.clientName = order.getClient().getClientName();
        this.teamName = order.getTeamName();
        this.orderRetail = order.getOrderRetail();
        this.quantity = order.getQuantity();
        this.freebie = order.getFreebie();
        this.discount = order.getDiscount();
        this.price = order.getPrice();
        this.downPayment = order.getDownPayment();
        this.shop = order.getShop();
        this.orderDate = order.getOrderDate();
        this.modeOfPayment = order.getModeOfPayment();
        this.status = order.getStatus();
        this.inventoryDeducted = order.getInventoryDeducted();
        this.createdAt = order.getCreatedAt();
    }
}
