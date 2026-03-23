// Create Supabase-based data access layer replacing Firebase Firestore
import { supabase, supabaseAdmin } from "@/lib/supabase";
import type {
  Appointment,
  CarWashRecord,
  Certificate,
  DailyReport,
  Employee,
  Organization,
  Service,
} from "../types";

// Helper to map errors
const logSupabaseError = (message: string, error: any) => {
  console.error(`${message}:`, error);
};

// employees
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name");
    if (error) {
      logSupabaseError("employees.getAll", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      name: r.name,
      position: r.position,
      role: r.role,
    }));
  },
  async add(employee: Omit<Employee, "id">): Promise<Employee | null> {
    const { data, error } = await supabase
      .from("employees")
      .insert(employee as any)
      .select("*")
      .single();
    if (error) {
      logSupabaseError("employees.add", error);
      return null;
    }
    return {
      id: String(data.id),
      name: data.name,
      position: data.position,
      role: data.role,
    };
  },
  async update(employee: Employee): Promise<boolean> {
    const { error } = await supabase
      .from("employees")
      .update({ name: employee.name })
      .eq("id", employee.id);
    if (error) {
      logSupabaseError("employees.update", error);
      return false;
    }
    return true;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      logSupabaseError("employees.delete", error);
      return false;
    }
    return true;
  },
};

// organizations
export const organizationService = {
  async getAll(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name");
    if (error) {
      logSupabaseError("organizations.getAll", error);
      return [];
    }
    return (data || []).map((r: any) => ({ id: String(r.id), name: r.name }));
  },
  async add(
    organization: Omit<Organization, "id">,
  ): Promise<Organization | null> {
    const { data, error } = await supabase
      .from("organizations")
      .insert(organization as any)
      .select("*")
      .single();
    if (error) {
      logSupabaseError("organizations.add", error);
      return null;
    }
    return { id: String(data.id), name: data.name };
  },
  async update(organization: Organization): Promise<boolean> {
    const { error } = await supabase
      .from("organizations")
      .update({ name: organization.name })
      .eq("id", organization.id);
    if (error) {
      logSupabaseError("organizations.update", error);
      return false;
    }
    return true;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);
    if (error) {
      logSupabaseError("organizations.delete", error);
      return false;
    }
    return true;
  },
};

// services
export const serviceService = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase.from("services").select("*");
    if (error) {
      logSupabaseError("services.getAll", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      name: r.name,
      price: r.price,
    }));
  },
  async add(service: Omit<Service, "id">): Promise<Service | null> {
    const { data, error } = await supabase
      .from("services")
      .insert(service as any)
      .select("*")
      .single();
    if (error) {
      logSupabaseError("services.add", error);
      return null;
    }
    return { id: String(data.id), name: data.name, price: data.price };
  },
};

