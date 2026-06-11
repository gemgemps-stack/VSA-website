package sports.apparel.backend.features.inventory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Inventory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDTO {

    private UUID id;
    private String itemType;
    private String jerseyType;
    private String name;
    private String shop;
    private String size;
    private String number;
    private String notes;
    private Integer quantity;
    private BigDecimal price;
    private LocalDateTime createdAt;

    public InventoryDTO(Inventory inventory) {
        this.id = inventory.getId();
        this.itemType = inventory.getItemType();
        this.jerseyType = inventory.getJerseyType();
        this.name = inventory.getName();
        this.shop = inventory.getShop();
        this.size = inventory.getSize();
        this.number = inventory.getNumber();
        this.notes = inventory.getNotes();
        this.quantity = inventory.getQuantity();
        this.price = inventory.getPrice();
        this.createdAt = inventory.getCreatedAt();
    }
}
