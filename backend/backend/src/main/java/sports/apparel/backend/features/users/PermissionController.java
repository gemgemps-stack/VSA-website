package sports.apparel.backend.features.users;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.users.PermissionDTO;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/permissions")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @PostMapping("/grant/{userId}/{pageName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PermissionDTO> grantPermission(@PathVariable UUID userId, @PathVariable String pageName) {
        PermissionDTO permissionDTO = permissionService.grantPermission(userId, pageName);
        return ResponseEntity.status(HttpStatus.CREATED).body(permissionDTO);
    }

    @DeleteMapping("/revoke/{userId}/{pageName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> revokePermission(@PathVariable UUID userId, @PathVariable String pageName) {
        permissionService.revokePermission(userId, pageName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @userService.getUserById(#userId).email == authentication.principal.username")
    public ResponseEntity<List<PermissionDTO>> getUserPermissions(@PathVariable UUID userId) {
        List<PermissionDTO> permissions = permissionService.getUserPermissions(userId);
        return ResponseEntity.ok(permissions);
    }

    @GetMapping("/{userId}/{pageName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Boolean> hasPermission(@PathVariable UUID userId, @PathVariable String pageName) {
        boolean has = permissionService.hasPermission(userId, pageName);
        return ResponseEntity.ok(has);
    }
}
