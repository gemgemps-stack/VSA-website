package sports.apparel.backend.features.customizedorders;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.orders.ErrorResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customized-orders")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class CustomizedOrderController {

    private final CustomizedOrderService customizedOrderService;

    public CustomizedOrderController(CustomizedOrderService customizedOrderService) {
        this.customizedOrderService = customizedOrderService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<CustomizedOrderDTO> createOrder(@Valid @RequestBody CreateCustomizedOrderRequest request) {
        CustomizedOrderDTO orderDTO = customizedOrderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(orderDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<CustomizedOrderDTO> getOrderById(@PathVariable UUID id) {
        CustomizedOrderDTO orderDTO = customizedOrderService.getOrderById(id);
        return ResponseEntity.ok(orderDTO);
    }

    @GetMapping("/job-order-no/{jobOrderNo}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<CustomizedOrderDTO> getOrderByJobOrderNo(@PathVariable String jobOrderNo) {
        CustomizedOrderDTO orderDTO = customizedOrderService.getOrderByJobOrderNo(jobOrderNo);
        return ResponseEntity.ok(orderDTO);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<Page<CustomizedOrderDTO>> getAllOrders(Pageable pageable) {
        Page<CustomizedOrderDTO> orders = customizedOrderService.getAllOrders(pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<List<CustomizedOrderDTO>> getOrdersByClientId(@PathVariable UUID clientId) {
        List<CustomizedOrderDTO> orders = customizedOrderService.getOrdersByClientId(clientId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<List<CustomizedOrderDTO>> getOrdersByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<CustomizedOrderDTO> orders = customizedOrderService.getOrdersByDateRange(startDate, endDate);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/year-month")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<List<CustomizedOrderDTO>> getOrdersByYearAndMonth(
            @RequestParam int year,
            @RequestParam int month) {
        List<CustomizedOrderDTO> orders = customizedOrderService.getOrdersByYearAndMonth(year, month);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<List<CustomizedOrderDTO>> getOrdersByStatus(@RequestParam String status) {
        List<CustomizedOrderDTO> orders = customizedOrderService.getOrdersByStatus(status);
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('CUSTOMIZED_ORDERS', 'ORDERS')")
    public ResponseEntity<CustomizedOrderDTO> updateOrder(@PathVariable UUID id,
                                                          @Valid @RequestBody CreateCustomizedOrderRequest request) {
        CustomizedOrderDTO orderDTO = customizedOrderService.updateOrder(id, request);
        return ResponseEntity.ok(orderDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteOrder(@PathVariable UUID id) {
        try {
            customizedOrderService.deleteOrder(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new ErrorResponse("error", e.getMessage())
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                new ErrorResponse("error", e.getMessage() != null ? e.getMessage() : "Failed to delete order")
            );
        }
    }
}
