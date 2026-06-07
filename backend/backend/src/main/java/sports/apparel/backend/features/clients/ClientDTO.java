package sports.apparel.backend.features.clients;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.Client;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientDTO {

    private UUID id;
    private String clientName;
    private String contactNumber;
    private Boolean vip;
    private String notes;
    private LocalDateTime createdAt;

    public ClientDTO(Client client) {
        this.id = client.getId();
        this.clientName = client.getClientName();
        this.contactNumber = client.getContactNumber();
        this.vip = client.getVip();
        this.notes = client.getNotes();
        this.createdAt = client.getCreatedAt();
    }
}
