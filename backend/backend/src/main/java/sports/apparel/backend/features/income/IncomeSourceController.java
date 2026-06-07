package sports.apparel.backend.features.income;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sports.apparel.backend.features.income.CreateIncomeSourceRequest;
import sports.apparel.backend.features.income.IncomeSourceDTO;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/income")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"}, allowCredentials = "true")
public class IncomeSourceController {

    private final IncomeSourceService incomeSourceService;

    public IncomeSourceController(IncomeSourceService incomeSourceService) {
        this.incomeSourceService = incomeSourceService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<IncomeSourceDTO> createIncomeSource(@Valid @RequestBody CreateIncomeSourceRequest request) {
        IncomeSourceDTO incomeSourceDTO = incomeSourceService.createIncomeSource(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(incomeSourceDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<IncomeSourceDTO> getIncomeSourceById(@PathVariable UUID id) {
        IncomeSourceDTO incomeSourceDTO = incomeSourceService.getIncomeSourceById(id);
        return ResponseEntity.ok(incomeSourceDTO);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<Page<IncomeSourceDTO>> getAllIncomeSources(Pageable pageable) {
        Page<IncomeSourceDTO> incomeSources = incomeSourceService.getAllIncomeSources(pageable);
        return ResponseEntity.ok(incomeSources);
    }

    @GetMapping("/date/{date}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<List<IncomeSourceDTO>> getIncomeSourceByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<IncomeSourceDTO> incomeSourceDTOs = incomeSourceService.getIncomeSourceByDate(date);
        return ResponseEntity.ok(incomeSourceDTOs);
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<List<IncomeSourceDTO>> getIncomeSourcesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<IncomeSourceDTO> incomeSources = incomeSourceService.getIncomeSourcesByDateRange(startDate, endDate);
        return ResponseEntity.ok(incomeSources);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SOURCE_OF_INCOME')")
    public ResponseEntity<IncomeSourceDTO> updateIncomeSource(@PathVariable UUID id, 
                                                              @Valid @RequestBody CreateIncomeSourceRequest request) {
        IncomeSourceDTO incomeSourceDTO = incomeSourceService.updateIncomeSource(id, request);
        return ResponseEntity.ok(incomeSourceDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteIncomeSource(@PathVariable UUID id) {
        incomeSourceService.deleteIncomeSource(id);
        return ResponseEntity.noContent().build();
    }
}
