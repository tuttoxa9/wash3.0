const fs = require('fs');
const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// remove all instances of the bad stuff, and put it after employee/currentReport
// we can do this by regexing out the state block and placing a unified block where it should be.

const unifiedBlock = `
  const employee = state.employees.find((e) => e.id === employeeId);
  const currentReport = state.dailyReports[state.currentDate];

  const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;

  // Calculate existing safe payouts for today
  const existingSafePayout = React.useMemo(() => {
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

  const [source, setSource] = useState<"cash" | "safe">("cash");
  const [useCustomComment, setUseCustomComment] = useState(false);
  const [customComment, setCustomComment] = useState("");
  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");

  React.useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(existingSafePayout > 0 ? existingSafePayout.toString() : "");
    }
  }, [employeeId, source, currentReport, existingSafePayout]);
`;

// Remove the old chaotic initialization
const startMarker = 'const { state, dispatch } = useAppContext();';
const endMarker = 'const stateCash = currentReport?.cashState || {';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = code.substring(0, startIndex + startMarker.length);
    const after = code.substring(endIndex);

    code = before + '\\n  const [loading, setLoading] = useState(false);\\n' + unifiedBlock + '\\n  ' + after;
    fs.writeFileSync(file, code);
    console.log("Fixed the initialization order in PayoutsPage.tsx!");
} else {
    console.log("Could not find markers");
}