// car wash records
export const carWashService = {
  async add(record: Omit<CarWashRecord, "id">): Promise<CarWashRecord | null> {
    const payload = {
      date:
        typeof record.date === "string"
          ? record.date
          : new Date(record.date).toISOString().slice(0, 10),
      time: record.time,
      car_info: record.carInfo,
      service: record.service,
      service_type: record.serviceType || "wash",
      price: record.price,
      payment_method: record.paymentMethod, // JSONB
      participant_ids: Array.isArray((record as any).employeeIds)
        ? (record as any).employeeIds
        : (record as any).washerId
          ? [(record as any).washerId]
          : [],
    };
    const { data, error } = await supabase
      .from("car_wash_records")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      logSupabaseError("carWash.add", error);
      return null;
    }
    return {
      id: String(data.id),
      date: data.date,
      time: data.time,
      carInfo: data.car_info,
      service: data.service,
      serviceType: data.service_type || "wash",
      price: data.price,
      paymentMethod: data.payment_method,
      employeeIds: Array.isArray(data.participant_ids)
        ? data.participant_ids
        : [],
    };
  },
  async getByDate(date: string): Promise<CarWashRecord[]> {
    const { data, error } = await supabase
      .from("car_wash_records")
      .select("*")
      .eq("date", date)
      .order("time");
    if (error) {
      logSupabaseError("carWash.getByDate", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      serviceType: r.service_type || "wash",
      price: r.price,
      paymentMethod: r.payment_method,
      employeeIds: Array.isArray(r.participant_ids) ? r.participant_ids : [],
    }));
  },
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<CarWashRecord[]> {
    const { data, error } = await supabase
      .from("car_wash_records")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("time");
    if (error) {
      logSupabaseError("carWash.getByDateRange", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      serviceType: r.service_type || "wash",
      price: r.price,
      paymentMethod: r.payment_method,
      employeeIds: Array.isArray(r.participant_ids) ? r.participant_ids : [],
    }));
  },
  async getByOrganization(organizationId: string): Promise<CarWashRecord[]> {
    const { data, error } = await supabase
      .from("car_wash_records")
      .select("*")
      .contains("payment_method", { organizationId });
    if (error) {
      logSupabaseError("carWash.getByOrganization", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      serviceType: r.service_type || "wash",
      price: r.price,
      paymentMethod: r.payment_method,
      employeeIds: Array.isArray(r.participant_ids) ? r.participant_ids : [],
    }));
  },
  async update(record: CarWashRecord): Promise<boolean> {
    const { id, ...rest } = record;
    const payload = {
      date:
        typeof rest.date === "string"
          ? rest.date
          : new Date(rest.date).toISOString().slice(0, 10),
      time: rest.time,
      car_info: rest.carInfo,
      service: rest.service,
      service_type: rest.serviceType || "wash",
      price: rest.price,
      payment_method: rest.paymentMethod,
      participant_ids: Array.isArray(rest.employeeIds)
        ? rest.employeeIds
        : (rest as any).washerId
          ? [(rest as any).washerId]
          : [],
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("car_wash_records")
      .update(payload)
      .eq("id", id);
    if (error) {
      logSupabaseError("carWash.update", error);
      return false;
    }
    return true;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("car_wash_records")
      .delete()
      .eq("id", id);
    if (error) {
      logSupabaseError("carWash.delete", error);
      return false;
    }
    return true;
  },
};

// daily reports
export const dailyReportService = {
  async getByDate(date: string): Promise<DailyReport | null> {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("id", date)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      logSupabaseError("dailyReports.getByDate", error);
      return null;
    }
    return {
      id: data.id,
      date: data.date,
      employeeIds: data.employee_ids || [],
      records: data.records || [],
      totalCash: data.total_cash || 0,
      totalCard: data.total_non_cash || 0,
      dailyEmployeeRoles: data.daily_employee_roles || undefined,
      manualSalaries: data.manual_salaries || {},
      cashState: (data.notes || []).find((n: any) => n.id === "CASH_STATE") ? JSON.parse((data.notes || []).find((n: any) => n.id === "CASH_STATE").text) : undefined,
      notes: (data.notes || []).filter((n: any) => n.id !== "CASH_STATE"),
      cashModifications: data.cash_modifications || [],
    };
  },
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyReport[]> {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");
    if (error) {
      logSupabaseError("dailyReports.getByDateRange", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      employeeIds: r.employee_ids || [],
      records: r.records || [],
      totalCash: r.total_cash || 0,
      totalCard: r.total_non_cash || 0,
      dailyEmployeeRoles: r.daily_employee_roles || undefined,
      manualSalaries: r.manual_salaries || {},
      cashState: (r.notes || []).find((n: any) => n.id === "CASH_STATE") ? JSON.parse((r.notes || []).find((n: any) => n.id === "CASH_STATE").text) : undefined,
      notes: (r.notes || []).filter((n: any) => n.id !== "CASH_STATE"),
      cashModifications: r.cash_modifications || [],
    }));
  },
  async updateReport(report: DailyReport): Promise<boolean> {
    const payload = {
      id: report.id,
      date:
        typeof report.date === "string"
          ? report.date
          : new Date(report.date).toISOString().slice(0, 10),
      employee_ids: report.employeeIds,
      records: report.records,
      total_cash: report.totalCash,
      total_non_cash: report.totalCard,
      daily_employee_roles: report.dailyEmployeeRoles ?? null,
      manual_salaries: report.manualSalaries ?? {},
      notes: [
        ...(report.notes || []).filter(n => n.id !== "CASH_STATE"),
        ...(report.cashState ? [{
          id: "CASH_STATE",
          text: JSON.stringify(report.cashState),
          createdAt: new Date().toISOString()
        }] : [])
      ],
      cash_modifications: report.cashModifications ?? [],
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("daily_reports")
      .upsert(payload, { onConflict: "id" });
    if (error) {
      logSupabaseError("dailyReports.updateReport", error);
      return false;
    }
    return true;
  },
  async getActiveDebts(): Promise<DailyReport[]> {
    // Получаем отчеты, в которых есть записи с типом оплаты 'debt'
    // Используем синтаксис Supabase для поиска в JSONB массиве
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .contains("records", '[{"paymentMethod": {"type": "debt"}}]');

    if (error) {
      logSupabaseError("dailyReports.getActiveDebts", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      employeeIds: r.employee_ids || [],
      records: r.records || [],
      totalCash: r.total_cash || 0,
      totalCard: r.total_non_cash || 0,
      dailyEmployeeRoles: r.daily_employee_roles || undefined,
      manualSalaries: r.manual_salaries || {},
      cashModifications: r.cash_modifications || [],
    }));
  },
  async addRecord(date: string, record: CarWashRecord): Promise<boolean> {
    // Fetch current report
    const current =
      (await this.getByDate(date)) ||
      ({
        id: date,
        date,
        employeeIds: [],
        records: [],
        totalCash: 0,
        totalCard: 0,
      } as DailyReport);

    const records = [...current.records, record];
    const totalCash = records.reduce(
      (s, r) => s + (r.paymentMethod.type === "cash" ? r.price : 0),
      0,
    );
    const totalCard = records.reduce(
      (s, r) => s + (r.paymentMethod.type === "card" ? r.price : 0),
      0,
    );
    const employeeIds = Array.from(
      new Set([
        ...current.employeeIds,
        ...(Array.isArray(record.employeeIds)
          ? record.employeeIds
          : (record as any).washerId
            ? [(record as any).washerId]
            : []),
      ]),
    );

    return await this.updateReport({
      ...current,
      records,
      totalCash,
      totalCard,
      employeeIds,
    });
  },
};

