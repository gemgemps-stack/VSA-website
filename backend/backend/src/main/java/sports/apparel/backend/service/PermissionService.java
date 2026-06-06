package sports.apparel.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.PermissionDTO;
import sports.apparel.backend.entity.Permission;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.repository.PermissionRepository;
import sports.apparel.backend.repository.UserRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    public PermissionService(PermissionRepository permissionRepository, UserRepository userRepository) {
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
    }

    public PermissionDTO grantPermission(UUID userId, String pageName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (permissionRepository.existsByUserIdAndPageName(userId, pageName.toUpperCase())) {
            throw new IllegalArgumentException("User already has this permission");
        }

        Permission permission = new Permission();
        permission.setUser(user);
        permission.setPageName(pageName.toUpperCase());

        Permission savedPermission = permissionRepository.save(permission);
        return new PermissionDTO(savedPermission);
    }

    public void revokePermission(UUID userId, String pageName) {
        if (!permissionRepository.existsByUserIdAndPageName(userId, pageName.toUpperCase())) {
            throw new IllegalArgumentException("User does not have this permission");
        }
        permissionRepository.deleteByUserIdAndPageName(userId, pageName.toUpperCase());
    }

    public List<PermissionDTO> getUserPermissions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return permissionRepository.findByUser(user).stream()
                .map(PermissionDTO::new)
                .collect(Collectors.toList());
    }

    public boolean hasPermission(UUID userId, String pageName) {
        return permissionRepository.existsByUserIdAndPageName(userId, pageName.toUpperCase());
    }
}
