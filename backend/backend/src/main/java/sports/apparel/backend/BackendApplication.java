package sports.apparel.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Arrays;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(BackendApplication.class);
		boolean profileAlreadyConfigured = System.getProperty("spring.profiles.active") != null
				|| System.getenv("SPRING_PROFILES_ACTIVE") != null
				|| Arrays.stream(args).anyMatch(arg -> arg.startsWith("--spring.profiles.active="));

		if (!profileAlreadyConfigured) {
			application.setAdditionalProfiles("local");
		}

		application.run(args);
	}

}
