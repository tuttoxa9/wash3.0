import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  okleykaEmployeeService,
  okleykaOrganizationService,
  okleykaOrderService,
  okleykaShiftService,
  okleykaDebtService,
  okleykaAppointmentService,
  okleykaWorkerService,
} from "@/lib/services/okleykaService";
import type {
  OkleykaEmployee,
  OkleykaOrganization,
  OkleykaOrder,
  OkleykaShift,
  OkleykaCashModification,
  OkleykaDebt,
  OkleykaAppointment,
  OkleykaAppState,
} from "@/lib/types/okleyka";

// ── Initial state ─────────────────────────────────────────────────────────
const todayStr = format(new Date(), "yyyy-MM-dd");

const initialState: OkleykaAppState = {
  employees: [],
  organizations: [],
  currentShift: null,
  orders: [],
  debts: [],
  appointments: [],
  upcomingInspections: [],
  unpaidWorkersCount: 0,
  isInitialized: false,
  currentDate: todayStr,
};

// ── Actions ───────────────────────────────────────────────────────────────
type OkleykaAction =
  | { type: "SET_EMPLOYEES"; payload: OkleykaEmployee[] }
  | { type: "ADD_EMPLOYEE"; payload: OkleykaEmployee }
  | { type: "UPDATE_EMPLOYEE"; payload: OkleykaEmployee }
  | { type: "REMOVE_EMPLOYEE"; payload: string }
  | { type: "SET_ORGANIZATIONS"; payload: OkleykaOrganization[] }
  | { type: "ADD_ORGANIZATION"; payload: OkleykaOrganization }
  | { type: "UPDATE_ORGANIZATION"; payload: OkleykaOrganization }
  | { type: "REMOVE_ORGANIZATION"; payload: string }
  | { type: "SET_SHIFT"; payload: OkleykaShift | null }
  | { type: "SET_ORDERS"; payload: OkleykaOrder[] }
  | { type: "ADD_ORDER"; payload: OkleykaOrder }
  | { type: "UPDATE_ORDER"; payload: OkleykaOrder }
  | { type: "SET_DEBTS"; payload: OkleykaDebt[] }
  | { type: "CLOSE_DEBT"; payload: string }
  | { type: "SET_APPOINTMENTS"; payload: OkleykaAppointment[] }
  | { type: "ADD_APPOINTMENT"; payload: OkleykaAppointment }
  | { type: "UPDATE_APPOINTMENT"; payload: OkleykaAppointment }
  | { type: "REMOVE_APPOINTMENT"; payload: string }
  | { type: "SET_UPCOMING_INSPECTIONS"; payload: OkleykaOrder[] }
  | { type: "SET_UNPAID_COUNT"; payload: number }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "SET_CURRENT_DATE"; payload: string };

function reducer(state: OkleykaAppState, action: OkleykaAction): OkleykaAppState {
  switch (action.type) {
    case "SET_EMPLOYEES": return { ...state, employees: action.payload };
    case "ADD_EMPLOYEE": return { ...state, employees: [...state.employees, action.payload] };
    case "UPDATE_EMPLOYEE": return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) };
    case "REMOVE_EMPLOYEE": return { ...state, employees: state.employees.filter(e => e.id !== action.payload) };
    case "SET_ORGANIZATIONS": return { ...state, organizations: action.payload };
    case "ADD_ORGANIZATION": return { ...state, organizations: [...state.organizations, action.payload] };
    case "UPDATE_ORGANIZATION": return { ...state, organizations: state.organizations.map(o => o.id === action.payload.id ? action.payload : o) };
    case "REMOVE_ORGANIZATION": return { ...state, organizations: state.organizations.filter(o => o.id !== action.payload) };
    case "SET_SHIFT": return { ...state, currentShift: action.payload };
    case "SET_ORDERS": return { ...state, orders: action.payload };
    case "ADD_ORDER": return { ...state, orders: [action.payload, ...state.orders] };
    case "UPDATE_ORDER": return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    case "SET_DEBTS": return { ...state, debts: action.payload };
    case "CLOSE_DEBT": return { ...state, debts: state.debts.filter(d => d.id !== action.payload) };
    case "SET_APPOINTMENTS": return { ...state, appointments: action.payload };
    case "ADD_APPOINTMENT": return { ...state, appointments: [action.payload, ...state.appointments] };
    case "UPDATE_APPOINTMENT": return { ...state, appointments: state.appointments.map(a => a.id === action.payload.id ? action.payload : a) };
    case "REMOVE_APPOINTMENT": return { ...state, appointments: state.appointments.filter(a => a.id !== action.payload) };
    case "SET_UPCOMING_INSPECTIONS": return { ...state, upcomingInspections: action.payload };
    case "SET_UNPAID_COUNT": return { ...state, unpaidWorkersCount: action.payload };
    case "SET_INITIALIZED": return { ...state, isInitialized: action.payload };
    case "SET_CURRENT_DATE": return { ...state, currentDate: action.payload };
    default: return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────
