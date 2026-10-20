package sports.apparel.backend.features.users;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.User;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeOptionDTO {

    private UUID id;
    private String name;

    public EmployeeOptionDTO(User user) {
        this.id = user.getId();
        this.name = user.getUsername();
    }
}
