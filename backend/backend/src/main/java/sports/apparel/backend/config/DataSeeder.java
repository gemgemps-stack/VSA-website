package sports.apparel.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import sports.apparel.backend.entity.Permission;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.PermissionRepository;
import sports.apparel.backend.features.users.UserRepository;

import java.util.Arrays;

@Configuration
public class DataSeeder {

    private static final String LOCAL_BOOTSTRAP_ADMIN_EMAIL = "admin@verdida.local";
    private static final String LOCAL_BOOTSTRAP_ADMIN_PASSWORD = "Admin123!";
    private static final String LOCAL_BOOTSTRAP_ADMIN_USERNAME = "admin";

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
            Environment environment,
            UserRepository userRepository,
            PermissionRepository permissionRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.enabled:false}") boolean bootstrapAdminEnabled,
            @Value("${app.bootstrap-admin.email:}") String bootstrapAdminEmail,
            @Value("${app.bootstrap-admin.username:admin}") String bootstrapAdminUsername,
            @Value("${app.bootstrap-admin.password:}") String bootstrapAdminPassword) {
        return args -> {
            boolean localProfile = Arrays.stream(environment.getActiveProfiles())
                    .anyMatch(profile -> "local".equalsIgnoreCase(profile));

            if (!bootstrapAdminEnabled && !localProfile) {
                return;
            }

            String email = StringUtils.hasText(bootstrapAdminEmail)
                    ? bootstrapAdminEmail.trim()
                    : (localProfile ? LOCAL_BOOTSTRAP_ADMIN_EMAIL : "");
            String username = StringUtils.hasText(bootstrapAdminUsername)
                    ? bootstrapAdminUsername.trim()
                    : (localProfile ? LOCAL_BOOTSTRAP_ADMIN_USERNAME : "");
            String password = StringUtils.hasText(bootstrapAdminPassword)
                    ? bootstrapAdminPassword
                    : (localProfile ? LOCAL_BOOTSTRAP_ADMIN_PASSWORD : "");

            if (!StringUtils.hasText(email) || !StringUtils.hasText(password) || !StringUtils.hasText(username)) {
                throw new IllegalStateException(
                        "Bootstrap admin is enabled, but app.bootstrap-admin.email/username/password are missing."
                );
            }

            if (userRepository.existsByEmail(email) || userRepository.existsByUsername(username)) {
                return;
            }

            User admin = new User();
            admin.setUsername(username);
            admin.setEmail(email);
            admin.setPassword(passwordEncoder.encode(password));
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
