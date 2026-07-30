package sports.apparel.backend.features.customizedorders;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.CustomizedOrder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomizedOrderRepository extends JpaRepository<CustomizedOrder, UUID> {
    Optional<CustomizedOrder> findByJobOrderNo(String jobOrderNo);

    Optional<CustomizedOrder> findByRequestFingerprint(String requestFingerprint);

    List<CustomizedOrder> findByClientId(UUID clientId);

    List<CustomizedOrder> findByOrderDateBetween(LocalDate startDate, LocalDate endDate);

    List<CustomizedOrder> findByStatus(String status);

    long countByStatus(String status);

    @Query("SELECT o FROM CustomizedOrder o WHERE YEAR(o.orderDate) = :year AND MONTH(o.orderDate) = :month")
    List<CustomizedOrder> findByYearAndMonth(int year, int month);

    @Query("SELECT MAX(CAST(SUBSTRING(o.jobOrderNo, 8) AS INTEGER)) FROM CustomizedOrder o WHERE o.jobOrderNo LIKE :prefix%")
    Optional<Integer> findMaxSequenceByJobOrderPrefix(String prefix);
}
