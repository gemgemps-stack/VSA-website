package sports.apparel.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "returned_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReturnedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customized_order_id", nullable = true)
    private CustomizedOrder customizedOrder;

    @Column(name = "product_name", length = 255)
    private String productName;

    @Column(length = 20)
    private String size;

    @Column(length = 50)
    private String number;

    @Column(name = "jersey_type", length = 50)
    private String jerseyType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "return_date")
    private LocalDate returnDate;

    @Column(name = "request_fingerprint", unique = true, length = 100)
    private String requestFingerprint;

    @Version
    private Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}