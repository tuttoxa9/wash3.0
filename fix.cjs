const fs = require('fs');
const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// I can see the issue!
// const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
// uses currentReport, but currentReport is defined later on line 35.

const badInit = `
  const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");
  // Когда меняется выбранный сотрудник или источник, пересчитываем начальное значение
  React.useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(""); // Для сейфа всегда с нуля, так как там транзакции
    }
  }, [employeeId, source, currentReport]);
  const [source, setSource] = useState<"cash" | "safe">("cash");
  const [useCustomComment, setUseCustomComment] = useState(false);
  const [customComment, setCustomComment] = useState("");

  const employee = state.employees.find((e) => e.id === employeeId);
  const currentReport = state.dailyReports[state.currentDate];
`;

const badInit2 = `
  const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;

  // Calculate existing safe payouts for today
  const existingSafePayout = useMemo(() => {
    if (!employeeId || !employee) return 0;
    const todayStr = state.currentDate;
    const todayTxs = state.safeTransactions.filter(tx => tx.date.startsWith(todayStr) && tx.comment.includes(employee.name));

    let sum = 0;
    todayTxs.forEach(tx => {
       if (tx.type === "out") sum += tx.amount;
       if (tx.type === "in") sum -= tx.amount;
    });
    return sum > 0 ? sum : 0;
  }, [state.safeTransactions, state.currentDate, employeeId, employee]);

  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");

  // Когда меняется выбранный сотрудник или источник, пересчитываем начальное значение
  useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(existingSafePayout > 0 ? existingSafePayout.toString() : "");
    }
  }, [employeeId, source, currentReport, existingSafePayout]);
`;

// It looks like `code` might have BOTH of these fragments, or a mix of them since I ran patches sequentially.
// Let's just fix the ordering using regex/replace.