// appointments
export const appointmentService = {
  async getAll(startDate?: string, endDate?: string): Promise<Appointment[]> {
    let query = supabase.from("appointments").select("*");

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    query = query.order("date").order("time");

    const { data, error } = await query;
    if (error) {
      logSupabaseError("appointments.getAll", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
  async getByDate(date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", date)
      .order("time");
    if (error) {
      logSupabaseError("appointments.getByDate", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("time");
    if (error) {
      logSupabaseError("appointments.getByDateRange", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
  async add(appointment: Omit<Appointment, "id">): Promise<Appointment | null> {
    const payload = {
      date: appointment.date,
      time: appointment.time,
      car_info: appointment.carInfo,
      service: appointment.service,
      client_name: appointment.clientName ?? null,
      client_phone: appointment.clientPhone ?? null,
      status: appointment.status,
    };
    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      logSupabaseError("appointments.add", error);
      return null;
    }
    return {
      id: String(data.id),
      date: data.date,
      time: data.time,
      carInfo: data.car_info,
      service: data.service,
      clientName: data.client_name,
      clientPhone: data.client_phone,
      status: data.status,
      createdAt: data.created_at,
    };
  },
  async update(appointment: Appointment): Promise<boolean> {
    const { id, ...rest } = appointment;
    const payload = {
      date: rest.date,
      time: rest.time,
      car_info: rest.carInfo,
      service: rest.service,
      client_name: rest.clientName ?? null,
      client_phone: rest.clientPhone ?? null,
      status: rest.status,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("appointments")
      .update(payload)
      .eq("id", id);
    if (error) {
      logSupabaseError("appointments.update", error);
      return false;
    }
    return true;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      logSupabaseError("appointments.delete", error);
      return false;
    }
    return true;
  },
  async getTodayAndTomorrow(): Promise<Appointment[]> {
    // expects database to filter date IN (today, tomorrow)
    const today = new Date();
    const t1 = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .in("date", [t1, tomorrow])
      .eq("status", "scheduled")
      .order("date")
      .order("time");
    if (error) {
      logSupabaseError("appointments.getTodayAndTomorrow", error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      time: r.time,
      carInfo: r.car_info,
      service: r.service,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
};

// certificates
export const certificateService = {
  async getAllActive(): Promise<Certificate[]> {
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError("certificates.getAllActive", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      amount: r.amount,
      service: r.service,
      paymentMethod: r.payment_method,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async add(certificate: Omit<Certificate, "id" | "createdAt" | "updatedAt">): Promise<Certificate | null> {
    const payload = {
      date: certificate.date,
      amount: certificate.amount,
      service: certificate.service,
      payment_method: certificate.paymentMethod,
      status: certificate.status,
    };

    const { data, error } = await supabase
      .from("certificates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("certificates.add", error);
      return null;
    }

    return {
      id: String(data.id),
      date: data.date,
      amount: data.amount,
      service: data.service,
      paymentMethod: data.payment_method,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async redeem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("certificates")
      .update({ status: "redeemed", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      logSupabaseError("certificates.redeem", error);
      return false;
    }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("id", id);

    if (error) {
      logSupabaseError("certificates.delete", error);
      return false;
    }
    return true;
  },
};

// settings
export const settingsService = {

  async getSafeBalance(): Promise<number> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "safeBalance")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return 0;
      logSupabaseError("settings.getSafeBalance", error);
      return 0;
    }
    return (data as any)?.data?.balance ?? 0;
  },
  async updateSafeBalance(balance: number): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: "safeBalance", data: { balance } },
        { onConflict: "key" },
      );
    if (error) {
      logSupabaseError("settings.updateSafeBalance", error);
      return false;
    }
    return true;
  },
  async getSafeTransactions(): Promise<any[]> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "safeTransactions")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return [];
      logSupabaseError("settings.getSafeTransactions", error);
      return [];
    }
    return (data as any)?.data?.transactions ?? [];
  },
  async addSafeTransaction(transaction: any): Promise<boolean> {
    const transactions = await this.getSafeTransactions();
    transactions.unshift(transaction); // новые транзакции в начало
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: "safeTransactions", data: { transactions } },
        { onConflict: "key" },
      );
    if (error) {
      logSupabaseError("settings.addSafeTransaction", error);
      return false;
    }
    return true;
  },

  async processSafeOperations(
    newTransactions: any[],
    _clientNewBalance?: number // устаревший параметр, оставляем для совместимости или игнорируем
  ): Promise<{ success: boolean; newBalance?: number }> {
    // Получаем актуальный баланс и транзакции из БД, чтобы избежать гонки (race condition)
    // когда клиент отправляет устаревший state.safeBalance
    const currentTransactions = await this.getSafeTransactions();
    const currentBalance = await this.getSafeBalance();

    // Вычисляем дельту на основе новых транзакций
    let delta = 0;
    for (const tx of newTransactions) {
      if (tx.type === "in") delta += tx.amount;
      if (tx.type === "out") delta -= tx.amount;
    }

    const actualNewBalance = currentBalance + delta;

    // Переворачиваем массив новых транзакций (чтобы последняя добавленная оставалась в начале),
    // и объединяем с существующими
    const updatedTransactions = [...newTransactions].reverse().concat(currentTransactions);

    // Выполняем batch upsert для обеих записей одновременно
    const { error } = await supabase
      .from("settings")
      .upsert([
        { key: "safeTransactions", data: { transactions: updatedTransactions } },
        { key: "safeBalance", data: { balance: actualNewBalance } }
      ], { onConflict: "key" });

    if (error) {
      logSupabaseError("settings.processSafeOperations", error);
      return { success: false };
    }
    return { success: true, newBalance: actualNewBalance };
  },

  async saveSalaryCalculationMethod(
    method: string,
    date: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: "salaryCalculation", data: { method, date } },
        { onConflict: "key" },
      );
    if (error) {
      logSupabaseError("settings.saveSalaryCalculationMethod", error);
      return false;
    }
    return true;
  },
  async getSalaryCalculationMethod(): Promise<{
    method: string;
    date: string;
  } | null> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "salaryCalculation")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null;
      logSupabaseError("settings.getSalaryCalculationMethod", error);
      return null;
    }
    return (data as any)?.data ?? null;
  },
  async saveMinimumPaymentSettings(settings: any): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "minimumPayment", data: settings }, { onConflict: "key" });
    if (error) {
      logSupabaseError("settings.saveMinimumPaymentSettings", error);
      return false;
    }
    return true;
  },
  async getMinimumPaymentSettings(): Promise<any | null> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "minimumPayment")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null;
      logSupabaseError("settings.getMinimumPaymentSettings", error);
      return null;
    }
    return (data as any)?.data ?? null;
  },
  async saveOrganizationsInTotal(orgs: string[]): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: "organizationsInTotal", data: orgs },
        { onConflict: "key" },
      );
    if (error) {
      logSupabaseError("settings.saveOrganizationsInTotal", error);
      return false;
    }
    return true;
  },
  async getOrganizationsInTotal(): Promise<string[] | null> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "organizationsInTotal")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null;
      logSupabaseError("settings.getOrganizationsInTotal", error);
      return null;
    }
    return (data as any)?.data ?? null;
  },
  async saveRealtimeEnabled(isEnabled: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: "realtimeEnabled", data: { isEnabled } },
        { onConflict: "key" },
      );
    if (error) {
      logSupabaseError("settings.saveRealtimeEnabled", error);
      return false;
    }
    return true;
  },
  async getRealtimeEnabled(): Promise<boolean> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "realtimeEnabled")
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return true; // по умолчанию включено
      logSupabaseError("settings.getRealtimeEnabled", error);
      return true;
    }
    return (data as any)?.data?.isEnabled ?? true;
  },
};

