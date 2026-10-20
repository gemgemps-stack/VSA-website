package sports.apparel.backend.features.inventory;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private static final String READ_ACCESS =
            "hasRole('ADMIN') or hasAnyAuthority('INVENTORY', 'INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS')";

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
    @PreAuthorize(READ_ACCESS)
    public ResponseEntity<InventoryDTO> getInventoryById(@PathVariable UUID id) {
        InventoryDTO inventoryDTO = inventoryService.getInventoryById(id);
        return ResponseEntity.ok(inventoryDTO);
    }

    @GetMapping
    @PreAuthorize(READ_ACCESS)
    public ResponseEntity<Page<InventoryDTO>> getAllInventory(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String itemType,
            @RequestParam(required = false) String jerseyType,
            @RequestParam(name = "jerseySize", required = false) String size,
            @RequestParam(required = false) String shop,
            @RequestParam(required = false) Boolean lowStock,
            @RequestParam(required = false) Boolean excludeZeroStock,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo) {
        Page<InventoryDTO> inventory = inventoryService.searchInventory(
                search, itemType, jerseyType, size, shop, lowStock, excludeZeroStock,
                createdFrom, createdTo, pageable);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/type/{itemType}")
    @PreAuthorize(READ_ACCESS)
    public ResponseEntity<List<InventoryDTO>> getInventoryByItemType(@PathVariable String itemType) {
        List<InventoryDTO> inventory = inventoryService.getInventoryByItemType(itemType);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/search")
    @PreAuthorize(READ_ACCESS)
    public ResponseEntity<List<InventoryDTO>> searchInventory(@RequestParam String name) {
        List<InventoryDTO> inventory = inventoryService.searchInventory(name);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/low-stock/{threshold}")
    @PreAuthorize(READ_ACCESS)
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
