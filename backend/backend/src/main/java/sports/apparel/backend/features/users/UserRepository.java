package sports.apparel.backend.features.users;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.User;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @EntityGraph(attributePaths = "permissions")
    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = "permissions")
    Optional<User> findByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = "permissions")
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = "permissions")
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COUNT(u) > 0 FROM User u WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(:username))")
    boolean existsByNormalizedUsername(String username);

    @org.springframework.data.jpa.repository.Query(
            "SELECT u FROM User u WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(:username))")
    java.util.List<User> findByNormalizedUsername(String username);

    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT u FROM User u LEFT JOIN u.additionalRoles ar "
                    + "WHERE u.role = :role OR ar.role = :role ORDER BY u.username")
    java.util.List<User> findByRoleIncludingAdditional(User.Role role);
}
