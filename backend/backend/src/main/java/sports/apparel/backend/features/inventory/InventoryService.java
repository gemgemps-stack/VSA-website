package sports.apparel.backend.features.inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.Inventory;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    public static final int LOW_STOCK_THRESHOLD = 10;

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
        inventory.setGraphicArtist(request.getGraphicArtist());
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

    public Page<InventoryDTO> searchInventory(String search, String itemType, String jerseyType, String size,
                                              String shop, Boolean lowStock,
                                              java.time.LocalDate createdFrom, java.time.LocalDate createdTo,
                                              Pageable pageable) {
        List<String> textFilters = List.of(search, itemType, jerseyType, size, shop);
        boolean hasFilters = textFilters.stream().anyMatch(value -> value != null && !value.isBlank())
                || Boolean.TRUE.equals(lowStock)
                || createdFrom != null
                || createdTo != null;

        if (!hasFilters) {
            return getAllInventory(pageable);
        }

        Specification<Inventory> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("itemType")), like),
                        cb.like(cb.lower(root.get("jerseyType")), like),
                        cb.like(cb.lower(root.get("shop")), like),
                        cb.like(cb.lower(root.get("notes")), like)));
            }
            addContainsPredicate(predicates, root.get("itemType"), itemType, cb);
            addContainsPredicate(predicates, root.get("jerseyType"), jerseyType, cb);
            addContainsPredicate(predicates, root.get("size"), size, cb);
            addContainsPredicate(predicates, root.get("shop"), shop, cb);

            if (Boolean.TRUE.equals(lowStock)) {
                predicates.add(cb.lessThan(root.get("quantity"), LOW_STOCK_THRESHOLD));
            }
            if (createdFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), createdFrom.atStartOfDay()));
            }
            if (createdTo != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), createdTo.plusDays(1).atStartOfDay()));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return inventoryRepository.findAll(spec, pageable).map(InventoryDTO::new);
    }

    private void addContainsPredicate(List<jakarta.persistence.criteria.Predicate> predicates,
                                      jakarta.persistence.criteria.Expression<String> path,
                                      String value,
                                      jakarta.persistence.criteria.CriteriaBuilder cb) {
        if (value != null && !value.isBlank()) {
            predicates.add(cb.like(cb.lower(path), "%" + value.trim().toLowerCase() + "%"));
        }
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
        inventory.setGraphicArtist(request.getGraphicArtist());
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
        if (request.getGraphicArtist() != null && request.getGraphicArtist().trim().isEmpty()) {
            request.setGraphicArtist(null);
        }
        if (request.getGraphicArtist() != null) {
            request.setGraphicArtist(request.getGraphicArtist().trim());
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
