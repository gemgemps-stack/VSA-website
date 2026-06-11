package sports.apparel.backend.features.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.EmployeeAttendance;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.features.users.UserRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    public AttendanceService(AttendanceRepository attendanceRepository, UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
    }

    public AttendanceDTO createAttendance(CreateAttendanceRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (attendanceRepository.existsByUserIdAndAttendanceDate(request.getUserId(), request.getAttendanceDate())) {
            throw new IllegalArgumentException("Attendance record already exists for this employee and date");
        }

        EmployeeAttendance attendance = new EmployeeAttendance();
        attendance.setUser(user);
        attendance.setAttendanceDate(request.getAttendanceDate());
        attendance.setTimeIn(request.getTimeIn());
        attendance.setTimeOut(request.getTimeOut());
        attendance.setStatus(normalizeStatus(request.getStatus()));
        attendance.setNotes(request.getNotes());

        return new AttendanceDTO(attendanceRepository.save(attendance));
    }

    @Transactional(readOnly = true)
    public AttendanceDTO getAttendanceById(UUID id) {
        EmployeeAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));
        return new AttendanceDTO(attendance);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceDTO> getAllAttendance(Pageable pageable) {
        return attendanceRepository.findAllByOrderByAttendanceDateDesc(pageable)
                .map(AttendanceDTO::new);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getAttendanceByDateRange(LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(startDate, endDate)
                .stream()
                .map(AttendanceDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getAttendanceByMonth(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(startDate, endDate)
                .stream()
                .map(AttendanceDTO::new)
                .collect(Collectors.toList());
    }

    public AttendanceDTO updateAttendance(UUID id, CreateAttendanceRequest request) {
        EmployeeAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if ((!attendance.getUser().getId().equals(request.getUserId())
                || !attendance.getAttendanceDate().equals(request.getAttendanceDate()))
                && attendanceRepository.existsByUserIdAndAttendanceDate(request.getUserId(), request.getAttendanceDate())) {
            throw new IllegalArgumentException("Attendance record already exists for this employee and date");
        }

        attendance.setUser(user);
        attendance.setAttendanceDate(request.getAttendanceDate());
        attendance.setTimeIn(request.getTimeIn());
        attendance.setTimeOut(request.getTimeOut());
        attendance.setStatus(normalizeStatus(request.getStatus()));
        attendance.setNotes(request.getNotes());

        return new AttendanceDTO(attendanceRepository.save(attendance));
    }

    public void deleteAttendance(UUID id) {
        EmployeeAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));
        attendanceRepository.delete(attendance);
    }

    private String normalizeStatus(String status) {
        return status == null ? null : status.trim().toUpperCase();
    }
}
