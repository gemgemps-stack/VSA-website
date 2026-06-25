package sports.apparel.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Collections;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(BackendApplication.class);
		if (System.getProperty("spring.profiles.active") == null
				&& System.getenv("SPRING_PROFILES_ACTIVE") == null) {
			app.setAdditionalProfiles("local");
		}
		app.setDefaultProperties(Collections.singletonMap("jwt.secret", "verdida-local-jwt-secret"));
		app.run(args);
	}

}
