package sports.apparel.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(unique = true, length = 255)
    private String email;

    @Column(length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(precision = 12, scale = 2)
    private BigDecimal salary;

    @Version
    private Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Permission> permissions = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserRole> additionalRoles = new ArrayList<>();

    public List<Role> getAllRoles() {
        java.util.LinkedHashSet<Role> roles = new java.util.LinkedHashSet<>();
        if (role != null) {
            roles.add(role);
        }
        if (additionalRoles != null) {
            additionalRoles.stream()
                    .map(UserRole::getRole)
                    .filter(java.util.Objects::nonNull)
                    .forEach(roles::add);
        }
        return new ArrayList<>(roles);
    }

    public enum Role {
        ADMIN,
        EMPLOYEE,
        MARKETING,
        PRODUCTION,
        SEWING,
        GRAPHIC_ARTISTS,
        SALES,
        MACHINE_OPERATORS
    }
}
