package sports.apparel.backend.features.returneditems;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.CustomizedOrder;
import sports.apparel.backend.entity.Inventory;
import sports.apparel.backend.entity.Order;
import sports.apparel.backend.entity.ReturnedItem;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.inventory.InventoryRepository;
import sports.apparel.backend.features.orders.OrderRepository;
import sports.apparel.backend.support.IdempotencyService;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReturnedItemService {

    private static final String STATUS_CANCELLED = "CANCELLED";

    private final ReturnedItemRepository returnedItemRepository;
    private final OrderRepository orderRepository;
    private final CustomizedOrderRepository customizedOrderRepository;
    private final InventoryRepository inventoryRepository;
    private final IdempotencyService idempotencyService;

    public ReturnedItemService(ReturnedItemRepository returnedItemRepository, OrderRepository orderRepository,
                               CustomizedOrderRepository customizedOrderRepository, InventoryRepository inventoryRepository,
                               IdempotencyService idempotencyService) {
        this.returnedItemRepository = returnedItemRepository;
        this.orderRepository = orderRepository;
        this.customizedOrderRepository = customizedOrderRepository;
        this.inventoryRepository = inventoryRepository;
        this.idempotencyService = idempotencyService;
    }

    public ReturnedItemDTO createReturnedItem(CreateReturnedItemRequest request) {
        String dedupeKey = buildDedupeKey(request);
        ReturnedItemDTO existingResponse = idempotencyService.execute(dedupeKey, () -> createReturnedItemInternal(request));
        if (existingResponse != null) {
            return existingResponse;
        }

        return createReturnedItemInternal(request);
    }

    private ReturnedItemDTO createReturnedItemInternal(CreateReturnedItemRequest request) {
        validateQuantity(request.getQuantity());

        ReturnedItem returnedItem = new ReturnedItem();
        if (request.getOrderId() != null) {
            Order order = orderRepository.findById(request.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));
            returnedItem.setOrder(order);
        }
        if (request.getCustomizedOrderId() != null) {
            CustomizedOrder customizedOrder = customizedOrderRepository.findById(request.getCustomizedOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Customized order not found"));
            returnedItem.setCustomizedOrder(customizedOrder);
        }
        if (returnedItem.getOrder() == null && returnedItem.getCustomizedOrder() == null) {
            throw new IllegalArgumentException("Either order or customized order is required");
        }

        returnedItem.setProductName(request.getProductName());
        returnedItem.setSize(request.getSize());
        returnedItem.setNumber(request.getNumber());
        returnedItem.setJerseyType(request.getJerseyType());
        returnedItem.setQuantity(request.getQuantity());
        returnedItem.setReason(request.getReason());
        returnedItem.setReturnDate(request.getReturnDate());
        returnedItem.setRequestFingerprint(buildDedupeKey(request));

        ReturnedItem saved = returnedItemRepository.save(returnedItem);
        restockInventoryForReturnedItem(saved);
        return new ReturnedItemDTO(saved);
    }

    @Transactional(readOnly = true)
    public ReturnedItemDTO getReturnedItemById(UUID id) {
        ReturnedItem returnedItem = returnedItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Returned item not found"));
        return new ReturnedItemDTO(returnedItem);
    }

    @Transactional(readOnly = true)
    public List<ReturnedItemDTO> getReturnedItemsByOrderId(UUID orderId) {
        return returnedItemRepository.findByOrderIdOrderByReturnDateDescCreatedAtDesc(orderId).stream()
                .map(ReturnedItemDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReturnedItemDTO> getReturnedItemsByCustomizedOrderId(UUID customizedOrderId) {
        return returnedItemRepository.findByCustomizedOrderIdOrderByReturnDateDescCreatedAtDesc(customizedOrderId).stream()
                .map(ReturnedItemDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReturnedItemDTO> getAllReturnedItems(Pageable pageable) {
        return returnedItemRepository.findAllByOrderByReturnDateDescCreatedAtDesc(pageable)
                .map(ReturnedItemDTO::new);
    }

    public ReturnedItemDTO updateReturnedItem(UUID id, CreateReturnedItemRequest request) {
        ReturnedItem returnedItem = returnedItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Returned item not found"));

        validateQuantity(request.getQuantity());
        unstockInventoryForReturnedItem(returnedItem);

        if (request.getOrderId() != null) {
            Order order = orderRepository.findById(request.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));
            returnedItem.setOrder(order);
        }
        if (request.getCustomizedOrderId() != null) {
            CustomizedOrder customizedOrder = customizedOrderRepository.findById(request.getCustomizedOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Customized order not found"));
            returnedItem.setCustomizedOrder(customizedOrder);
        }

        returnedItem.setProductName(request.getProductName());
        returnedItem.setSize(request.getSize());
        returnedItem.setNumber(request.getNumber());
        returnedItem.setJerseyType(request.getJerseyType());
        returnedItem.setQuantity(request.getQuantity());
        returnedItem.setReason(request.getReason());
        returnedItem.setReturnDate(request.getReturnDate());

        ReturnedItem saved = returnedItemRepository.save(returnedItem);
        restockInventoryForReturnedItem(saved);
        return new ReturnedItemDTO(saved);
    }

    public void deleteReturnedItem(UUID id) {
        ReturnedItem returnedItem = returnedItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Returned item not found"));
        unstockInventoryForReturnedItem(returnedItem);
        returnedItemRepository.delete(returnedItem);
    }

    private void restockInventoryForReturnedItem(ReturnedItem returnedItem) {
        if (!isCancelledInventoryOrder(returnedItem)) {
            return;
        }
        Inventory inventory = findInventoryByRetailLabel(returnedItem.getProductName());
        if (inventory != null) {
            int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
            inventory.setQuantity(currentStock + safeQuantity(returnedItem.getQuantity()));
            inventoryRepository.save(inventory);
        }
    }

    private void unstockInventoryForReturnedItem(ReturnedItem returnedItem) {
        if (!isCancelledInventoryOrder(returnedItem)) {
            return;
        }
        Inventory inventory = findInventoryByRetailLabel(returnedItem.getProductName());
        if (inventory != null) {
            int currentStock = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
            inventory.setQuantity(Math.max(0, currentStock - safeQuantity(returnedItem.getQuantity())));
            inventoryRepository.save(inventory);
        }
    }

    private boolean isCancelledInventoryOrder(ReturnedItem returnedItem) {
        Order order = returnedItem.getOrder();
        return order != null && STATUS_CANCELLED.equalsIgnoreCase(order.getStatus());
    }

    private int safeQuantity(Integer quantity) {
        return quantity != null ? quantity : 0;
    }

    private Inventory findInventoryByRetailLabel(String retailLabel) {
        if (retailLabel == null || retailLabel.isBlank()) {
            return null;
        }

        return inventoryRepository.findAll().stream()
                .filter(inventory -> buildInventoryLabel(inventory).equalsIgnoreCase(retailLabel.trim()))
                .findFirst()
                .orElse(null);
    }

    private String buildInventoryLabel(Inventory inventory) {
        String itemType = inventory.getItemType() != null ? inventory.getItemType() : "Inventory Item";
        String shopSuffix = (inventory.getShop() != null && !inventory.getShop().isBlank()) ? " (" + inventory.getShop() + ")" : "";

        if ("Jersey".equalsIgnoreCase(itemType) && inventory.getJerseyType() != null && !inventory.getJerseyType().isBlank()) {
            return String.format("%s - %s - %s%s", itemType, inventory.getJerseyType(), inventory.getName(), shopSuffix);
        }

        return String.format("%s - %s%s", itemType, inventory.getName(), shopSuffix);
    }

    private void validateQuantity(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
    }

    private String buildDedupeKey(CreateReturnedItemRequest request) {
        String orderId = request.getOrderId() != null ? request.getOrderId().toString() : "";
        String customizedOrderId = request.getCustomizedOrderId() != null ? request.getCustomizedOrderId().toString() : "";
        String returnDate = request.getReturnDate() != null ? request.getReturnDate().toString() : "";
        String contentHash = String.join("|", orderId, customizedOrderId, returnDate,
                request.getProductName() != null ? request.getProductName() : "",
                request.getSize() != null ? request.getSize() : "",
                request.getQuantity() != null ? request.getQuantity().toString() : "");
        return "returned-item:create:" + Integer.toHexString(contentHash.hashCode());
    }
}