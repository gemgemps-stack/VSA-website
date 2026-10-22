package sports.apparel.backend.features.users;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private UUID id;
    private String username;
    private String email;
    private String role;
    private java.util.List<String> additionalRoles;
    private BigDecimal salary;
    private LocalDateTime createdAt;
    private List<PermissionDTO> permissions;

    public UserDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = toApiRoleName(user.getRole());
        this.additionalRoles = user.getAdditionalRoles() == null
                ? List.of()
                : user.getAdditionalRoles().stream()
                        .map(userRole -> toApiRoleName(userRole.getRole()))
                        .toList();
        this.salary = user.getSalary();
        this.createdAt = user.getCreatedAt();
        this.permissions = user.getPermissions() == null
                ? List.of()
                : user.getPermissions()
                        .stream()
                        .map(PermissionDTO::new)
                        .toList();
    }

    private String toApiRoleName(User.Role role) {
        return switch (role) {
            case GRAPHIC_ARTISTS -> "GRAPHIC";
            case MACHINE_OPERATORS -> "MACHINE";
            default -> role.toString();
        };
    }
}
