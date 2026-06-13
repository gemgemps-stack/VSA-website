package sports.apparel.backend.features.auth;

public record AuthSession(String accessToken, AuthUserDTO user) {
}
