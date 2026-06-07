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
            if (!userRepository.existsByEmail("admin@verdidaapparel.com")) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@verdidaapparel.com");
                admin.setPassword(passwordEncoder.encode("AdminPassword123!"));
                admin.setRole(User.Role.ADMIN);

                admin = userRepository.save(admin);

                for (String pageName : new String[] {"ORDERS", "INVENTORY", "CLIENTS", "SOURCE_OF_INCOME"}) {
                    if (!permissionRepository.existsByUserIdAndPageName(admin.getId(), pageName)) {
                        Permission permission = new Permission();
                        permission.setUser(admin);
                        permission.setPageName(pageName);
                        permissionRepository.save(permission);
                    }
                }
            }

            seedSampleEmployee(userRepository, permissionRepository, passwordEncoder,
                    "jane.employee@verdidaapparel.com",
                    "Jane Marketing",
                    "Password123!",
                    User.Role.EMPLOYEE,
                    new String[] {"ORDERS", "CLIENTS"});

            seedSampleEmployee(userRepository, permissionRepository, passwordEncoder,
                    "mike.staff@verdidaapparel.com",
                    "Mike Production",
                    "Password123!",
                    User.Role.EMPLOYEE,
                    new String[] {"INVENTORY"});

            seedSampleEmployee(userRepository, permissionRepository, passwordEncoder,
                    "susan.sewing@verdidaapparel.com",
                    "Susan Sewing",
                    "Password123!",
                    User.Role.EMPLOYEE,
                    new String[] {"INVENTORY"});
        };
    }

    private void seedSampleEmployee(UserRepository userRepository,
                                    PermissionRepository permissionRepository,
                                    PasswordEncoder passwordEncoder,
                                    String email,
                                    String username,
                                    String password,
                                    User.Role role,
                                    String[] permissions) {
        if (userRepository.existsByEmail(email)) {
            return;
        }

        User employee = new User();
        employee.setUsername(username);
        employee.setEmail(email);
        employee.setPassword(passwordEncoder.encode(password));
        employee.setRole(role);
        employee.setSalary(BigDecimal.valueOf(18000));

        employee = userRepository.save(employee);

        for (String pageName : permissions) {
            if (!permissionRepository.existsByUserIdAndPageName(employee.getId(), pageName)) {
                Permission permission = new Permission();
                permission.setUser(employee);
                permission.setPageName(pageName);
                permissionRepository.save(permission);
            }
        }
    }
}
