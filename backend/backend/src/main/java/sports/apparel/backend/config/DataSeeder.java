package sports.apparel.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import sports.apparel.backend.entity.Permission;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.PermissionRepository;
import sports.apparel.backend.features.users.UserRepository;

@Configuration
public class DataSeeder {

    private static final String[] DEFAULT_ADMIN_PERMISSIONS = {
            "INVENTORY_ORDERS",
            "CUSTOMIZED_ORDERS",
            "TEAMS",
            "INVENTORY",
            "CLIENTS",
            "SOURCE_OF_INCOME",
            "EMPLOYEES",
            "ATTENDANCE"
    };

    @Bean
    CommandLineRunner seedBootstrapAdmin(
            UserRepository userRepository,
            PermissionRepository permissionRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.enabled:false}") boolean bootstrapAdminEnabled,
            @Value("${app.bootstrap-admin.email:}") String bootstrapAdminEmail,
            @Value("${app.bootstrap-admin.username:admin}") String bootstrapAdminUsername,
            @Value("${app.bootstrap-admin.password:}") String bootstrapAdminPassword) {
        return args -> {
            if (!bootstrapAdminEnabled) {
                return;
            }

            if (!StringUtils.hasText(bootstrapAdminEmail) || !StringUtils.hasText(bootstrapAdminPassword)) {
                throw new IllegalStateException(
                        "Bootstrap admin is enabled, but app.bootstrap-admin.email/password are missing."
                );
            }

            if (userRepository.existsByEmail(bootstrapAdminEmail) || userRepository.existsByUsername(bootstrapAdminUsername)) {
                return;
            }

            User admin = new User();
            admin.setUsername(bootstrapAdminUsername);
            admin.setEmail(bootstrapAdminEmail);
            admin.setPassword(passwordEncoder.encode(bootstrapAdminPassword));
            admin.setRole(User.Role.ADMIN);

            admin = userRepository.save(admin);

            for (String pageName : DEFAULT_ADMIN_PERMISSIONS) {
                if (!permissionRepository.existsByUserIdAndPageName(admin.getId(), pageName)) {
                    Permission permission = new Permission();
                    permission.setUser(admin);
                    permission.setPageName(pageName);
                    permissionRepository.save(permission);
                }
            }
        };
    }
}
