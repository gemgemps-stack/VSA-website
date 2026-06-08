package sports.apparel.backend.features.teams;

import org.springframework.data.jpa.repository.JpaRepository;
import sports.apparel.backend.entity.Team;

import java.util.Optional;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
    Optional<Team> findByTeamNameIgnoreCase(String teamName);

    boolean existsByTeamNameIgnoreCase(String teamName);

    boolean existsByTeamNameIgnoreCaseAndIdNot(String teamName, UUID id);
}
