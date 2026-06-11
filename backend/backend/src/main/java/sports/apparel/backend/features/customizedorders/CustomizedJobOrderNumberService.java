package sports.apparel.backend.features.customizedorders;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class CustomizedJobOrderNumberService {

    private final CustomizedOrderRepository customizedOrderRepository;

    public CustomizedJobOrderNumberService(CustomizedOrderRepository customizedOrderRepository) {
        this.customizedOrderRepository = customizedOrderRepository;
    }

    public String generateJobOrderNumber(LocalDate orderDate) {
        String prefix = generatePrefix(orderDate);

        Optional<Integer> maxSequence = customizedOrderRepository.findMaxSequenceByJobOrderPrefix(prefix);
        int nextSequence = maxSequence.map(seq -> seq + 1).orElse(1);

        return String.format("%s-%04d", prefix, nextSequence);
    }

    private String generatePrefix(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("ddMMyy"));
    }
}
