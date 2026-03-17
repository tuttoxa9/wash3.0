const fs = require('fs');
const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetOld = `export default function PayoutsPage() {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Для удобства показываем, сколько человек заработал за сегодня (если смена открыта)
  const currentReport = state.dailyReports[selectedDate];`;

const targetNew = `export default function PayoutsPage() {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(state.currentDate);

  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  // Для удобства показываем, сколько человек заработал за сегодня (если смена открыта)
  const currentReport = state.dailyReports[selectedDate];`;

code = code.replace(targetOld, targetNew);
fs.writeFileSync(file, code);
