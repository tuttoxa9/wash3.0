const fs = require('fs');
const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Inside PayoutModal:
// We need to pass selectedDate down to PayoutModal instead of relying on state.currentDate internally
const modalInterfaceOld = `interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
}`;
const modalInterfaceNew = `interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
  selectedDate: string;
}`;
code = code.replace(modalInterfaceOld, modalInterfaceNew);

const modalDefOld = `const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, employeeId }) => {`;
const modalDefNew = `const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, employeeId, selectedDate }) => {`;
code = code.replace(modalDefOld, modalDefNew);

// In PayoutModal: Replace state.currentDate with selectedDate
code = code.replace(/state\.currentDate/g, 'selectedDate');
// Note: dispatch({ type: "SET_DAILY_REPORT", payload: { date: state.currentDate, report: updatedReport } })
// will become payload: { date: selectedDate ... } which is correct!


// Inside PayoutsPage component:
const mainCompOld = `export default function PayoutsPage() {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Для удобства показываем, сколько человек заработал за сегодня (если смена открыта)
  const currentReport = state.dailyReports[state.currentDate];`;

const mainCompNew = `import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { parseISO, addDays, subDays } from "date-fns";

export default function PayoutsPage() {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(state.currentDate);

  // Для удобства показываем, сколько человек заработал за выбранный день (если смена открыта)
  const currentReport = state.dailyReports[selectedDate];

  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };
`;

code = code.replace(mainCompOld, mainCompNew);

// Add Date Picker UI in the header
const headerOld = `      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <WalletCards className="w-6 h-6 text-primary" />
          Выплаты сотрудникам
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Быстрая выдача средств из кассы смены или из сейфа
        </p>
      </div>`;

const headerNew = `      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-primary" />
            Выплаты сотрудникам
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Быстрая выдача средств из кассы смены или из сейфа
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl p-1 shadow-sm shrink-0 self-start md:self-auto">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 px-3 font-medium text-foreground min-w-[140px] justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {format(parseISO(selectedDate), "dd.MM.yyyy")}
              {selectedDate === state.currentDate && (
                 <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1">Сегодня</span>
              )}
            </div>
            <button
              onClick={handleNextDay}
              disabled={selectedDate === state.currentDate}
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>
      </div>`;

code = code.replace(headerOld, headerNew);


// Also need to pass selectedDate to PayoutModal
const modalCallOld = `      <PayoutModal
        isOpen={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        employeeId={selectedEmployeeId}
      />`;
const modalCallNew = `      <PayoutModal
        isOpen={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        employeeId={selectedEmployeeId}
        selectedDate={selectedDate}
      />`;
code = code.replace(modalCallOld, modalCallNew);

// Make sure ChevronLeft/Right are imported. The simplest way is to fix imports at the top if they are missing.
// I replaced mainCompOld with imports, but they need to be at the top of the file!
const topImportsFix = `import { Search, Wallet, WalletCards, ArrowUpRight, ArrowDownLeft, Loader2, Info, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { parseISO, addDays, subDays } from "date-fns";`;

code = code.replace('import { Search, Wallet, WalletCards, ArrowUpRight, ArrowDownLeft, Loader2, Info, X } from "lucide-react";', topImportsFix);
code = code.replace(/import \{ ChevronLeft, ChevronRight, Calendar \} from "lucide-react";\nimport \{ parseISO, addDays, subDays \} from "date-fns";\n/g, ''); // remove the inline ones added by mainCompNew

// Also fix "В смене сегодня" text
code = code.replace('В смене сегодня', 'В смене');
code = code.replace('Заработано сегодня', 'Заработано');
code = code.replace('Выдано из кассы сегодня', 'Выдано из кассы');


fs.writeFileSync(file, code);
