package sports.apparel.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.DashboardStatsDTO;
import sports.apparel.backend.repository.ClientRepository;
import sports.apparel.backend.repository.InventoryRepository;
import sports.apparel.backend.repository.OrderRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final InventoryRepository inventoryRepository;

    public DashboardService(OrderRepository orderRepository,
                           ClientRepository clientRepository,
                           InventoryRepository inventoryRepository) {
        this.orderRepository = orderRepository;
        this.clientRepository = clientRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public DashboardStatsDTO getStats() {
        return new DashboardStatsDTO(
                orderRepository.count(),
                clientRepository.count(),
                inventoryRepository.count()
        );
    }
}
