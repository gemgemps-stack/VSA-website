package sports.apparel.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Permission;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionDTO {

    private UUID id;
    private String pageName;

    public PermissionDTO(Permission permission) {
        this.id = permission.getId();
        this.pageName = permission.getPageName();
    }
}
