package sports.apparel.backend.features.teams;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Team;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {

    private UUID id;
    private String teamName;
    private Integer quantity;
    private LocalDate transitDate;
    private List<TeamPlayerDTO> players;
    private LocalDateTime createdAt;

    public TeamDTO(Team team) {
        this.id = team.getId();
        this.teamName = team.getTeamName();
        this.quantity = team.getQuantity();
        this.transitDate = team.getTransitDate();
        this.players = team.getPlayers() == null ? List.of() : team.getPlayers().stream()
                .map(TeamPlayerDTO::new)
                .collect(Collectors.toList());
        this.createdAt = team.getCreatedAt();
    }
}
