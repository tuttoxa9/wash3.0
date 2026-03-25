import type { Employee, EmployeeRole, CarWashRecord } from "@/lib/types";

export interface MinimumPaymentSettings {
  minimumPaymentAdmin: number;
  minimumPaymentWasher: number;
  percentageWasher: number;
  percentageWasherDryclean: number;
  adminCashPercentage: number;
  adminCarWashPercentage: number;
  adminDrycleanPercentage: number;
  showAdminBonusDetail: boolean;
  salaryCalculationMethod?: string;
}

/**
 * Определяет роль сотрудника на указанную дату.
 * КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используются только сохраненные роли (dayRoles).
 * Больше НЕЛЬЗЯ использовать текущую роль из профиля для исторических дат,
 * чтобы избежать некорректного пересчета прошлых смен.
 */
export function determineEmployeeRole(
  empId: string,
  dateStr: string,
  dayRoles: Record<string, any>,
): EmployeeRole {
  let role: EmployeeRole = "washer";

  if (dayRoles && dayRoles[empId]) {
    role = dayRoles[empId] as EmployeeRole;
  }

  return role;
}

/**
 * Рассчитывает долю (заработок) конкретного сотрудника с одной записи/машины
 * в зависимости от его роли и настроек.
 */
export function calculateEmployeeShare(
  record: CarWashRecord,
  employeeId: string,
  employeeRole: EmployeeRole,
  settings: MinimumPaymentSettings
): number {
  if (!record.employeeIds.includes(employeeId)) {
    return 0;
  }

  const share = record.price / record.employeeIds.length;
  const isDryClean = record.serviceType === "dryclean";

  if (employeeRole === "washer") {
    const percentage = isDryClean
      ? settings.percentageWasherDryclean
      : settings.percentageWasher;
    return share * (percentage / 100);
  } else if (employeeRole === "admin") {
    const percentage = isDryClean
      ? settings.adminDrycleanPercentage
      : settings.adminCarWashPercentage;
    return share * (percentage / 100);
  }

  return 0;
}
