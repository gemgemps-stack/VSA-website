package sports.apparel.backend.features.teams;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamPlayerRequest {

    @NotBlank(message = "Surname is required")
    private String surname;

    @NotBlank(message = "Number is required")
    private String number;

    @NotBlank(message = "Size is required")
    private String size;

    @NotBlank(message = "Type is required")
    private String type;
}
