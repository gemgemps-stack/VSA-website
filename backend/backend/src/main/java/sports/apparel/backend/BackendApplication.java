package sports.apparel.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.net.ServerSocket;
import java.util.Collections;
import java.util.Locale;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		applyLocalDefaults();

		SpringApplication app = new SpringApplication(BackendApplication.class);
		if (!hasExplicitProfile() && !hasExplicitDatabaseConfig()) {
			app.setAdditionalProfiles("local");
		}
		app.setDefaultProperties(Collections.singletonMap("jwt.secret", "verdida-local-jwt-secret"));
		app.run(args);
	}

	private static void applyLocalDefaults() {
		if (!isLocalLaunch() || hasExplicitDatabaseConfig()) {
			return;
		}

		// Bare IDE launches fall back to an in-memory H2 database so the app can start
		// without requiring a separate local PostgreSQL instance.
		System.setProperty("spring.datasource.url",
				"jdbc:h2:mem:verdida_local;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
		System.setProperty("spring.datasource.username", "sa");
		System.setProperty("spring.datasource.password", "");
		System.setProperty("spring.datasource.driver-class-name", "org.h2.Driver");
		System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.H2Dialect");
		System.setProperty("spring.jpa.hibernate.ddl-auto", "update");
		System.setProperty("spring.flyway.enabled", "false");
		System.setProperty("jwt.secret", "verdida-local-jwt-secret");

		if (System.getProperty("server.port") != null || System.getenv("PORT") != null) {
			return;
		}

		int port = isPortAvailable(8080) ? 8080 : findNextAvailablePort(8081, 8090);
		System.setProperty("server.port", String.valueOf(port));
	}

	private static boolean hasExplicitProfile() {
		String activeProfiles = System.getProperty("spring.profiles.active");
		if (activeProfiles == null || activeProfiles.isBlank()) {
			activeProfiles = System.getenv("SPRING_PROFILES_ACTIVE");
		}

		return activeProfiles != null && !activeProfiles.isBlank();
	}

	private static boolean isLocalLaunch() {
		String activeProfiles = System.getProperty("spring.profiles.active");
		if (activeProfiles == null || activeProfiles.isBlank()) {
			activeProfiles = System.getenv("SPRING_PROFILES_ACTIVE");
		}

		if (activeProfiles == null || activeProfiles.isBlank()) {
			return true;
		}

		for (String profile : activeProfiles.split(",")) {
			if ("local".equals(profile.trim().toLowerCase(Locale.ROOT))) {
				return true;
			}
		}

		return false;
	}

	private static boolean hasExplicitDatabaseConfig() {
		return hasText(System.getProperty("spring.datasource.url"))
				|| hasText(System.getProperty("spring.datasource.username"))
				|| hasText(System.getProperty("spring.datasource.password"))
				|| hasText(System.getenv("SPRING_DATASOURCE_URL"))
				|| hasText(System.getenv("SPRING_DATASOURCE_USERNAME"))
				|| hasText(System.getenv("SPRING_DATASOURCE_PASSWORD"));
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private static boolean isPortAvailable(int port) {
		try (ServerSocket socket = new ServerSocket(port)) {
			socket.setReuseAddress(true);
			return true;
		} catch (Exception ex) {
			return false;
		}
	}

	private static int findNextAvailablePort(int startPort, int endPort) {
		for (int port = startPort; port <= endPort; port++) {
			if (isPortAvailable(port)) {
				return port;
			}
		}
		// If everything in the fallback range is busy, let Spring report the conflict clearly.
		return 8080;
	}

}
