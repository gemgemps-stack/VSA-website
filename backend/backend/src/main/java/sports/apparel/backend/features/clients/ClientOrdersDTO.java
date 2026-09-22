package sports.apparel.backend.features.clients;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.features.customizedorders.CustomizedOrderDTO;
import sports.apparel.backend.features.orders.OrderDTO;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientOrdersDTO {

    private List<OrderDTO> orders;

    private List<CustomizedOrderDTO> customizedOrders;
}