interface OkleykaContextType {
  state: OkleykaAppState;
  dispatch: React.Dispatch<OkleykaAction>;
  refreshUnpaidCount: () => Promise<void>;
  refreshShift: (date: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshDebts: () => Promise<void>;
}

const OkleykaContext = createContext<OkleykaContextType>({
  state: initialState,
  dispatch: () => null,
  refreshUnpaidCount: async () => {},
  refreshShift: async () => {},
  refreshOrders: async () => {},
  refreshDebts: async () => {},
});

export function useOkleykaContext() {
  return useContext(OkleykaContext);
}

// ── Provider ──────────────────────────────────────────────────────────────
export function OkleykaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshUnpaidCount = useCallback(async () => {
    const count = await okleykaWorkerService.countUnpaid();
    dispatch({ type: "SET_UNPAID_COUNT", payload: count });
  }, []);

  const refreshShift = useCallback(async (date: string) => {
    const shift = await okleykaShiftService.getByDate(date);
    dispatch({ type: "SET_SHIFT", payload: shift });
  }, []);

  const refreshOrders = useCallback(async () => {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");
    const orders = await okleykaOrderService.getByDateRange(start, end);
    dispatch({ type: "SET_ORDERS", payload: orders });
  }, []);

  const refreshDebts = useCallback(async () => {
    const debts = await okleykaDebtService.getOpen();
    dispatch({ type: "SET_DEBTS", payload: debts });
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd");
        const end = format(endOfMonth(now), "yyyy-MM-dd");
        const today = format(now, "yyyy-MM-dd");

        const [employees, organizations, shift, orders, debts, appointments, unpaidCount, inspections] =
          await Promise.all([
            okleykaEmployeeService.getAll(),
            okleykaOrganizationService.getAll(),
            okleykaShiftService.getByDate(today),
            okleykaOrderService.getByDateRange(start, end),
            okleykaDebtService.getOpen(),
            okleykaAppointmentService.getByDateRange(start, end),
            okleykaWorkerService.countUnpaid(),
            okleykaOrderService.getUpcomingInspections(),
          ]);

        dispatch({ type: "SET_EMPLOYEES", payload: employees });
        dispatch({ type: "SET_ORGANIZATIONS", payload: organizations });
        dispatch({ type: "SET_SHIFT", payload: shift });
        dispatch({ type: "SET_ORDERS", payload: orders });
        dispatch({ type: "SET_DEBTS", payload: debts });
        dispatch({ type: "SET_APPOINTMENTS", payload: appointments });
        dispatch({ type: "SET_UNPAID_COUNT", payload: unpaidCount });
        dispatch({ type: "SET_UPCOMING_INSPECTIONS", payload: inspections });
        dispatch({ type: "SET_INITIALIZED", payload: true });
      } catch (err) {
        console.error("[OkleykaContext] loadInitialData error:", err);
        dispatch({ type: "SET_INITIALIZED", payload: true });
      }
    };

    loadInitialData();
  }, []);

  return (
    <OkleykaContext.Provider value={{ state, dispatch, refreshUnpaidCount, refreshShift, refreshOrders, refreshDebts }}>
      {children}
    </OkleykaContext.Provider>
  );
}
