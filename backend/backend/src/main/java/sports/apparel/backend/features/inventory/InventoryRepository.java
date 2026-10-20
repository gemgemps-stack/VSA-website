package sports.apparel.backend.features.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.Inventory;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, UUID>, JpaSpecificationExecutor<Inventory> {
    List<Inventory> findByItemType(String itemType);

    List<Inventory> findByNameContainingIgnoreCase(String name);

    List<Inventory> findByQuantityLessThan(Integer quantity);

    long countByQuantityLessThan(Integer quantity);
}
