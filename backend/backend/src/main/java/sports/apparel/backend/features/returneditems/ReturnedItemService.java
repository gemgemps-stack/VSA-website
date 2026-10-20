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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
        return idempotencyService.execute(dedupeKey, () -> createReturnedItemInternal(request, dedupeKey));
    }

    public List<ReturnedItemDTO> createReturnedItemsBulk(List<CreateReturnedItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("At least one returned item is required");
        }
        String batchKey = buildBulkDedupeKey(requests);
        return idempotencyService.execute(batchKey, () -> createReturnedItemsInternal(requests));
    }

    private List<ReturnedItemDTO> createReturnedItemsInternal(List<CreateReturnedItemRequest> requests) {
        List<ReturnedItemDTO> results = new java.util.ArrayList<>();
        Map<String, ReturnedItemDTO> processed = new java.util.HashMap<>();
        Map<String, Integer> batchQuantities = new java.util.HashMap<>();
        for (CreateReturnedItemRequest request : requests) {
            String dedupeKey = buildDedupeKey(request);
            if (processed.containsKey(dedupeKey)) {
                continue;
            }
            ReturnedItemDTO persisted = findByIdempotencyKey(dedupeKey);
            if (persisted != null) {
                processed.put(dedupeKey, persisted);
                results.add(persisted);
                continue;
            }
            validateReturnRequest(request, null, batchQuantities);
            ReturnedItemDTO created = saveReturnedItem(request, dedupeKey);
            processed.put(dedupeKey, created);
            results.add(created);
        }

        if (results.isEmpty()) {
            throw new IllegalArgumentException("No new returned items to record");
        }
        return results;
    }

    private ReturnedItemDTO createReturnedItemInternal(CreateReturnedItemRequest request, String dedupeKey) {
        ReturnedItemDTO persisted = findByIdempotencyKey(dedupeKey);
        if (persisted != null) {
            return persisted;
        }
        validateReturnRequest(request, null, new java.util.HashMap<>());
        return saveReturnedItem(request, dedupeKey);
    }

    private ReturnedItemDTO saveReturnedItem(CreateReturnedItemRequest request, String dedupeKey) {
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
        returnedItem.setProductName(request.getProductName());
        returnedItem.setSize(request.getSize());
        returnedItem.setNumber(request.getNumber());
        returnedItem.setJerseyType(request.getJerseyType());
        returnedItem.setQuantity(request.getQuantity());
        returnedItem.setReason(request.getReason());
        returnedItem.setReturnDate(request.getReturnDate());
        returnedItem.setRequestFingerprint(dedupeKey);

        ReturnedItem saved = returnedItemRepository.save(returnedItem);
        restockInventoryForReturnedItem(saved);
        return new ReturnedItemDTO(saved);
    }

    private ReturnedItemDTO findByIdempotencyKey(String dedupeKey) {
        return returnedItemRepository.findByRequestFingerprint(dedupeKey)
                .map(ReturnedItemDTO::new)
                .orElse(null);
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
    public Page<ReturnedItemDTO> searchReturnedItems(String orderType, String clientName, String status,
                                                      LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return returnedItemRepository.searchReturnedItems(
                normalizeFilter(orderType), normalizeFilter(clientName), normalizeFilter(status), dateFrom, dateTo, pageable)
                .map(ReturnedItemDTO::new);
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public ReturnedItemDTO updateReturnedItem(UUID id, CreateReturnedItemRequest request) {
        ReturnedItem returnedItem = returnedItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Returned item not found"));

        validateReturnRequest(request, id, new java.util.HashMap<>());
        unstockInventoryForReturnedItem(returnedItem);

        returnedItem.setOrder(null);
        returnedItem.setCustomizedOrder(null);
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

    private void validateReturnRequest(CreateReturnedItemRequest request, UUID excludedId,
                                        java.util.Map<String, Integer> batchQuantities) {
        boolean hasOrder = request.getOrderId() != null;
        boolean hasCustomizedOrder = request.getCustomizedOrderId() != null;
        if (hasOrder == hasCustomizedOrder) {
            throw new IllegalArgumentException("Exactly one of order or customized order must be required");
        }
        validateQuantity(request.getQuantity());
        if (request.getProductName() == null || request.getProductName().isBlank()) {
            throw new IllegalArgumentException("Product name is required");
        }

        String productName = request.getProductName().trim();
        String size = normalizeSize(request.getSize());

        if (hasOrder) {
            Order order = orderRepository.findById(request.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));
            int orderedQuantity = orderedQuantityForOrder(order, productName, size);
            if (orderedQuantity <= 0) {
                throw new IllegalArgumentException(
                        "Product " + productName + " does not belong to order " + order.getJobOrderNo());
            }
            int alreadyReturned = returnedQuantityForOrder(request.getOrderId(), productName, size, excludedId);
            int batchRequested = batchQuantities.merge(
                    returnKey("order", request.getOrderId(), productName, size), request.getQuantity(), Integer::sum);
            int remaining = orderedQuantity - alreadyReturned - batchRequested;
            if (remaining < 0) {
                throw new IllegalArgumentException(
                        "Return quantity exceeds the remaining quantity for " + productName + " (max " + (orderedQuantity - alreadyReturned) + ")");
            }
        } else {
            CustomizedOrder customizedOrder = customizedOrderRepository.findById(request.getCustomizedOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Customized order not found"));
            int orderedQuantity = orderedQuantityForCustomizedOrder(customizedOrder, productName, size);
            if (orderedQuantity <= 0) {
                throw new IllegalArgumentException(
                        "Product " + productName + " does not belong to order " + customizedOrder.getJobOrderNo());
            }
            int alreadyReturned = returnedQuantityForCustomizedOrder(request.getCustomizedOrderId(), productName, size, excludedId);
            int batchRequested = batchQuantities.merge(
                    returnKey("customized", request.getCustomizedOrderId(), productName, size), request.getQuantity(), Integer::sum);
            int remaining = orderedQuantity - alreadyReturned - batchRequested;
            if (remaining < 0) {
                throw new IllegalArgumentException(
                        "Return quantity exceeds the remaining quantity for " + productName + " (max " + (orderedQuantity - alreadyReturned) + ")");
            }
        }
    }

    private int orderedQuantityForOrder(Order order, String productName, String size) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            String retail = order.getOrderRetail() != null ? order.getOrderRetail().trim() : "";
            return productName.equalsIgnoreCase(retail) ? safeQuantity(order.getQuantity()) : 0;
        }
        return order.getItems().stream()
                .filter(item -> matchesLine(item.getProductName(), item.getSize(), productName, size))
                .mapToInt(item -> safeQuantity(item.getQuantity()))
                .sum();
    }

    private int orderedQuantityForCustomizedOrder(CustomizedOrder customizedOrder, String productName, String size) {
        if (customizedOrder.getItems() == null || customizedOrder.getItems().isEmpty()) {
            return 0;
        }
        return customizedOrder.getItems().stream()
                .filter(item -> matchesLine(item.getProductName(), item.getSize(), productName, size))
                .mapToInt(item -> safeQuantity(item.getQuantity()))
                .sum();
    }

    private int returnedQuantityForOrder(UUID orderId, String productName, String size, UUID excludedId) {
        return returnedItemRepository.findByOrderIdOrderByReturnDateDescCreatedAtDesc(orderId).stream()
                .filter(existing -> excludedId == null || !excludedId.equals(existing.getId()))
                .filter(existing -> matchesLine(existing.getProductName(), existing.getSize(), productName, size))
                .mapToInt(existing -> safeQuantity(existing.getQuantity()))
                .sum();
    }

    private int returnedQuantityForCustomizedOrder(UUID customizedOrderId, String productName, String size, UUID excludedId) {
        return returnedItemRepository.findByCustomizedOrderIdOrderByReturnDateDescCreatedAtDesc(customizedOrderId).stream()
                .filter(existing -> excludedId == null || !excludedId.equals(existing.getId()))
                .filter(existing -> matchesLine(existing.getProductName(), existing.getSize(), productName, size))
                .mapToInt(existing -> safeQuantity(existing.getQuantity()))
                .sum();
    }

    private boolean matchesLine(String lineProduct, String lineSize, String productName, String size) {
        if (lineProduct == null || lineProduct.trim().isEmpty()) {
            return false;
        }
        if (!lineProduct.trim().equalsIgnoreCase(productName)) {
            return false;
        }
        String normalizedLineSize = normalizeSize(lineSize);
        if (normalizedLineSize == null || size == null) {
            return true;
        }
        return normalizedLineSize.equalsIgnoreCase(size);
    }

    private String normalizeSize(String size) {
        return size == null || size.isBlank() ? null : size.trim();
    }

    private String returnKey(String orderType, UUID orderId, String productName, String size) {
        return orderType + ":" + orderId + ":" + productName.toLowerCase() + ":" + (size == null ? "" : size.toLowerCase());
    }

    private void validateQuantity(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
    }

    private String buildBulkDedupeKey(List<CreateReturnedItemRequest> requests) {
        String contentHash = requests.stream()
                .map(this::buildDedupeKey)
                .collect(Collectors.joining(","));
        return "returned-items:bulk:" + Integer.toHexString(contentHash.hashCode());
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