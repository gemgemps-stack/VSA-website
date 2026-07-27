package sports.apparel.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "customized_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomizedOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customized_order_id", nullable = false)
    private CustomizedOrder customizedOrder;

    @Column(nullable = false, length = 255)
    private String productName;

    @Column(length = 20)
    private String size;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;
}
