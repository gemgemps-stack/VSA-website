package sports.apparel.backend.features.dashboard;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.IncomeSource;
import sports.apparel.backend.features.clients.ClientRepository;
import sports.apparel.backend.features.customizedorders.CustomizedOrderRepository;
import sports.apparel.backend.features.attendance.AttendanceRepository;
import sports.apparel.backend.features.income.IncomeSourceRepository;
import sports.apparel.backend.features.inventory.InventoryRepository;
import sports.apparel.backend.features.orders.OrderRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final OrderRepository orderRepository;
    private final CustomizedOrderRepository customizedOrderRepository;
    private final ClientRepository clientRepository;
    private final InventoryRepository inventoryRepository;
    private final AttendanceRepository attendanceRepository;
    private final IncomeSourceRepository incomeSourceRepository;

    public DashboardService(OrderRepository orderRepository,
                           CustomizedOrderRepository customizedOrderRepository,
                           ClientRepository clientRepository,
                           InventoryRepository inventoryRepository,
                           AttendanceRepository attendanceRepository,
                           IncomeSourceRepository incomeSourceRepository) {
        this.orderRepository = orderRepository;
        this.customizedOrderRepository = customizedOrderRepository;
        this.clientRepository = clientRepository;
        this.inventoryRepository = inventoryRepository;
        this.attendanceRepository = attendanceRepository;
        this.incomeSourceRepository = incomeSourceRepository;
    }

    public DashboardStatsDTO getStats() {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        long totalInventoryOrders = orderRepository.count();
        long totalCustomizedOrders = customizedOrderRepository.count();
        long totalClients = clientRepository.count();
        long totalInventoryItems = inventoryRepository.count();

        long inventoryCompletedOrders = orderRepository.countByStatus("FULLY_PAID");
        long inventoryCancelledOrders = orderRepository.countByStatus("CANCELLED");
        long customizedCompletedOrders = customizedOrderRepository.countByStatus("FULLY_PAID");
        long customizedCancelledOrders = customizedOrderRepository.countByStatus("CANCELLED");

        long inventoryOpenOrders = Math.max(0, totalInventoryOrders - inventoryCompletedOrders - inventoryCancelledOrders);
        long customizedOpenOrders = Math.max(0, totalCustomizedOrders - customizedCompletedOrders - customizedCancelledOrders);
        long openOrders = inventoryOpenOrders + customizedOpenOrders;

        long awaitingApprovalOrders =
                orderRepository.countByStatus("FOR_CLIENT_APPROVAL")
                        + customizedOrderRepository.countByStatus("FOR_CLIENT_APPROVAL");

        long completedOrders = inventoryCompletedOrders + customizedCompletedOrders;
        long lowStockItems = inventoryRepository.countByQuantityLessThan(10);
        long attendanceThisMonth = attendanceRepository.countByAttendanceDateBetween(monthStart, today);

        List<IncomeSource> currentMonthIncomeSources = incomeSourceRepository.findByIncomeDateBetween(monthStart, today);
        BigDecimal monthlySalesIncome = BigDecimal.ZERO;
        BigDecimal monthlyLiquidation = BigDecimal.ZERO;

        for (IncomeSource incomeSource : currentMonthIncomeSources) {
            BigDecimal amount = incomeSource.getAmount() != null ? incomeSource.getAmount() : BigDecimal.ZERO;
            if (isLiquidationEntry(incomeSource)) {
                monthlyLiquidation = monthlyLiquidation.add(amount);
            } else {
                monthlySalesIncome = monthlySalesIncome.add(amount);
            }
        }

        BigDecimal monthlyNetIncome = monthlySalesIncome.subtract(monthlyLiquidation);

        return new DashboardStatsDTO(
                totalInventoryOrders,
                totalCustomizedOrders,
                totalClients,
                totalInventoryItems,
                totalInventoryOrders + totalCustomizedOrders,
                openOrders,
                awaitingApprovalOrders,
                completedOrders,
                lowStockItems,
                attendanceThisMonth,
                monthlySalesIncome,
                monthlyLiquidation,
                monthlyNetIncome
        );
    }

    private boolean isLiquidationEntry(IncomeSource incomeSource) {
        String paymentCategory = incomeSource.getPaymentCategory() != null ? incomeSource.getPaymentCategory().trim().toUpperCase() : "";
        String paymentMethod = incomeSource.getPaymentMethod() != null ? incomeSource.getPaymentMethod().trim().toLowerCase() : "";
        return "LIQUIDATION".equals(paymentCategory) || "liquidation".equals(paymentMethod);
    }
}
