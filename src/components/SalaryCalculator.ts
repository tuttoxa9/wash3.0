import type { CarWashRecord, MinimumPaymentSettings, EmployeeRole } from '@/lib/types';

// Интерфейс для результата расчёта зарплаты сотрудника
export interface SalaryCalculationResult {
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  totalPersonalRevenue: number; // Доход от машин, которые лично помыл
  calculatedSalary: number; // Итоговая зарплата с учётом минималки
  breakdown: {
    // Для админа
    adminCashBonus?: number; // % от общей выручки
    adminCarWashBonus?: number; // % от лично помытых машин
    // Для мойщика
    washerPercentage?: number; // % от лично помытых машин
    // Общее
    minimumGuaranteed: number; // Минимальная гарантия
    finalAmount: number; // Итоговая сумма (max из процентов и минималки)
  };
}

// Основной класс для расчёта зарплаты
export class SalaryCalculator {
  private settings: MinimumPaymentSettings;
  private records: CarWashRecord[];
  private employeeRoles: Record<string, EmployeeRole>;
  private employees: Array<{ id: string; name: string }>;

  constructor(
    settings: MinimumPaymentSettings,
    records: CarWashRecord[],
    employeeRoles: Record<string, EmployeeRole>,
    employees: Array<{ id: string; name: string }>
  ) {
    this.settings = settings;
    this.records = records;
    this.employeeRoles = employeeRoles;
    this.employees = employees;
  }

  // Основной метод для расчёта зарплат всех сотрудников
  calculateSalaries(): SalaryCalculationResult[] {
    const results: SalaryCalculationResult[] = [];

    // Получаем всех участников (из ролей и из записей)
    const allEmployeeIds = new Set<string>();

    // Добавляем всех из ролей
    Object.keys(this.employeeRoles).forEach(id => allEmployeeIds.add(id));

    // Добавляем всех из записей
    this.records.forEach(record => {
      record.employeeIds.forEach(id => allEmployeeIds.add(id));
    });

    // Рассчитываем общую выручку
    const totalRevenue = this.calculateTotalRevenue();

    // Считаем количество админов (нужно для деления базового процента)
    const adminCount = this.getAdminCount();

    // Рассчитываем зарплату для каждого сотрудника
    allEmployeeIds.forEach(employeeId => {
      const employee = this.employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const role = this.employeeRoles[employeeId] || 'washer';
      const result = this.calculateEmployeeSalary(employeeId, employee.name, role, totalRevenue, adminCount);
      results.push(result);
    });

    return results.sort((a, b) => b.calculatedSalary - a.calculatedSalary);
  }

  // Расчёт зарплаты конкретного сотрудника
  private calculateEmployeeSalary(
    employeeId: string,
    employeeName: string,
    role: EmployeeRole,
    totalRevenue: number,
    adminCount: number
  ): SalaryCalculationResult {

    const personalRevenue = this.calculatePersonalRevenue(employeeId);

    if (role === 'admin') {
      return this.calculateAdminSalary(employeeId, employeeName, totalRevenue, personalRevenue, adminCount);
    } else {
      return this.calculateWasherSalary(employeeId, employeeName, personalRevenue);
    }
  }

  // Расчёт зарплаты админа
  private calculateAdminSalary(
    employeeId: string,
    employeeName: string,
    totalRevenue: number,
    personalRevenue: number,
    adminCount: number
  ): SalaryCalculationResult {

    // 1. Базовый процент от общей выручки (делится между всеми админами)
    const baseCashBonus = adminCount > 0
      ? (totalRevenue * (this.settings.adminCashPercentage / 100)) / adminCount
      : totalRevenue * (this.settings.adminCashPercentage / 100);

    // 2. Процент от машин, которые лично помыл этот админ
    const carWashBonus = personalRevenue * (this.settings.adminCarWashPercentage / 100);

    // 3. Общий доход от процентов
    const totalPercentageEarnings = baseCashBonus + carWashBonus;

    // 4. Итоговая сумма (не меньше минималки)
    const finalAmount = Math.max(totalPercentageEarnings, this.settings.minimumPaymentAdmin);

    return {
      employeeId,
      employeeName,
      role: 'admin',
      totalPersonalRevenue: personalRevenue,
      calculatedSalary: finalAmount,
      breakdown: {
        adminCashBonus: baseCashBonus,
        adminCarWashBonus: carWashBonus,
        minimumGuaranteed: this.settings.minimumPaymentAdmin,
        finalAmount
      }
    };
  }

  // Расчёт зарплаты мойщика
  private calculateWasherSalary(
    employeeId: string,
    employeeName: string,
    personalRevenue: number
  ): SalaryCalculationResult {

    // 1. Процент от машин, которые лично помыл
    const percentageEarnings = personalRevenue * (this.settings.percentageWasher / 100);

    // 2. Итоговая сумма (не меньше минималки)
    const finalAmount = Math.max(percentageEarnings, this.settings.minimumPaymentWasher);

    return {
      employeeId,
      employeeName,
      role: 'washer',
      totalPersonalRevenue: personalRevenue,
      calculatedSalary: finalAmount,
      breakdown: {
        washerPercentage: percentageEarnings,
        minimumGuaranteed: this.settings.minimumPaymentWasher,
        finalAmount
      }
    };
  }

  // Вспомогательные методы

  // Расчёт личного дохода сотрудника (от машин, которые он лично помыл)
  private calculatePersonalRevenue(employeeId: string): number {
    let personalRevenue = 0;

    this.records.forEach(record => {
      if (record.employeeIds.includes(employeeId)) {
        // Доля сотрудника от стоимости машины
        const employeeShare = record.price / record.employeeIds.length;
        personalRevenue += employeeShare;
      }
    });

    return personalRevenue;
  }

  // Расчёт общей выручки
  private calculateTotalRevenue(): number {
    return this.records.reduce((total, record) => total + record.price, 0);
  }

  // Подсчёт количества админов
  private getAdminCount(): number {
    return Object.values(this.employeeRoles).filter(role => role === 'admin').length;
  }

  // Получение сводной информации
  getTotalSalarySum(): number {
    return this.calculateSalaries().reduce((sum, result) => sum + result.calculatedSalary, 0);
  }

  getTotalRevenue(): number {
    return this.calculateTotalRevenue();
  }

  // Метод для получения разбивки по типам оплат
  getPaymentBreakdown() {
    const cash = this.records
      .filter(r => r.paymentMethod.type === 'cash')
      .reduce((sum, r) => sum + r.price, 0);

    const card = this.records
      .filter(r => r.paymentMethod.type === 'card')
      .reduce((sum, r) => sum + r.price, 0);

    const organization = this.records
      .filter(r => r.paymentMethod.type === 'organization')
      .reduce((sum, r) => sum + r.price, 0);

    return { cash, card, organization, total: cash + card + organization };
  }
}

// Утилитарная функция для создания калькулятора
export function createSalaryCalculator(
  settings: MinimumPaymentSettings,
  records: CarWashRecord[],
  employeeRoles: Record<string, EmployeeRole>,
  employees: Array<{ id: string; name: string }>
): SalaryCalculator {
  return new SalaryCalculator(settings, records, employeeRoles, employees);
}
