package sports.apparel.backend.features.auth;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.auth.LoginRequest;
import sports.apparel.backend.features.auth.LoginResponse;
import sports.apparel.backend.security.JwtAuthenticationFilter;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class AuthController {

    private static final String COOKIE_PATH = "/";

    private final AuthService authService;
    private final long jwtExpiration;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(AuthService authService,
                          @Value("${jwt.expiration}") long jwtExpiration,
                          @Value("${app.auth.cookie.secure:false}") boolean cookieSecure,
                          @Value("${app.auth.cookie.same-site:Lax}") String cookieSameSite) {
        this.authService = authService;
        this.jwtExpiration = jwtExpiration;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest,
                                               HttpServletRequest request) {
        AuthSession session = authService.authenticate(loginRequest, getClientIp(request));
        ResponseCookie cookie = buildAuthCookie(session.accessToken(), jwtExpiration);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Set-Cookie", cookie.toString())
                .body(new LoginResponse(session.user()));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Auth service is healthy");
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserDTO> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(authService.getCurrentUser(userDetails.getUsername()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .header("Set-Cookie", clearAuthCookie().toString())
                .build();
    }

    private ResponseCookie buildAuthCookie(String token, long expirationMillis) {
        return ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(COOKIE_PATH)
                .maxAge(Duration.ofMillis(expirationMillis))
                .build();
    }

    private ResponseCookie clearAuthCookie() {
        return ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(COOKIE_PATH)
                .maxAge(Duration.ZERO)
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }
}
