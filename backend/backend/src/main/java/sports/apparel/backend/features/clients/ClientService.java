package sports.apparel.backend.features.clients;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sports.apparel.backend.entity.Client;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ClientService {

    private static final Logger log = LoggerFactory.getLogger(ClientService.class);

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @PostConstruct
    public void initializeClientCodes() {
        try {
            List<Client> clients = clientRepository.findAllByOrderByCreatedAtAsc();
            if (clients.isEmpty()) {
                return;
            }

            int nextSequence = clients.stream()
                    .map(Client::getClientCode)
                    .filter(code -> code != null && !code.isBlank())
                    .mapToInt(this::parseClientSequence)
                    .max()
                    .orElse(0) + 1;

            List<Client> clientsToUpdate = new ArrayList<>();
            for (Client client : clients) {
                if (client.getClientCode() == null || client.getClientCode().isBlank()) {
                    client.setClientCode(buildClientCode(client.getClientName(), nextSequence++));
                    clientsToUpdate.add(client);
                }
            }

            if (!clientsToUpdate.isEmpty()) {
                clientRepository.saveAll(clientsToUpdate);
            }
        } catch (Exception exception) {
            log.warn("Skipping client code backfill during startup: {}", exception.getMessage());
        }
    }

    public ClientDTO createClient(CreateClientRequest request) {
        Client client = new Client();
        client.setClientCode(buildClientCode(request.getClientName(), getNextClientSequence()));
        client.setClientName(request.getClientName());
        client.setContactNumber(request.getContactNumber());
        client.setVip(request.getVip() != null ? request.getVip() : false);
        client.setNotes(request.getNotes());

        Client savedClient = clientRepository.save(client);
        return new ClientDTO(savedClient);
    }

    public ClientDTO getClientById(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        return new ClientDTO(client);
    }

    public Page<ClientDTO> getAllClients(Pageable pageable) {
        return clientRepository.findAll(pageable)
                .map(ClientDTO::new);
    }

    public List<ClientDTO> getVipClients() {
        return clientRepository.findByVipTrue().stream()
                .map(ClientDTO::new)
                .collect(Collectors.toList());
    }

    public List<ClientDTO> searchClients(String name) {
        return clientRepository.findByClientNameContainingIgnoreCase(name).stream()
                .map(ClientDTO::new)
                .collect(Collectors.toList());
    }

    public ClientDTO updateClient(UUID id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));

        client.setClientName(request.getClientName());
        client.setContactNumber(request.getContactNumber());
        client.setVip(request.getVip() != null ? request.getVip() : client.getVip());
        client.setNotes(request.getNotes());

        Client updatedClient = clientRepository.save(client);
        return new ClientDTO(updatedClient);
    }

    public void deleteClient(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        clientRepository.delete(client);
    }

    private int getNextClientSequence() {
        return clientRepository.findAll().stream()
                .map(Client::getClientCode)
                .filter(code -> code != null && !code.isBlank())
                .mapToInt(this::parseClientSequence)
                .max()
                .orElse(0) + 1;
    }

    private int parseClientSequence(String clientCode) {
        if (clientCode == null || clientCode.isBlank()) {
            return 0;
        }

        int dashIndex = clientCode.lastIndexOf('-');
        if (dashIndex < 0 || dashIndex == clientCode.length() - 1) {
            return 0;
        }

        try {
            return Integer.parseInt(clientCode.substring(dashIndex + 1));
        } catch (NumberFormatException exception) {
            return 0;
        }
    }

    private String buildClientCode(String clientName, int sequence) {
        String normalizedName = clientName == null ? "" : clientName.trim().replaceAll("[^A-Za-z0-9 ]", "");
        String[] parts = normalizedName.split("\\s+");
        StringBuilder initials = new StringBuilder();

        for (String part : parts) {
            if (!part.isBlank()) {
                initials.append(Character.toUpperCase(part.charAt(0)));
            }
            if (initials.length() == 2) {
                break;
            }
        }

        if (initials.length() == 0 && !normalizedName.isBlank()) {
            initials.append(Character.toUpperCase(normalizedName.charAt(0)));
        }

        while (initials.length() < 2) {
            initials.append('X');
        }

        return String.format("%s-%04d", initials, sequence);
    }
}
