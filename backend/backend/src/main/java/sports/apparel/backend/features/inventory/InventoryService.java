package sports.apparel.backend.features.inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.features.inventory.CreateInventoryRequest;
import sports.apparel.backend.features.inventory.InventoryDTO;
import sports.apparel.backend.entity.Inventory;
import sports.apparel.backend.features.inventory.InventoryRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public InventoryService(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public InventoryDTO createInventory(CreateInventoryRequest request) {
        validateInventoryRequest(request);
        Inventory inventory = new Inventory();
        inventory.setItemType(request.getItemType());
        inventory.setJerseyType(request.getJerseyType());
        inventory.setName(request.getName());
        inventory.setShop(request.getShop());
        inventory.setSize(request.getSize());
        inventory.setNumber(request.getNumber());
        inventory.setNotes(request.getNotes());
        inventory.setQuantity(request.getQuantity());
        inventory.setPrice(request.getPrice());

        Inventory savedInventory = inventoryRepository.save(inventory);
        return new InventoryDTO(savedInventory);
    }

    public InventoryDTO getInventoryById(UUID id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found"));
        return new InventoryDTO(inventory);
    }

    public Page<InventoryDTO> getAllInventory(Pageable pageable) {
        return inventoryRepository.findAll(pageable)
                .map(InventoryDTO::new);
    }

    public List<InventoryDTO> getInventoryByItemType(String itemType) {
        return inventoryRepository.findByItemType(itemType).stream()
                .map(InventoryDTO::new)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> searchInventory(String name) {
        return inventoryRepository.findByNameContainingIgnoreCase(name).stream()
                .map(InventoryDTO::new)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getLowStockInventory(Integer threshold) {
        return inventoryRepository.findByQuantityLessThan(threshold).stream()
                .map(InventoryDTO::new)
                .collect(Collectors.toList());
    }

    public InventoryDTO updateInventory(UUID id, CreateInventoryRequest request) {
        validateInventoryRequest(request);
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found"));

        inventory.setItemType(request.getItemType());
        inventory.setJerseyType(request.getJerseyType());
        inventory.setName(request.getName());
        inventory.setShop(request.getShop());
        inventory.setSize(request.getSize());
        inventory.setNumber(request.getNumber());
        inventory.setNotes(request.getNotes());
        inventory.setQuantity(request.getQuantity());
        inventory.setPrice(request.getPrice());

        Inventory updatedInventory = inventoryRepository.save(inventory);
        return new InventoryDTO(updatedInventory);
    }

    public void deleteInventory(UUID id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inventory item not found"));
        inventoryRepository.delete(inventory);
    }

    private void validateInventoryRequest(CreateInventoryRequest request) {
        if (request.getShop() != null && request.getShop().trim().isEmpty()) {
            request.setShop(null);
        }
        if (request.getShop() != null) {
            request.setShop(request.getShop().trim());
        }
        if (request.getSize() != null && request.getSize().trim().isEmpty()) {
            request.setSize(null);
        }
        if (request.getSize() != null) {
            request.setSize(request.getSize().trim());
        }
        if (request.getNumber() != null && request.getNumber().trim().isEmpty()) {
            request.setNumber(null);
        }
        if (request.getNumber() != null) {
            request.setNumber(request.getNumber().trim());
        }
        if (request.getNotes() != null && request.getNotes().trim().isEmpty()) {
            request.setNotes(null);
        }
        if (request.getNotes() != null) {
            request.setNotes(request.getNotes().trim());
        }
        if (request.getJerseyType() != null && request.getJerseyType().trim().isEmpty()) {
            request.setJerseyType(null);
        }
        if (request.getJerseyType() != null) {
            request.setJerseyType(request.getJerseyType().trim());
        }
    }
}
