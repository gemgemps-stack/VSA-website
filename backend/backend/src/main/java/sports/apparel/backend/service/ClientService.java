package sports.apparel.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.CreateClientRequest;
import sports.apparel.backend.dto.ClientDTO;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.repository.ClientRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    public ClientDTO createClient(CreateClientRequest request) {
        Client client = new Client();
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
}
