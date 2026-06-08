package sports.apparel.backend.features.teams;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.TeamPlayer;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamPlayerDTO {

    private UUID id;
    private String surname;
    private String number;
    private String size;
    private String type;

    public TeamPlayerDTO(TeamPlayer player) {
        this.id = player.getId();
        this.surname = player.getSurname();
        this.number = player.getNumber();
        this.size = player.getSize();
        this.type = player.getType();
    }
}
