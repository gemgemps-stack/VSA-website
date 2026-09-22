package sports.apparel.backend.features.returneditems;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.ReturnedItem;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReturnedItemRepository extends JpaRepository<ReturnedItem, UUID> {

    Optional<ReturnedItem> findByRequestFingerprint(String requestFingerprint);

    List<ReturnedItem> findByOrderIdOrderByReturnDateDescCreatedAtDesc(UUID orderId);

    List<ReturnedItem> findByCustomizedOrderIdOrderByReturnDateDescCreatedAtDesc(UUID customizedOrderId);

    Page<ReturnedItem> findAllByOrderByReturnDateDescCreatedAtDesc(Pageable pageable);
}