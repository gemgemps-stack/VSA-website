package sports.apparel.backend.features.attendance;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<AttendanceDTO> createAttendance(@Valid @RequestBody CreateAttendanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createAttendance(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<AttendanceDTO> getAttendanceById(@PathVariable UUID id) {
        return ResponseEntity.ok(attendanceService.getAttendanceById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<Page<AttendanceDTO>> getAllAttendance(Pageable pageable) {
        return ResponseEntity.ok(attendanceService.getAllAttendance(pageable));
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<List<AttendanceDTO>> getAttendanceByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDateRange(startDate, endDate));
    }

    @GetMapping("/month")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<List<AttendanceDTO>> getAttendanceByMonth(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(attendanceService.getAttendanceByMonth(year, month));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ATTENDANCE')")
    public ResponseEntity<AttendanceDTO> updateAttendance(
            @PathVariable UUID id,
            @Valid @RequestBody CreateAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.updateAttendance(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAttendance(@PathVariable UUID id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.noContent().build();
    }
}
