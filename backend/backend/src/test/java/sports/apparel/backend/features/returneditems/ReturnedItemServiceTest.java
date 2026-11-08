package sports.apparel.backend.features.returneditems;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sports.apparel.backend.entity.ReturnedItem;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.inventory.InventoryRepository;
import sports.apparel.backend.features.orders.OrderRepository;
import sports.apparel.backend.support.IdempotencyService;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReturnedItemServiceTest {

    @Mock
    private ReturnedItemRepository returnedItemRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomizedOrderRepository customizedOrderRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private ReturnedItemService returnedItemService;

    @Test
    void markAddedToInventory_shouldPersistFlagAndReturnDto() {
        UUID id = UUID.randomUUID();
        ReturnedItem returnedItem = new ReturnedItem();
        returnedItem.setId(id);
        returnedItem.setAddedToInventory(false);

        when(returnedItemRepository.findById(id)).thenReturn(java.util.Optional.of(returnedItem));
        when(returnedItemRepository.save(any(ReturnedItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ReturnedItemDTO result = returnedItemService.markAddedToInventory(id);

        assertEquals(Boolean.TRUE, returnedItem.getAddedToInventory());
        assertEquals(Boolean.TRUE, result.getAddedToInventory());
        verify(returnedItemRepository).save(returnedItem);
    }
}
