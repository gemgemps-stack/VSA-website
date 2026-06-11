package sports.apparel.backend.features.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAttendanceRequest {

    @NotNull(message = "Employee is required")
    private UUID userId;

    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    private LocalTime timeIn;

    private LocalTime timeOut;

    @NotBlank(message = "Status is required")
    private String status;

    private String notes;
}
