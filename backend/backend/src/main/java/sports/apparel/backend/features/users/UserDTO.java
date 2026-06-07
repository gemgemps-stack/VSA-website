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
    private BigDecimal salary;
    private LocalDateTime createdAt;
    private List<PermissionDTO> permissions;

    public UserDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = user.getRole().toString();
        this.salary = user.getSalary();
        this.createdAt = user.getCreatedAt();
        this.permissions = user.getPermissions() == null
                ? List.of()
                : user.getPermissions()
                        .stream()
                        .map(PermissionDTO::new)
                        .toList();
    }
}
