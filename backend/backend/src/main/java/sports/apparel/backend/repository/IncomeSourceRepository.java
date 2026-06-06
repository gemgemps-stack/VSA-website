package sports.apparel.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.IncomeSource;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncomeSourceRepository extends JpaRepository<IncomeSource, UUID> {
    Optional<IncomeSource> findByReferenceNumber(String referenceNumber);

    List<IncomeSource> findByIncomeDate(LocalDate incomeDate);

    List<IncomeSource> findByIncomeDateBetween(LocalDate startDate, LocalDate endDate);
}
