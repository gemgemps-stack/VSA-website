package sports.apparel.backend.features.auth;

import java.time.Instant;

public class LoginLockedException extends RuntimeException {

    private final Instant lockedUntil;

    public LoginLockedException(Instant lockedUntil) {
        super("Too many failed login attempts. Please try again later.");
        this.lockedUntil = lockedUntil;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }
}
