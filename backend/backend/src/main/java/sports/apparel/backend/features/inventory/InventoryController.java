package sports.apparel.backend.features.inventory;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<InventoryDTO> createInventory(@Valid @RequestBody CreateInventoryRequest request) {
        InventoryDTO inventoryDTO = inventoryService.createInventory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<InventoryDTO> getInventoryById(@PathVariable UUID id) {
        InventoryDTO inventoryDTO = inventoryService.getInventoryById(id);
        return ResponseEntity.ok(inventoryDTO);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<Page<InventoryDTO>> getAllInventory(Pageable pageable) {
        Page<InventoryDTO> inventory = inventoryService.getAllInventory(pageable);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/type/{itemType}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<List<InventoryDTO>> getInventoryByItemType(@PathVariable String itemType) {
        List<InventoryDTO> inventory = inventoryService.getInventoryByItemType(itemType);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<List<InventoryDTO>> searchInventory(@RequestParam String name) {
        List<InventoryDTO> inventory = inventoryService.searchInventory(name);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/low-stock/{threshold}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<List<InventoryDTO>> getLowStockInventory(@PathVariable Integer threshold) {
        List<InventoryDTO> inventory = inventoryService.getLowStockInventory(threshold);
        return ResponseEntity.ok(inventory);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('INVENTORY')")
    public ResponseEntity<InventoryDTO> updateInventory(@PathVariable UUID id, @Valid @RequestBody CreateInventoryRequest request) {
        InventoryDTO inventoryDTO = inventoryService.updateInventory(id, request);
        return ResponseEntity.ok(inventoryDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteInventory(@PathVariable UUID id) {
        inventoryService.deleteInventory(id);
        return ResponseEntity.noContent().build();
    }
}
