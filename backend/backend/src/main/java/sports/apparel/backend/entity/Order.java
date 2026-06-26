package sports.apparel.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String jobOrderNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = true)
    private Client client;

    @Column(length = 255)
    private String clientName;

    @Column(length = 255, nullable = true)
    private String teamName;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false, length = 255)
    private String orderRetail;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 255)
    private String freebie;

    @Column(precision = 12, scale = 2)
    private BigDecimal discount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(precision = 12, scale = 2)
    private BigDecimal downPayment;

    @Column(nullable = false, length = 100)
    private String shop;

    @Column(nullable = false)
    private LocalDate orderDate;

    @Column(nullable = false, length = 50)
    private String modeOfPayment;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(length = 100)
    private String referenceNumber;

    @Column(length = 50)
    private String status;

    @Column(nullable = false)
    private Boolean inventoryDeducted = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
