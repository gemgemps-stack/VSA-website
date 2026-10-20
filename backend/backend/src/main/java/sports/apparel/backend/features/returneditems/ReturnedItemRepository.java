package sports.apparel.backend.features.returneditems;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.ReturnedItem;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReturnedItemRepository extends JpaRepository<ReturnedItem, UUID> {

    Optional<ReturnedItem> findByRequestFingerprint(String requestFingerprint);

    List<ReturnedItem> findByOrderIdOrderByReturnDateDescCreatedAtDesc(UUID orderId);

    List<ReturnedItem> findByCustomizedOrderIdOrderByReturnDateDescCreatedAtDesc(UUID customizedOrderId);

    Page<ReturnedItem> findAllByOrderByReturnDateDescCreatedAtDesc(Pageable pageable);

    @Query(value = """
            SELECT r FROM ReturnedItem r
            LEFT JOIN r.order o
            LEFT JOIN r.customizedOrder c
            LEFT JOIN o.client oc
            LEFT JOIN c.client cc
            WHERE (:orderType IS NULL OR :orderType = ''
                OR (:orderType = 'RETAIL' AND o IS NOT NULL)
                OR (:orderType = 'CUSTOMIZED' AND c IS NOT NULL))
              AND (:clientName IS NULL OR :clientName = ''
                OR LOWER(COALESCE(oc.clientName, o.clientName, cc.clientName, c.clientName, ''))
                    LIKE LOWER(CONCAT('%', :clientName, '%')))
              AND (:status IS NULL OR :status = '' OR o.status = :status OR c.status = :status)
              AND (:dateFrom IS NULL OR r.returnDate >= :dateFrom)
              AND (:dateTo IS NULL OR r.returnDate <= :dateTo)
            """,
            countQuery = """
            SELECT COUNT(r) FROM ReturnedItem r
            LEFT JOIN r.order o
            LEFT JOIN r.customizedOrder c
            LEFT JOIN o.client oc
            LEFT JOIN c.client cc
            WHERE (:orderType IS NULL OR :orderType = ''
                OR (:orderType = 'RETAIL' AND o IS NOT NULL)
                OR (:orderType = 'CUSTOMIZED' AND c IS NOT NULL))
              AND (:clientName IS NULL OR :clientName = ''
                OR LOWER(COALESCE(oc.clientName, o.clientName, cc.clientName, c.clientName, ''))
                    LIKE LOWER(CONCAT('%', :clientName, '%')))
              AND (:status IS NULL OR :status = '' OR o.status = :status OR c.status = :status)
              AND (:dateFrom IS NULL OR r.returnDate >= :dateFrom)
              AND (:dateTo IS NULL OR r.returnDate <= :dateTo)
            """)
    Page<ReturnedItem> searchReturnedItems(@Param("orderType") String orderType,
                                           @Param("clientName") String clientName,
                                           @Param("status") String status,
                                           @Param("dateFrom") LocalDate dateFrom,
                                           @Param("dateTo") LocalDate dateTo,
                                           Pageable pageable);
}