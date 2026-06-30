package sports.apparel.backend.features.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.security.JwtProvider;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final LoginAttemptService loginAttemptService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider,
                       LoginAttemptService loginAttemptService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.loginAttemptService = loginAttemptService;
    }

    @Transactional
    public AuthSession authenticate(LoginRequest loginRequest, String clientIp) {
        String loginValue = loginRequest.getEmail() == null ? "" : loginRequest.getEmail().trim();
        String rawPassword = loginRequest.getPassword();
        String rateLimitKey = buildRateLimitKey(loginValue, clientIp);
        String ipRateLimitKey = buildIpRateLimitKey(clientIp);

        loginAttemptService.assertNotLocked(rateLimitKey);
        loginAttemptService.assertNotLocked(ipRateLimitKey);

        try {
            if (loginValue.isBlank() || rawPassword == null || rawPassword.isBlank()) {
                throw new BadCredentialsException("Invalid email or password");
            }

            User user = userRepository.findByEmailIgnoreCase(loginValue)
                    .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

            String storedPassword = user.getPassword();
            boolean matches = passwordMatches(rawPassword, storedPassword);

            if (!matches) {
                throw new BadCredentialsException("Invalid email or password");
            }

            loginAttemptService.clear(rateLimitKey);
            loginAttemptService.clear(ipRateLimitKey);
            String token = jwtProvider.generateToken(buildUserDetails(user));
            return new AuthSession(token, new AuthUserDTO(user));
        } catch (BadCredentialsException ex) {
            loginAttemptService.recordFailure(rateLimitKey);
            loginAttemptService.recordFailure(ipRateLimitKey);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public AuthUserDTO getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid session"));
        return new AuthUserDTO(user);
    }

    private String buildRateLimitKey(String loginValue, String clientIp) {
        String normalizedEmail = loginValue == null ? "unknown" : loginValue.trim().toLowerCase();
        String normalizedIp = clientIp == null || clientIp.isBlank() ? "unknown-ip" : clientIp.trim();
        return normalizedEmail + "|" + normalizedIp;
    }

    private String buildIpRateLimitKey(String clientIp) {
        String normalizedIp = clientIp == null || clientIp.isBlank() ? "unknown-ip" : clientIp.trim();
        return "ip|" + normalizedIp;
    }

    private org.springframework.security.core.userdetails.User buildUserDetails(User user) {
        java.util.List<org.springframework.security.core.GrantedAuthority> authorities = new java.util.ArrayList<>();
        authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        if (user.getPermissions() != null) {
            user.getPermissions().forEach(permission ->
                    authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(permission.getPageName()))
            );
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null || storedPassword.isBlank()) {
            return false;
        }

        String normalizedStoredPassword = storedPassword.trim();

        if (normalizedStoredPassword.startsWith("{bcrypt}")) {
            return passwordEncoder.matches(rawPassword, normalizedStoredPassword.substring("{bcrypt}".length()));
        }

        if (normalizedStoredPassword.startsWith("$2a$")
                || normalizedStoredPassword.startsWith("$2b$")
                || normalizedStoredPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, normalizedStoredPassword);
        }

        return rawPassword.equals(normalizedStoredPassword);
    }
}
