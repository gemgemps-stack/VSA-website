package sports.apparel.backend.features.teams;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Team;
import sports.apparel.backend.entity.TeamPlayer;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public List<TeamDTO> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(TeamDTO::new)
                .collect(Collectors.toList());
    }

    public TeamDTO getTeamById(UUID id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        return new TeamDTO(team);
    }

    public TeamDTO createTeam(CreateTeamRequest request) {
        String teamName = normalizeTeamName(request.getTeamName());
        ensureUniqueTeamName(teamName, null);
        validatePlayers(request.getPlayers());

        Team team = new Team();
        team.setTeamName(teamName);
        team.setTransitDate(request.getTransitDate());
        team.getPlayers().clear();
        request.getPlayers().forEach(playerRequest -> team.getPlayers().add(buildPlayer(team, playerRequest)));
        team.setQuantity(team.getPlayers().size());

        return new TeamDTO(teamRepository.save(team));
    }

    public TeamDTO updateTeam(UUID id, CreateTeamRequest request) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        String teamName = normalizeTeamName(request.getTeamName());
        ensureUniqueTeamName(teamName, id);
        validatePlayers(request.getPlayers());

        team.setTeamName(teamName);
        team.setTransitDate(request.getTransitDate());
        team.getPlayers().clear();
        request.getPlayers().forEach(playerRequest -> team.getPlayers().add(buildPlayer(team, playerRequest)));
        team.setQuantity(team.getPlayers().size());

        return new TeamDTO(teamRepository.save(team));
    }

    public void deleteTeam(UUID id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        teamRepository.delete(team);
    }

    private TeamPlayer buildPlayer(Team team, TeamPlayerRequest request) {
        TeamPlayer player = new TeamPlayer();
        player.setTeam(team);
        player.setSurname(request.getSurname().trim());
        player.setNumber(request.getNumber() != null ? request.getNumber().trim() : null);
        player.setSize(request.getSize() != null ? request.getSize().trim() : null);
        player.setType(request.getType().trim());
        return player;
    }

    private String normalizeTeamName(String teamName) {
        if (teamName == null || teamName.isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }
        return teamName.trim();
    }

    private void ensureUniqueTeamName(String teamName, UUID currentTeamId) {
        boolean exists = currentTeamId == null
                ? teamRepository.existsByTeamNameIgnoreCase(teamName)
                : teamRepository.existsByTeamNameIgnoreCaseAndIdNot(teamName, currentTeamId);

        if (exists) {
            throw new IllegalArgumentException("Team name already exists");
        }
    }

    private void validatePlayers(List<TeamPlayerRequest> players) {
        if (players == null || players.isEmpty()) {
            throw new IllegalArgumentException("At least one player is required");
        }
    }
}