// daily roles
export const dailyRolesService = {
  async saveDailyRoles(
    date: string,
    employeeRoles: Record<string, string>,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("daily_roles")
      .upsert(
        { id: date, date, employee_roles: employeeRoles },
        { onConflict: "id" },
      );
    if (error) {
      logSupabaseError("dailyRoles.saveDailyRoles", error);
      return false;
    }
    return true;
  },
  async getDailyRoles(date: string): Promise<Record<string, string> | null> {
    const { data, error } = await supabase
      .from("daily_roles")
      .select("employee_roles")
      .eq("id", date)
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null;
      logSupabaseError("dailyRoles.getDailyRoles", error);
      return null;
    }
    return (data as any)?.employee_roles ?? null;
  },
  async getDailyRolesByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Record<string, Record<string, string>>> {
    const { data, error } = await supabase
      .from("daily_roles")
      .select("date, employee_roles")
      .gte("date", startDate)
      .lte("date", endDate);
    if (error) {
      logSupabaseError("dailyRoles.getDailyRolesByDateRange", error);
      return {};
    }

    const result: Record<string, Record<string, string>> = {};
    (data || []).forEach((r: any) => {
      result[r.date] = r.employee_roles;
    });
    return result;
  },
  async updateEmployeeRole(
    date: string,
    employeeId: string,
    role: string,
  ): Promise<boolean> {
    const current = (await this.getDailyRoles(date)) || {};
    current[employeeId] = role;
    return this.saveDailyRoles(date, current);
  },
};

