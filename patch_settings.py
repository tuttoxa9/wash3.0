import re

file_path = "src/pages/SettingsPage.tsx"
with open(file_path, "r") as f:
    content = f.read()

data_management_component = """
// Data Management Component
const DataManagement: React.FC = () => {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [showClearByDate, setShowClearByDate] = useState(false);
  const [dateToClear, setDateToClear] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clearDatePassword, setClearDatePassword] = useState("");
  const [clearDateError, setClearDateError] = useState("");
  const [clearDateLoading, setClearDateLoading] = useState(false);

  const handleClearDatabase = async () => {
    setLoading(true);
    try {
      const success = await databaseService.clearAllData();

      if (success) {
        dispatch({ type: "SET_EMPLOYEES", payload: [] });
        dispatch({ type: "SET_ORGANIZATIONS", payload: [] });
        dispatch({ type: "SET_SERVICES", payload: [] });
        dispatch({ type: "SET_APPOINTMENTS", payload: [] });

        dispatch({
          type: "SET_SALARY_CALCULATION_METHOD",
          payload: {
            method: "minimumWithPercentage",
            date: format(new Date(), "yyyy-MM-dd"),
          },
        });

        dispatch({
          type: "SET_MINIMUM_PAYMENT_SETTINGS",
          payload: {
            minimumPaymentWasher: 0,
            percentageWasher: 10,
            percentageWasherDryclean: 15,
            minimumPaymentAdmin: 0,
            adminCashPercentage: 3,
            adminCarWashPercentage: 2,
            adminDrycleanPercentage: 3,
          },
        });

        toast.success("Все данные удалены");
        setShowConfirmation(false);
      } else {
        throw new Error("Не удалось удалить данные");
      }
    } catch (error) {
      toast.error("Произошла ошибка при очистке");
    } finally {
      setLoading(false);
    }
  };

  const handleClearByDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateToClear) return;

    setClearDateLoading(true);
    setClearDateError("");

    setTimeout(async () => {
      if (clearDatePassword !== import.meta.env.VITE_SETTINGS_PASSWORD) {
        setClearDateError("Неверный пароль. Попробуйте еще раз.");
        setClearDateLoading(false);
        return;
      }

      try {
        const success = await databaseService.clearDataByDate(dateToClear);
        if (success) {
          toast.success(`Данные за ${format(parseISO(dateToClear), "dd.MM.yyyy")} успешно удалены`);
          setShowClearByDate(false);
          setClearDatePassword("");

          // Optionally, reload the page to ensure fresh state if current day is cleared
          if (dateToClear === format(new Date(), "yyyy-MM-dd")) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } else {
          throw new Error("Не удалось удалить данные за день");
        }
      } catch (error) {
        toast.error("Произошла ошибка при удалении данных за день");
      } finally {
        setClearDateLoading(false);
      }
    }, 500);
  };

  return (
    <div className="p-5 sm:p-6 border border-destructive/20 rounded-2xl bg-destructive/5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2 text-destructive flex items-center gap-2">
          <Trash className="w-4 h-4" />
          Опасная зона
        </h3>
        <p className="text-sm text-muted-foreground">
          Удаление данных из базы данных. Это действие необратимо.
        </p>
      </div>

      {/* Очистка данных за конкретный день */}
      <div className="bg-background/50 border border-border/50 rounded-xl p-4">
        {!showClearByDate ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">Очистка по дате</h4>
              <p className="text-xs text-muted-foreground mt-1">Удаление всех смен, долгов и записей за выбранный день</p>
            </div>
            <button
              onClick={() => setShowClearByDate(true)}
              className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors text-xs font-medium whitespace-nowrap self-start sm:self-auto"
            >
              Выбрать день
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center justify-between">
              Удаление данных за день
              <button
                onClick={() => {
                  setShowClearByDate(false);
                  setClearDatePassword("");
                  setClearDateError("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </h4>

            <form onSubmit={handleClearByDate} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Выберите дату</label>
                <input
                  type="date"
                  value={dateToClear}
                  onChange={(e) => setDateToClear(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-destructive text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Пароль от настроек</label>
                <input
                  type="password"
                  value={clearDatePassword}
                  onChange={(e) => setClearDatePassword(e.target.value)}
                  placeholder="Введите пароль для подтверждения"
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-destructive text-sm"
                  required
                />
                {clearDateError && <p className="mt-1.5 text-xs text-destructive">{clearDateError}</p>}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={clearDateLoading || !clearDatePassword || !dateToClear}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 text-xs font-medium"
                >
                  {clearDateLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash className="w-3.5 h-3.5" />
                  )}
                  Удалить данные за {dateToClear ? format(parseISO(dateToClear), "dd.MM.yyyy") : "выбранный день"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="h-px bg-border/50 w-full my-2"></div>

      {/* Очистка всей БД */}
      {showConfirmation ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive mb-1 text-sm">
                Подтверждение удаления
              </h4>
              <p className="mb-4 text-xs text-destructive/80 leading-relaxed">
                Вы действительно хотите удалить <strong>ВСЕ данные</strong>? Будут
                удалены: сотрудники, организации, услуги, записи и настройки.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-input hover:bg-muted transition-colors text-xs font-medium"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  onClick={handleClearDatabase}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 text-xs font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash className="w-3 h-3" />
                  )}
                  Удалить всё
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-4 py-2 w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Trash className="w-4 h-4" />
          <span>Удалить все данные</span>
        </button>
      )}
    </div>
  );
};
"""

# Replace DataManagement component
import re

start_pattern = r"// Data Management Component\nconst DataManagement: React\.FC = \(\) => \{"
end_pattern = r"^\};\n"

start_idx = content.find("// Data Management Component")
if start_idx != -1:
    end_idx = content.find("\n// Employee Settings Component", start_idx)
    if end_idx != -1:
        new_content = content[:start_idx] + data_management_component.strip() + "\n\n" + content[end_idx+1:]
        with open(file_path, "w") as f:
            f.write(new_content)
        print("Updated DataManagement")
    else:
        print("Could not find end of DataManagement")
else:
    print("Could not find DataManagement")
