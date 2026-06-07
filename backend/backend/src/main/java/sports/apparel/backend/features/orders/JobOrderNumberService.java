package sports.apparel.backend.features.orders;

import org.springframework.stereotype.Service;
import sports.apparel.backend.features.orders.OrderRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class JobOrderNumberService {

    private final OrderRepository orderRepository;

    public JobOrderNumberService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public String generateJobOrderNumber(LocalDate orderDate) {
        String prefix = generatePrefix(orderDate);

        Optional<Integer> maxSequence = orderRepository.findMaxSequenceByJobOrderPrefix(prefix);
        int nextSequence = maxSequence.map(seq -> seq + 1).orElse(1);

        return String.format("%s-%04d", prefix, nextSequence);
    }

    private String generatePrefix(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("ddMMyy"));
    }
}
