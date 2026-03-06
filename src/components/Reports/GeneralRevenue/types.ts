export interface GeneralReportData {
  totalCash: number;
  totalCard: number;
  totalOrganizations: number;
  totalDebt: number;
  totalRevenue: number;
  totalSalaries: number;
  organizationBreakdown: { name: string; amount: number }[];
  dailyData: {
    date: string;
    cash: number;
    card: number;
    organizations: number;
    debt: number;
    total: number;
    recordsCount: number;
  }[];
  averageDaily: number;
  maxDay: { date: string; amount: number };
  minDay: { date: string; amount: number };
}
