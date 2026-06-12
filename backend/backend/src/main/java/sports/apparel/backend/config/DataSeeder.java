package sports.apparel.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import sports.apparel.backend.entity.Permission;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.PermissionRepository;
import sports.apparel.backend.features.users.UserRepository;

import java.math.BigDecimal;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedDefaultUsers(UserRepository userRepository,
                                       PermissionRepository permissionRepository,
                                       PasswordEncoder passwordEncoder) {
        return args -> {
            // Only seed admin user if it doesn't already exist (check both email and username)
            if (!userRepository.existsByEmail("admin@verdidaapparel.com") && !userRepository.existsByUsername("admin")) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@verdidaapparel.com");
                admin.setPassword(passwordEncoder.encode("AdminPassword123!"));
                admin.setRole(User.Role.ADMIN);

                admin = userRepository.save(admin);

                for (String pageName : new String[] {"ORDERS", "INVENTORY", "CLIENTS", "SOURCE_OF_INCOME", "ATTENDANCE"}) {
                    if (!permissionRepository.existsByUserIdAndPageName(admin.getId(), pageName)) {
                        Permission permission = new Permission();
                        permission.setUser(admin);
                        permission.setPageName(pageName);
                        permissionRepository.save(permission);
                    }
                }
            }
            // Test employees (Jane, Mike, Susan) are no longer seeded automatically
            // They were hardcoded and would keep reappearing after deletion
            // To add them back, manually create them through the UI or add them to a SQL migration
        };
    }
}

