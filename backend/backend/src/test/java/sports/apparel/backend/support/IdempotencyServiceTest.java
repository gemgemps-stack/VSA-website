package sports.apparel.backend.support;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IdempotencyServiceTest {

    @Test
    void executeReturnsSameResultForTheSameKey() {
        IdempotencyService service = new IdempotencyService();
        AtomicInteger calls = new AtomicInteger();

        String first = service.execute("same-key", () -> {
            calls.incrementAndGet();
            return "created";
        });

        String second = service.execute("same-key", () -> {
            calls.incrementAndGet();
            return "should-not-run";
        });

        assertEquals("created", first);
        assertEquals("created", second);
        assertEquals(1, calls.get());
    }
}
