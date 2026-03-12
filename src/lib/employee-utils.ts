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
 * Приоритет отдается сохраненным ролям (dayRoles), если их нет,
 * и дата сегодняшняя - берется текущая роль из профиля.
 * Иначе - washer.
 */
export function determineEmployeeRole(
  empId: string,
  dateStr: string,
  dayRoles: Record<string, any>,
  employees: Employee[],
): EmployeeRole {
  let role: EmployeeRole = "washer";

  if (dayRoles && dayRoles[empId]) {
    role = dayRoles[empId] as EmployeeRole;
  } else {
    // В изолированной утилите вместо date-fns используем нативные Date
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const isToday = dateStr === todayStr;

    if (isToday) {
      const emp = employees.find((e) => e.id === empId);
      if (emp?.role) role = emp.role;
    }
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
