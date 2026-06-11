package sports.apparel.backend.features.attendance;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import sports.apparel.backend.entity.EmployeeAttendance;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {

    private UUID id;
    private UUID userId;
    private String username;
    private String email;
    private String role;
    private LocalDate attendanceDate;
    private LocalTime timeIn;
    private LocalTime timeOut;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AttendanceDTO(EmployeeAttendance attendance) {
        this.id = attendance.getId();
        this.userId = attendance.getUser() != null ? attendance.getUser().getId() : null;
        this.username = attendance.getUser() != null ? attendance.getUser().getUsername() : null;
        this.email = attendance.getUser() != null ? attendance.getUser().getEmail() : null;
        this.role = attendance.getUser() != null && attendance.getUser().getRole() != null
                ? attendance.getUser().getRole().name()
                : null;
        this.attendanceDate = attendance.getAttendanceDate();
        this.timeIn = attendance.getTimeIn();
        this.timeOut = attendance.getTimeOut();
        this.status = attendance.getStatus();
        this.notes = attendance.getNotes();
        this.createdAt = attendance.getCreatedAt();
        this.updatedAt = attendance.getUpdatedAt();
    }
}
