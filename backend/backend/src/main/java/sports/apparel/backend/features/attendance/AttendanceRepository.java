package sports.apparel.backend.features.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.EmployeeAttendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<EmployeeAttendance, UUID> {
    Optional<EmployeeAttendance> findByUserIdAndAttendanceDate(UUID userId, LocalDate attendanceDate);

    boolean existsByUserIdAndAttendanceDate(UUID userId, LocalDate attendanceDate);

    Page<EmployeeAttendance> findAllByOrderByAttendanceDateDesc(Pageable pageable);

    List<EmployeeAttendance> findByAttendanceDateBetweenOrderByAttendanceDateDesc(LocalDate startDate, LocalDate endDate);

    List<EmployeeAttendance> findByAttendanceDateOrderByUserUsernameAsc(LocalDate attendanceDate);

    List<EmployeeAttendance> findByAttendanceDateBetweenAndUserIdOrderByAttendanceDateDesc(
            LocalDate startDate,
            LocalDate endDate,
            UUID userId
    );
}
