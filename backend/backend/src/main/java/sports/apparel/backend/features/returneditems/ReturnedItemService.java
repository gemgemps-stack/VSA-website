package sports.apparel.backend.features.returneditems;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.CustomizedOrder;
import sports.apparel.backend.entity.Order;
import sports.apparel.backend.entity.ReturnedItem;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.orders.OrderRepository;
import sports.apparel.backend.support.IdempotencyService;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReturnedItemService {

    private final ReturnedItemRepository returnedItemRepository;
    private final OrderRepository orderRepository;
    private final CustomizedOrderRepository customizedOrderRepository;
    private final IdempotencyService idempotencyService;

    public ReturnedItemService(ReturnedItemRepository returnedItemRepository, OrderRepository orderRepository,
                               CustomizedOrderRepository customizedOrderRepository, IdempotencyService idempotencyService) {
        this.returnedItemRepository = returnedItemRepository;
        this.orderRepository = orderRepository;
        this.customizedOrderRepository = customizedOrderRepository;
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

        return new ReturnedItemDTO(returnedItemRepository.save(returnedItem));
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

        return new ReturnedItemDTO(returnedItemRepository.save(returnedItem));
    }

    public void deleteReturnedItem(UUID id) {
        ReturnedItem returnedItem = returnedItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Returned item not found"));
        returnedItemRepository.delete(returnedItem);
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