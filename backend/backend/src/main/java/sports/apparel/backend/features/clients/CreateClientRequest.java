package sports.apparel.backend.features.clients;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateClientRequest {

    @NotBlank(message = "Client name is required")
    private String clientName;

    @NotBlank(message = "Contact number is required")
    private String contactNumber;

    private Boolean vip = false;

    private String notes;
}
