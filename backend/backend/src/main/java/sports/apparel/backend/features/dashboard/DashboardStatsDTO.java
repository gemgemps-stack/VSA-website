package sports.apparel.backend.features.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    private long totalInventoryOrders;
    private long totalCustomizedOrders;
    private long totalClients;
    private long totalInventoryItems;
    private long totalOrders;
    private long openOrders;
    private long awaitingApprovalOrders;
    private long completedOrders;
    private long lowStockItems;
    private long attendanceThisMonth;
    private BigDecimal monthlySalesIncome;
    private BigDecimal monthlyLiquidation;
    private BigDecimal monthlyNetIncome;
}
