package sports.apparel.backend.support;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Service
public class IdempotencyService {

    private final Map<String, CompletableFuture<Object>> inFlight = new ConcurrentHashMap<>();
    private final Map<String, Object> completedResults = new ConcurrentHashMap<>();

    @SuppressWarnings("unchecked")
    public <T> T execute(String key, Supplier<T> supplier) {
        Object cachedResult = completedResults.get(key);
        if (cachedResult != null) {
            return (T) cachedResult;
        }

        CompletableFuture<Object> existingFuture = (CompletableFuture<Object>) inFlight.putIfAbsent(key, new CompletableFuture<>());
        if (existingFuture != null) {
            try {
                return (T) existingFuture.join();
            } catch (CompletionException ex) {
                Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
                if (cause instanceof RuntimeException runtimeException) {
                    throw runtimeException;
                }
                throw new IllegalStateException(cause);
            }
        }

        CompletableFuture<Object> currentFuture = inFlight.get(key);
        try {
            T result = supplier.get();
            currentFuture.complete(result);
            completedResults.put(key, result);
            return result;
        } catch (Throwable ex) {
            currentFuture.completeExceptionally(ex);
            if (ex instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new IllegalStateException(ex);
        } finally {
            inFlight.remove(key, currentFuture);
        }
    }
}
