package sports.apparel.backend.features.clients;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.clients.CreateClientRequest;
import sports.apparel.backend.features.clients.ClientDTO;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<ClientDTO> createClient(@Valid @RequestBody CreateClientRequest request) {
        ClientDTO clientDTO = clientService.createClient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(clientDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<ClientDTO> getClientById(@PathVariable UUID id) {
        ClientDTO clientDTO = clientService.getClientById(id);
        return ResponseEntity.ok(clientDTO);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<Page<ClientDTO>> getAllClients(Pageable pageable) {
        Page<ClientDTO> clients = clientService.getAllClients(pageable);
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/vip")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<List<ClientDTO>> getVipClients() {
        List<ClientDTO> clients = clientService.getVipClients();
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<List<ClientDTO>> searchClients(@RequestParam String name) {
        List<ClientDTO> clients = clientService.searchClients(name);
        return ResponseEntity.ok(clients);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('CLIENTS')")
    public ResponseEntity<ClientDTO> updateClient(@PathVariable UUID id, @Valid @RequestBody CreateClientRequest request) {
        ClientDTO clientDTO = clientService.updateClient(id, request);
        return ResponseEntity.ok(clientDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteClient(@PathVariable UUID id) {
        clientService.deleteClient(id);
        return ResponseEntity.noContent().build();
    }
}
