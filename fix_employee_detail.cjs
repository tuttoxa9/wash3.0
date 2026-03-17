const fs = require('fs');
const file = 'src/components/Home/EmployeeDetailModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldTotalEarnings = `
  // Общая сумма работника
  const totalEarnings = employeeRecords.reduce((sum, record) => {
    const role = employeeRoles[employeeId] || employees.find(e => e.id === employeeId)?.role || 'washer';
    return sum + calculateEmployeeShare(record, employeeId, role, minimumPaymentSettings);
  }, 0);
`;

const newTotalEarnings = `
  // Общая сумма работника
  const totalEarnings = React.useMemo(() => {
    if (!currentReport || !currentReport.employeeIds?.includes(employeeId)) {
      return 0; // Сотрудник не в смене
    }

    // Подготовка override для минималки, если она была снята
    const minimumOverride: Record<string, boolean> = {};
    currentReport.employeeIds.forEach(id => {
       const key = \`min_\${id}\` as any;
       const val = (currentReport.dailyEmployeeRoles as any)?.[key];
       minimumOverride[id] = val !== false;
    });

    const calculator = createSalaryCalculator(
       minimumPaymentSettings,
       currentReport.records,
       currentReport.dailyEmployeeRoles || employeeRoles,
       employees,
       minimumOverride
    );

    const results = calculator.calculateSalaries();
    const result = results.find(r => r.employeeId === employeeId);
    return result ? result.calculatedSalary : 0;
  }, [currentReport, employeeId, minimumPaymentSettings, employeeRoles, employees]);
`;

code = code.replace(oldTotalEarnings, newTotalEarnings);
fs.writeFileSync(file, code);
