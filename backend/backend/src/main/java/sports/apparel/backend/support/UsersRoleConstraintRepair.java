package sports.apparel.backend.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UsersRoleConstraintRepair implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UsersRoleConstraintRepair.class);

    private static final String DROP_LEGACY_ROLE_CHECK =
            "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check";

    private final JdbcTemplate jdbcTemplate;

    public UsersRoleConstraintRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(DROP_LEGACY_ROLE_CHECK);
            log.info("Removed the legacy users_role_check constraint so all Role values are accepted.");
        } catch (RuntimeException error) {
            log.warn("Unable to remove the legacy users_role_check constraint: {}", error.getMessage());
        }
    }
}
