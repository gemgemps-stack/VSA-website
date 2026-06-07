package sports.apparel.backend.features.orders;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.orders.CreateOrderRequest;
import sports.apparel.backend.features.orders.OrderDTO;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderDTO orderDTO = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(orderDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable UUID id) {
        OrderDTO orderDTO = orderService.getOrderById(id);
        return ResponseEntity.ok(orderDTO);
    }

    @GetMapping("/job-order-no/{jobOrderNo}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<OrderDTO> getOrderByJobOrderNo(@PathVariable String jobOrderNo) {
        OrderDTO orderDTO = orderService.getOrderByJobOrderNo(jobOrderNo);
        return ResponseEntity.ok(orderDTO);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<Page<OrderDTO>> getAllOrders(Pageable pageable) {
        Page<OrderDTO> orders = orderService.getAllOrders(pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<List<OrderDTO>> getOrdersByClientId(@PathVariable UUID clientId) {
        List<OrderDTO> orders = orderService.getOrdersByClientId(clientId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<List<OrderDTO>> getOrdersByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<OrderDTO> orders = orderService.getOrdersByDateRange(startDate, endDate);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/year-month")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<List<OrderDTO>> getOrdersByYearAndMonth(
            @RequestParam int year,
            @RequestParam int month) {
        List<OrderDTO> orders = orderService.getOrdersByYearAndMonth(year, month);
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDERS')")
    public ResponseEntity<OrderDTO> updateOrder(@PathVariable UUID id, @Valid @RequestBody CreateOrderRequest request) {
        OrderDTO orderDTO = orderService.updateOrder(id, request);
        return ResponseEntity.ok(orderDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteOrder(@PathVariable UUID id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