export const databaseService = {
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from("employees")
        .select("id")
        .limit(1);
      if (error) throw error;
      return true;
    } catch (e) {
      logSupabaseError("database.testConnection", e);
      return false;
    }
  },
    async clearDataByDate(date: string): Promise<boolean> {
    try {
      const tables = [
        "appointments",
        "car_wash_records",
        "daily_reports",
        "daily_roles",
      ];

      for (const t of tables) {
        // daily_reports uses "id" as the date field
        const column = t === "daily_reports" ? "id" : "date";
        const { error } = await supabaseAdmin
          .from(t)
          .delete()
          .eq(column, date);

        if (error) {
          logSupabaseError(`database.clearDataByDate - table ${t}`, error);
          return false;
        }
      }
      return true;
    } catch (e) {
      logSupabaseError("database.clearDataByDate", e);
      return false;
    }
  },
  async clearAllData(): Promise<boolean> {
    try {
      // Use admin client to clear all data (bypasses RLS)
      const tables = [
        "appointments",
        "car_wash_records",
        "daily_reports",
        "daily_roles",
        "services",
        "organizations",
        "employees",
        "settings",
        "certificates",
      ];

      for (const t of tables) {
        const { error } = await supabaseAdmin
          .from(t)
          .delete()
          .neq("id", null as any);
        if (error) {
          logSupabaseError(`database.clearAllData - table ${t}`, error);
          throw error;
        }
      }
      return true;
    } catch (e) {
      logSupabaseError("database.clearAllData", e);
      return false;
    }
  },
};
