package sports.apparel.backend.features.auth;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final Map<String, AttemptState> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    public void assertNotLocked(String key) {
        AttemptState state = attempts.get(normalize(key));
        if (state != null && state.isLocked(now(clock))) {
            throw new LoginLockedException(state.lockedUntil);
        }
    }

    public void recordFailure(String key) {
        String normalizedKey = normalize(key);
        Instant now = now(clock);
        attempts.compute(normalizedKey, (ignored, state) -> {
            AttemptState current = state == null ? new AttemptState() : state;
            current.registerFailure(now);
            return current;
        });
    }

    public void clear(String key) {
        attempts.remove(normalize(key));
    }

    private static String normalize(String key) {
        return key == null ? "unknown" : key.trim().toLowerCase();
    }

    private static Instant now(Clock clock) {
        return clock.instant();
    }

    private static final class AttemptState {
        private int failures;
        private Instant lockedUntil;

        private void registerFailure(Instant now) {
            if (lockedUntil != null && lockedUntil.isAfter(now)) {
                return;
            }

            if (lockedUntil != null && !lockedUntil.isAfter(now)) {
                failures = 0;
                lockedUntil = null;
            }

            failures++;
            if (failures >= MAX_FAILED_ATTEMPTS) {
                lockedUntil = now.plus(LOCK_DURATION);
                failures = 0;
            }
        }

        private boolean isLocked(Instant now) {
            return lockedUntil != null && lockedUntil.isAfter(now);
        }
    }
}
