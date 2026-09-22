package sports.apparel.backend.features.returneditems;

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
@RequestMapping("/api/returned-items")
public class ReturnedItemController {

    private final ReturnedItemService returnedItemService;

    public ReturnedItemController(ReturnedItemService returnedItemService) {
        this.returnedItemService = returnedItemService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<ReturnedItemDTO> createReturnedItem(@Valid @RequestBody CreateReturnedItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(returnedItemService.createReturnedItem(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<ReturnedItemDTO> getReturnedItemById(@PathVariable UUID id) {
        return ResponseEntity.ok(returnedItemService.getReturnedItemById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<Page<ReturnedItemDTO>> getAllReturnedItems(Pageable pageable) {
        return ResponseEntity.ok(returnedItemService.getAllReturnedItems(pageable));
    }

    @GetMapping("/by-order/{orderId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<List<ReturnedItemDTO>> getReturnedItemsByOrderId(@PathVariable UUID orderId) {
        return ResponseEntity.ok(returnedItemService.getReturnedItemsByOrderId(orderId));
    }

    @GetMapping("/by-customized-order/{customizedOrderId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<List<ReturnedItemDTO>> getReturnedItemsByCustomizedOrderId(@PathVariable UUID customizedOrderId) {
        return ResponseEntity.ok(returnedItemService.getReturnedItemsByCustomizedOrderId(customizedOrderId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('INVENTORY_ORDERS', 'ORDERS', 'CUSTOMIZED_ORDERS', 'INVENTORY')")
    public ResponseEntity<ReturnedItemDTO> updateReturnedItem(
            @PathVariable UUID id,
            @Valid @RequestBody CreateReturnedItemRequest request) {
        return ResponseEntity.ok(returnedItemService.updateReturnedItem(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReturnedItem(@PathVariable UUID id) {
        returnedItemService.deleteReturnedItem(id);
        return ResponseEntity.noContent().build();
    }
}