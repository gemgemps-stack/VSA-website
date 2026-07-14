package sports.apparel.backend.features.orders;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.Order;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByJobOrderNo(String jobOrderNo);

    Optional<Order> findByRequestFingerprint(String requestFingerprint);

    List<Order> findByClientId(UUID clientId);

    List<Order> findByOrderDateBetween(LocalDate startDate, LocalDate endDate);

    List<Order> findByStatus(String status);

    @Query("SELECT o FROM Order o WHERE YEAR(o.orderDate) = :year AND MONTH(o.orderDate) = :month")
    List<Order> findByYearAndMonth(int year, int month);

    @Query("SELECT MAX(CAST(SUBSTRING(o.jobOrderNo, 8) AS INTEGER)) FROM Order o WHERE o.jobOrderNo LIKE :prefix%")
    Optional<Integer> findMaxSequenceByJobOrderPrefix(String prefix);
}
