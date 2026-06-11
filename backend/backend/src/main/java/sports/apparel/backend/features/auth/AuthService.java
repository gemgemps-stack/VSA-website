package sports.apparel.backend.features.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.features.auth.LoginRequest;
import sports.apparel.backend.features.auth.LoginResponse;
import sports.apparel.backend.features.users.UserDTO;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.UserRepository;
import sports.apparel.backend.security.JwtProvider;

import java.util.ArrayList;
import java.util.Collection;

@Service
public class AuthService {

    private static final String DEV_ADMIN_EMAIL = "admin@verdidaapparel.com";
    private static final String DEV_ADMIN_PASSWORD = "AdminPassword123!";
    private static final String[] DEV_ADMIN_PERMISSIONS = {
            "ORDERS", "INVENTORY", "CLIENTS", "SOURCE_OF_INCOME", "PAYMENT_METHODS", "EMPLOYEES", "ATTENDANCE"
    };

    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       JwtProvider jwtProvider,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtProvider = jwtProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        String loginValue = loginRequest.getEmail().trim();
        String rawPassword = loginRequest.getPassword();

        if (isDevAdminLogin(loginValue, rawPassword)) {
            User user = userRepository.findByEmailIgnoreCase(loginValue)
                    .orElseGet(this::createDevAdminAccount);
            user = ensureDevAdminAccount(user);

            UserDetails userDetails = buildUserDetails(user);
            String token = jwtProvider.generateToken(userDetails);
            UserDTO userDTO = new UserDTO(user);

            return new LoginResponse(token, userDTO);
        }

        User user = userRepository.findByEmailIgnoreCase(loginValue)
                .orElse(null);

        if (user == null) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String storedPassword = user.getPassword();

        boolean matches = passwordEncoder.matches(rawPassword, storedPassword);
        boolean legacyPlaintextMatch = storedPassword != null && storedPassword.equals(rawPassword);

        if (!matches && !legacyPlaintextMatch) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (legacyPlaintextMatch) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }

        UserDetails userDetails = buildUserDetails(user);
        String token = jwtProvider.generateToken(userDetails);
        UserDTO userDTO = new UserDTO(user);

        return new LoginResponse(token, userDTO);
    }

    private boolean isDevAdminLogin(String loginValue, String rawPassword) {
        return DEV_ADMIN_PASSWORD.equals(rawPassword)
                && DEV_ADMIN_EMAIL.equalsIgnoreCase(loginValue);
    }

    private User ensureDevAdminAccount(User user) {
        user.setUsername("admin");
        user.setEmail(DEV_ADMIN_EMAIL);
        user.setPassword(passwordEncoder.encode(DEV_ADMIN_PASSWORD));
        user.setRole(User.Role.ADMIN);

        User savedUser = userRepository.save(user);
        if (savedUser.getPermissions() == null) {
            savedUser.setPermissions(new java.util.ArrayList<>());
        }

        for (String pageName : DEV_ADMIN_PERMISSIONS) {
            boolean alreadyHasPermission = savedUser.getPermissions().stream()
                    .anyMatch(permission -> pageName.equalsIgnoreCase(permission.getPageName()));

            if (!alreadyHasPermission) {
                sports.apparel.backend.entity.Permission permission = new sports.apparel.backend.entity.Permission();
                permission.setUser(savedUser);
                permission.setPageName(pageName);
                savedUser.getPermissions().add(permission);
            }
        }

        return userRepository.save(savedUser);
    }

    private User createDevAdminAccount() {
        User user = new User();
        user.setUsername("admin");
        user.setEmail(DEV_ADMIN_EMAIL);
        user.setPassword(passwordEncoder.encode(DEV_ADMIN_PASSWORD));
        user.setRole(User.Role.ADMIN);
        user.setPermissions(new java.util.ArrayList<>());

        User savedUser = userRepository.save(user);
        for (String pageName : DEV_ADMIN_PERMISSIONS) {
            sports.apparel.backend.entity.Permission permission = new sports.apparel.backend.entity.Permission();
            permission.setUser(savedUser);
            permission.setPageName(pageName);
            savedUser.getPermissions().add(permission);
        }
        return userRepository.save(savedUser);
    }

    private UserDetails buildUserDetails(User user) {
        Collection<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        if (user.getPermissions() != null) {
            user.getPermissions().forEach(permission ->
                    authorities.add(new SimpleGrantedAuthority(permission.getPageName()))
            );
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}
