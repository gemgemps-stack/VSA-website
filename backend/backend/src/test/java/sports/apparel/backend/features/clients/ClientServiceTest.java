package sports.apparel.backend.features.clients;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sports.apparel.backend.entity.Client;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.orders.OrderRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomizedOrderRepository customizedOrderRepository;

    @InjectMocks
    private ClientService clientService;

    @Test
    void findOrRegisterClient_shouldRegisterUnregisteredClientWithContactNumber() {
        when(clientRepository.findFirstByClientNameIgnoreCase("Walk In Client")).thenReturn(Optional.empty());
        when(clientRepository.findAll()).thenReturn(List.of());
        when(clientRepository.save(any(Client.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Client result = clientService.findOrRegisterClient(null, "Walk In Client",
                "0917-123-4567", "Verdida School", "Cebu City");

        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(captor.capture());
        Client saved = captor.getValue();

        assertEquals("WI-0001", saved.getClientCode());
        assertEquals("Walk In Client", saved.getClientName());
        assertEquals("0917-123-4567", saved.getContactNumber());
        assertEquals("Verdida School", saved.getCompanySchool());
        assertEquals("Cebu City", saved.getCityMunicipality());
        assertEquals(Boolean.FALSE, saved.getVip());
        assertSame(saved, result);
    }

    @Test
    void findOrRegisterClient_shouldReuseClientWithMatchingName() {
        Client existing = existingClient();
        when(clientRepository.findFirstByClientNameIgnoreCase("Walk In Client")).thenReturn(Optional.of(existing));

        Client result = clientService.findOrRegisterClient(null, "  Walk In Client  ", null, null, null);

        assertSame(existing, result);
        verify(clientRepository, never()).save(any(Client.class));
    }

    @Test
    void findOrRegisterClient_shouldSkipRegistrationWithoutContactNumber() {
        when(clientRepository.findFirstByClientNameIgnoreCase("Walk In Client")).thenReturn(Optional.empty());

        Client result = clientService.findOrRegisterClient(null, "Walk In Client", "  ", null, null);

        assertNull(result);
        verify(clientRepository, never()).save(any(Client.class));
    }

    @Test
    void findOrRegisterClient_shouldLoadClientWhenIdIsProvided() {
        Client existing = existingClient();
        when(clientRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        Client result = clientService.findOrRegisterClient(existing.getId(), "Different Name",
                "0999-999-9999", null, null);

        assertSame(existing, result);
        verify(clientRepository, never()).findFirstByClientNameIgnoreCase(any());
    }

    private Client existingClient() {
        Client client = new Client();
        client.setId(UUID.randomUUID());
        client.setClientCode("WI-0001");
        client.setClientName("Walk In Client");
        client.setContactNumber("0917-123-4567");
        return client;
    }
}
