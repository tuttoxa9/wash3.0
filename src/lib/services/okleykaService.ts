// ============================================================
// OKLEYKA SERVICE — Supabase data access layer
// ============================================================
import { supabase } from "@/lib/supabase";
import type {
  OkleykaEmployee,
  OkleykaOrganization,
  OkleykaOrder,
  OkleykaOrderItem,
  OkleykaOrderWorker,
  OkleykaShift,
  OkleykaCashModification,
  OkleykaDebt,
  OkleykaAppointment,
  OkleykaPaymentMethod,
} from "@/lib/types/okleyka";

const log = (msg: string, err: any) => console.error(`[okleykaService] ${msg}:`, err);

// ── Employees ─────────────────────────────────────────────────────────────
export const okleykaEmployeeService = {
  async getAll(): Promise<OkleykaEmployee[]> {
    const { data, error } = await supabase
      .from("okleyka_employees")
      .select("*")
      .order("name");
    if (error) { log("getAll employees", error); return []; }
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, position: r.position }));
  },

  async add(emp: Omit<OkleykaEmployee, "id">): Promise<OkleykaEmployee | null> {
    const { data, error } = await supabase
      .from("okleyka_employees")
      .insert({ name: emp.name, position: emp.position })
      .select("*").single();
    if (error) { log("add employee", error); return null; }
    return { id: data.id, name: data.name, position: data.position };
  },

  async update(emp: OkleykaEmployee): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_employees")
      .update({ name: emp.name, position: emp.position })
      .eq("id", emp.id);
    if (error) { log("update employee", error); return false; }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("okleyka_employees").delete().eq("id", id);
    if (error) { log("delete employee", error); return false; }
    return true;
  },
};

// ── Organizations ─────────────────────────────────────────────────────────
export const okleykaOrganizationService = {
  async getAll(): Promise<OkleykaOrganization[]> {
    const { data, error } = await supabase
      .from("okleyka_organizations")
      .select("*")
      .order("name");
    if (error) { log("getAll orgs", error); return []; }
    return (data || []).map((r: any) => ({ id: r.id, name: r.name }));
  },

  async add(org: Omit<OkleykaOrganization, "id">): Promise<OkleykaOrganization | null> {
    const { data, error } = await supabase
      .from("okleyka_organizations")
      .insert({ name: org.name })
      .select("*").single();
    if (error) { log("add org", error); return null; }
    return { id: data.id, name: data.name };
  },

  async update(org: OkleykaOrganization): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_organizations")
      .update({ name: org.name })
      .eq("id", org.id);
    if (error) { log("update org", error); return false; }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("okleyka_organizations").delete().eq("id", id);
    if (error) { log("delete org", error); return false; }
    return true;
  },
};

// ── Orders ────────────────────────────────────────────────────────────────
const mapOrder = (r: any): OkleykaOrder => ({
  id: r.id,
  boxNumber: r.box_number as 1 | 2,
  dateStart: r.date_start,
  dateEnd: r.date_end,
  carInfo: r.car_info,
  clientName: r.client_name,
  clientPhone: r.client_phone,
  status: r.status,
  paymentMethod: r.payment_method,
  totalPrice: Number(r.total_price || 0),
  notes: r.notes,
  shiftDate: r.shift_date,
  inspectionDate: r.inspection_date,
  inspectionNotified: r.inspection_notified,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

async function populateOrderRelations(ordersData: any[]): Promise<OkleykaOrder[]> {
  const orderIds = ordersData.map(o => o.id);
  
  const [itemsRes, workersRes] = await Promise.all([
    supabase.from("okleyka_order_items").select("*").in("order_id", orderIds),
    supabase.from("okleyka_order_workers").select("*").in("order_id", orderIds),
  ]);

  const allItems = itemsRes.data || [];
  const allWorkers = workersRes.data || [];

  return ordersData.map((o) => {
    const order = mapOrder(o);
    order.items = allItems
      .filter((i: any) => i.order_id === order.id)
      .map((i: any) => ({
        id: i.id,
        orderId: i.order_id,
        name: i.name,
        price: Number(i.price),
      }));
    order.workers = allWorkers
      .filter((w: any) => w.order_id === order.id)
      .map((w: any) => ({
        id: w.id,
        orderId: w.order_id,
        itemIndex: w.item_index,
        employeeId: w.employee_id,
        salary: w.salary !== null ? Number(w.salary) : null,
      }));
    return order;
  });
}

export const okleykaOrderService = {
  async getByDateRange(startDate: string, endDate: string): Promise<OkleykaOrder[]> {
    const { data, error } = await supabase
      .from("okleyka_orders")
      .select("*")
      .gte("date_start", startDate)
      .lte("date_end", endDate)
      .order("created_at", { ascending: false });
    if (error) { log("getByDateRange orders", error); return []; }
    if (!data || data.length === 0) return [];
    
    return await populateOrderRelations(data);
  },

  async getOverlappingForDateRange(startDate: string, endDate: string): Promise<OkleykaOrder[]> {
    const { data, error } = await supabase
      .from("okleyka_orders")
      .select("*")
      .lte("date_start", endDate)
      .gte("date_end", startDate)
      .neq("status", "cancelled");
    if (error) { log("getOverlappingForDateRange orders", error); return []; }
    if (!data || data.length === 0) return [];
    
    return await populateOrderRelations(data);
  },

  async getActiveForDate(date: string): Promise<OkleykaOrder[]> {
    const { data, error } = await supabase
      .from("okleyka_orders")
      .select("*")
      .lte("date_start", date)
      .gte("date_end", date)
      .neq("status", "cancelled");
    if (error) { log("getActiveForDate orders", error); return []; }
    if (!data || data.length === 0) return [];
    
    return await populateOrderRelations(data);
  },

  // Проверить, свободен ли бокс в указанном диапазоне дат
  async checkBoxAvailability(
    boxNumber: 1 | 2,
    dateStart: string,
    dateEnd: string,
    excludeOrderId?: string
  ): Promise<{ available: boolean; conflictingOrder?: OkleykaOrder }> {
    let query = supabase
      .from("okleyka_orders")
      .select("*")
      .eq("box_number", boxNumber)
      .eq("status", "active")
      .lte("date_start", dateEnd)
      .gte("date_end", dateStart);

    if (excludeOrderId) {
      query = query.neq("id", excludeOrderId);
    }

    const { data, error } = await query.limit(1);
    if (error) { log("checkBoxAvailability", error); return { available: true }; }

    if (data && data.length > 0) {
      return { available: false, conflictingOrder: mapOrder(data[0]) };
    }
    return { available: true };
  },

  async create(order: {
    boxNumber: 1 | 2;
    dateStart: string;
    dateEnd: string;
    carInfo: string;
    clientName?: string;
    clientPhone?: string;
    paymentMethod?: OkleykaPaymentMethod;
    totalPrice: number;
    notes?: string;
    shiftDate?: string;
    items: { name: string; price: number }[];
    workers: { itemIndex: number; employeeId: string; salary: number | null }[];
  }): Promise<OkleykaOrder | null> {
    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from("okleyka_orders")
      .insert({
        box_number: order.boxNumber,
        date_start: order.dateStart,
        date_end: order.dateEnd,
        car_info: order.carInfo,
        client_name: order.clientName || null,
        client_phone: order.clientPhone || null,
        payment_method: order.paymentMethod || null,
        total_price: order.totalPrice,
        notes: order.notes || null,
        shift_date: order.shiftDate || null,
        status: order.paymentMethod?.type === "debt" ? "active" : "active",
      })
      .select("*").single();

    if (orderError) { log("create order", orderError); return null; }

    const orderId = orderData.id;

    // Create items
    if (order.items.length > 0) {
      const itemsPayload = order.items.map(item => ({
        order_id: orderId,
        name: item.name,
        price: item.price,
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from("okleyka_order_items")
        .insert(itemsPayload)
        .select("*");

      if (itemsError) { log("create items", itemsError); }
      else if (itemsData && order.workers.length > 0) {
        // Create workers (item_id resolved by index)
        const workersPayload = order.workers.map(w => ({
          order_id: orderId,
          item_id: itemsData[w.itemIndex]?.id,
          employee_id: w.employeeId,
          salary: w.salary,
          is_paid: false,
        })).filter(w => w.item_id);

        if (workersPayload.length > 0) {
          const { error: workersError } = await supabase
            .from("okleyka_order_workers")
            .insert(workersPayload);
          if (workersError) { log("create workers", workersError); }
        }
      }
    }

    // If debt payment — create debt record
    if (order.paymentMethod?.type === "debt") {
      await supabase.from("okleyka_debts").insert({
        order_id: orderId,
        car_info: order.carInfo,
        amount: order.totalPrice,
        shift_date: order.shiftDate || new Date().toISOString().slice(0, 10),
        is_closed: false,
        employee_payouts: {},
      });
    }

    return mapOrder(orderData);
  },

  async update(orderId: string, updates: {
    carInfo?: string;
    clientName?: string;
    clientPhone?: string;
    boxNumber?: 1 | 2;
    dateStart?: string;
    dateEnd?: string;
    totalPrice?: number;
    notes?: string;
    status?: "active" | "completed" | "cancelled";
    paymentMethod?: OkleykaPaymentMethod;
    inspectionDate?: string | null;
    completedAt?: string | null;
    shiftDate?: string;
  }): Promise<boolean> {
    const payload: any = {};
    if (updates.carInfo !== undefined) payload.car_info = updates.carInfo;
    if (updates.clientName !== undefined) payload.client_name = updates.clientName;
    if (updates.clientPhone !== undefined) payload.client_phone = updates.clientPhone;
    if (updates.boxNumber !== undefined) payload.box_number = updates.boxNumber;
    if (updates.dateStart !== undefined) payload.date_start = updates.dateStart;
    if (updates.dateEnd !== undefined) payload.date_end = updates.dateEnd;
    if (updates.totalPrice !== undefined) payload.total_price = updates.totalPrice;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.inspectionDate !== undefined) payload.inspection_date = updates.inspectionDate;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
    if (updates.shiftDate !== undefined) payload.shift_date = updates.shiftDate;

    const { error } = await supabase.from("okleyka_orders").update(payload).eq("id", orderId);
    if (error) { log("update order", error); return false; }
    return true;
  },

  async updateWithItems(
    orderId: string,
    updates: {
      boxNumber: 1 | 2;
      dateStart: string;
      dateEnd: string;
      carInfo: string;
      clientName?: string;
      clientPhone?: string;
      paymentMethod?: OkleykaPaymentMethod;
      totalPrice: number;
      notes?: string;
      shiftDate?: string;
      items: { name: string; price: number }[];
      workers: { itemIndex: number; employeeId: string; salary: number | null }[];
    }
  ): Promise<boolean> {
    // 1. Update order
    const ok = await this.update(orderId, {
      boxNumber: updates.boxNumber,
      dateStart: updates.dateStart,
      dateEnd: updates.dateEnd,
      carInfo: updates.carInfo,
      clientName: updates.clientName || undefined,
      clientPhone: updates.clientPhone || undefined,
      paymentMethod: updates.paymentMethod,
      totalPrice: updates.totalPrice,
      notes: updates.notes || undefined,
      shiftDate: updates.shiftDate,
    });
    if (!ok) return false;

    // 2. Delete old workers and items
    const { error: delWorkersError } = await supabase
      .from("okleyka_order_workers")
      .delete()
      .eq("order_id", orderId);
    if (delWorkersError) {
      log("updateWithItems delete workers", delWorkersError);
      return false;
    }

    const { error: delItemsError } = await supabase
      .from("okleyka_order_items")
      .delete()
      .eq("order_id", orderId);
    if (delItemsError) {
      log("updateWithItems delete items", delItemsError);
      return false;
    }

    // 3. Re-insert items
    if (updates.items.length > 0) {
      const itemsPayload = updates.items.map((item) => ({
        order_id: orderId,
        name: item.name,
        price: item.price,
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from("okleyka_order_items")
        .insert(itemsPayload)
        .select("*");

      if (itemsError) {
        log("updateWithItems create items", itemsError);
        return false;
      }

      // 4. Re-insert workers
      if (itemsData && updates.workers.length > 0) {
        const workersPayload = updates.workers
          .map((w) => ({
            order_id: orderId,
            item_id: itemsData[w.itemIndex]?.id,
            employee_id: w.employeeId,
            salary: w.salary,
            is_paid: false,
          }))
          .filter((w) => w.item_id);

        if (workersPayload.length > 0) {
          const { error: workersError } = await supabase
            .from("okleyka_order_workers")
            .insert(workersPayload);
          if (workersError) {
            log("updateWithItems create workers", workersError);
            return false;
          }
        }
      }
    }

    // 5. Manage debts
    if (updates.paymentMethod?.type === "debt") {
      const { data: existingDebt } = await supabase
        .from("okleyka_debts")
        .select("*")
        .eq("order_id", orderId)
        .limit(1);

      if (existingDebt && existingDebt.length > 0) {
        await supabase
          .from("okleyka_debts")
          .update({
            car_info: updates.carInfo,
            amount: updates.totalPrice,
          })
          .eq("order_id", orderId);
      } else {
        await supabase.from("okleyka_debts").insert({
          order_id: orderId,
          car_info: updates.carInfo,
          amount: updates.totalPrice,
          shift_date: new Date().toISOString().slice(0, 10),
          is_closed: false,
          employee_payouts: {},
        });
      }
    } else {
      await supabase
        .from("okleyka_debts")
        .delete()
        .eq("order_id", orderId)
        .eq("is_closed", false);
    }

    return true;
  },


  async complete(orderId: string, inspectionDate?: string | null): Promise<boolean> {
    const payload: any = {
      status: "completed",
      completed_at: new Date().toISOString(),
    };
    if (inspectionDate !== undefined) {
      payload.inspection_date = inspectionDate;
      payload.inspection_notified = false;
    }
    const { error } = await supabase.from("okleyka_orders").update(payload).eq("id", orderId);
    if (error) { log("complete order", error); return false; }
    return true;
  },

  async getWithItems(orderId: string): Promise<{
    order: OkleykaOrder;
    items: OkleykaOrderItem[];
    workers: OkleykaOrderWorker[];
  } | null> {
    const [orderRes, itemsRes, workersRes] = await Promise.all([
      supabase.from("okleyka_orders").select("*").eq("id", orderId).single(),
      supabase.from("okleyka_order_items").select("*").eq("order_id", orderId).order("created_at"),
      supabase.from("okleyka_order_workers").select("*").eq("order_id", orderId),
    ]);

    if (orderRes.error) { log("getWithItems order", orderRes.error); return null; }

    return {
      order: mapOrder(orderRes.data),
      items: (itemsRes.data || []).map((r: any) => ({
        id: r.id, orderId: r.order_id, name: r.name, price: Number(r.price),
      })),
      workers: (workersRes.data || []).map((r: any) => ({
        id: r.id, orderId: r.order_id, itemId: r.item_id,
        employeeId: r.employee_id, salary: r.salary !== null ? Number(r.salary) : null,
        isPaid: r.is_paid,
      })),
    };
  },

  async getUpcomingInspections(): Promise<OkleykaOrder[]> {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("okleyka_orders")
      .select("*")
      .not("inspection_date", "is", null)
      .eq("inspection_notified", false)
      .gte("inspection_date", now.toISOString())
      .lte("inspection_date", in48h.toISOString());
    if (error) { log("getUpcomingInspections", error); return []; }
    return (data || []).map(mapOrder);
  },
};

// ── Order Items & Workers ─────────────────────────────────────────────────
export const okleykaItemService = {
  async getByOrder(orderId: string): Promise<OkleykaOrderItem[]> {
    const { data, error } = await supabase
      .from("okleyka_order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    if (error) { log("getByOrder items", error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, orderId: r.order_id, name: r.name, price: Number(r.price),
    }));
  },
};

export const okleykaWorkerService = {
  async getByOrder(orderId: string): Promise<OkleykaOrderWorker[]> {
    const { data, error } = await supabase
      .from("okleyka_order_workers")
      .select("*")
      .eq("order_id", orderId);
    if (error) { log("getByOrder workers", error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, orderId: r.order_id, itemId: r.item_id,
      employeeId: r.employee_id,
      salary: r.salary !== null ? Number(r.salary) : null,
      isPaid: r.is_paid,
    }));
  },

  async getUnpaid(): Promise<OkleykaOrderWorker[]> {
    const { data, error } = await supabase
      .from("okleyka_order_workers")
      .select("*")
      .is("salary", null);
    if (error) { log("getUnpaid workers", error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, orderId: r.order_id, itemId: r.item_id,
      employeeId: r.employee_id, salary: null, isPaid: r.is_paid,
    }));
  },

  async countUnpaid(): Promise<number> {
    const { count, error } = await supabase
      .from("okleyka_order_workers")
      .select("id", { count: "exact", head: true })
      .is("salary", null);
    if (error) { log("countUnpaid", error); return 0; }
    return count || 0;
  },

  async assignSalary(workerId: string, salary: number): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_order_workers")
      .update({ salary })
      .eq("id", workerId);
    if (error) { log("assignSalary", error); return false; }
    return true;
  },

  async markPaid(workerId: string): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_order_workers")
      .update({ is_paid: true })
      .eq("id", workerId);
    if (error) { log("markPaid", error); return false; }
    return true;
  },
};

// ── Shifts ────────────────────────────────────────────────────────────────
const mapShift = (r: any): OkleykaShift => ({
  id: r.id,
  date: r.date,
  employeeIds: Array.isArray(r.employee_ids) ? r.employee_ids : (JSON.parse(r.employee_ids || "[]")),
  employeeRoles: r.employee_roles || {},
  startOfDayCash: Number(r.start_of_day_cash || 0),
  actualEndCash: r.actual_end_cash !== null && r.actual_end_cash !== undefined ? Number(r.actual_end_cash) : null,
  salaryPayouts: r.salary_payouts || {},
  cashModifications: r.cash_modifications || [],
  isOpen: r.is_open,
});

export const okleykaShiftService = {
  async getByDate(date: string): Promise<OkleykaShift | null> {
    const { data, error } = await supabase
      .from("okleyka_shifts")
      .select("*")
      .eq("date", date)
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null;
      log("getByDate shift", error); return null;
    }
    return mapShift(data);
  },

  async open(
    date: string,
    employeeIds: string[],
    employeeRoles: Record<string, "admin" | "installer">,
    startOfDayCash: number
  ): Promise<OkleykaShift | null> {
    const { data, error } = await supabase
      .from("okleyka_shifts")
      .upsert({
        date,
        employee_ids: employeeIds,
        employee_roles: employeeRoles,
        start_of_day_cash: startOfDayCash,
        actual_end_cash: null,
        salary_payouts: {},
        cash_modifications: [],
        is_open: true,
      }, { onConflict: "date" })
      .select("*").single();
    if (error) { log("open shift", error); return null; }
    return mapShift(data);
  },

  async update(shift: OkleykaShift): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_shifts")
      .update({
        employee_ids: shift.employeeIds,
        employee_roles: shift.employeeRoles,
        start_of_day_cash: shift.startOfDayCash,
        actual_end_cash: shift.actualEndCash ?? null,
        salary_payouts: shift.salaryPayouts,
        cash_modifications: shift.cashModifications,
        is_open: shift.isOpen,
      })
      .eq("id", shift.id);
    if (error) { log("update shift", error); return false; }
    return true;
  },

  async addCashModification(shiftId: string, mod: OkleykaCashModification, currentMods: OkleykaCashModification[]): Promise<boolean> {
    const updated = [...currentMods, mod];
    const { error } = await supabase
      .from("okleyka_shifts")
      .update({ cash_modifications: updated })
      .eq("id", shiftId);
    if (error) { log("addCashMod", error); return false; }
    return true;
  },

  async removeCashModification(shiftId: string, modId: string, currentMods: OkleykaCashModification[]): Promise<boolean> {
    const updated = currentMods.filter(m => m.id !== modId);
    const { error } = await supabase
      .from("okleyka_shifts")
      .update({ cash_modifications: updated })
      .eq("id", shiftId);
    if (error) { log("removeCashMod", error); return false; }
    return true;
  },

  async close(shiftId: string, actualEndCash: number): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_shifts")
      .update({ actual_end_cash: actualEndCash, is_open: false })
      .eq("id", shiftId);
    if (error) { log("close shift", error); return false; }
    return true;
  },

  async updateSalaryPayouts(shiftId: string, payouts: Record<string, number>): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_shifts")
      .update({ salary_payouts: payouts })
      .eq("id", shiftId);
    if (error) { log("updateSalaryPayouts", error); return false; }
    return true;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<OkleykaShift[]> {
    const { data, error } = await supabase
      .from("okleyka_shifts")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });
    if (error) { log("getByDateRange shifts", error); return []; }
    return (data || []).map(mapShift);
  },

  async deleteByDate(date: string): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_shifts")
      .delete()
      .eq("date", date);
    if (error) { log("deleteByDate shift", error); return false; }
    return true;
  },
};

// ── Debts ─────────────────────────────────────────────────────────────────
const mapDebt = (r: any): OkleykaDebt => ({
  id: r.id,
  orderId: r.order_id,
  carInfo: r.car_info,
  amount: Number(r.amount),
  shiftDate: r.shift_date,
  isClosed: r.is_closed,
  closedAt: r.closed_at,
  actualPaymentMethod: r.actual_payment_method,
  employeePayouts: r.employee_payouts || {},
  createdAt: r.created_at,
});

export const okleykaDebtService = {
  async getOpen(): Promise<OkleykaDebt[]> {
    const { data, error } = await supabase
      .from("okleyka_debts")
      .select("*")
      .eq("is_closed", false)
      .order("created_at", { ascending: false });
    if (error) { log("getOpen debts", error); return []; }
    return (data || []).map(mapDebt);
  },

  async close(
    debtId: string,
    paymentMethod: OkleykaPaymentMethod,
    employeePayouts: Record<string, number>
  ): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_debts")
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        actual_payment_method: paymentMethod,
        employee_payouts: employeePayouts,
      })
      .eq("id", debtId);
    if (error) { log("close debt", error); return false; }
    return true;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<OkleykaDebt[]> {
    const { data, error } = await supabase
      .from("okleyka_debts")
      .select("*")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("created_at", { ascending: false });
    if (error) { log("getByDateRange debts", error); return []; }
    return (data || []).map(mapDebt);
  },
};

// ── Appointments ──────────────────────────────────────────────────────────
const mapAppointment = (r: any): OkleykaAppointment => ({
  id: r.id,
  date: r.date,
  time: r.time,
  carInfo: r.car_info,
  clientName: r.client_name,
  clientPhone: r.client_phone,
  service: r.service,
  boxNumber: r.box_number,
  status: r.status,
  assignedEmployeeId: r.assigned_employee_id ?? undefined,
  createdAt: r.created_at,
});

export const okleykaAppointmentService = {
  async getByDateRange(startDate: string, endDate: string): Promise<OkleykaAppointment[]> {
    const { data, error } = await supabase
      .from("okleyka_appointments")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("time");
    if (error) { log("getByDateRange appointments", error); return []; }
    return (data || []).map(mapAppointment);
  },

  async add(appt: Omit<OkleykaAppointment, "id" | "createdAt">): Promise<OkleykaAppointment | null> {
    const { data, error } = await supabase
      .from("okleyka_appointments")
      .insert({
        date: appt.date,
        time: appt.time,
        car_info: appt.carInfo,
        client_name: appt.clientName || null,
        client_phone: appt.clientPhone || null,
        service: appt.service || null,
        box_number: appt.boxNumber || null,
        status: appt.status || "scheduled",
      })
      .select("*").single();
    if (error) { log("add appointment", error); return null; }
    return mapAppointment(data);
  },

  async update(appt: OkleykaAppointment): Promise<boolean> {
    const { error } = await supabase
      .from("okleyka_appointments")
      .update({
        date: appt.date,
        time: appt.time,
        car_info: appt.carInfo,
        client_name: appt.clientName || null,
        client_phone: appt.clientPhone || null,
        service: appt.service || null,
        box_number: appt.boxNumber || null,
        status: appt.status,
      })
      .eq("id", appt.id);
    if (error) { log("update appointment", error); return false; }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('okleyka_appointments').delete().eq('id', id);
    if (error) { log('delete appointment', error); return false; }
    return true;
  },

  async updateStatus(id: string, status: string): Promise<boolean> {
    const { error } = await supabase.from('okleyka_appointments').update({ status }).eq('id', id);
    if (error) { log('updateStatus appointment', error); return false; }
    return true;
  },

  async assignEmployee(id: string, employeeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('okleyka_appointments')
      .update({ assigned_employee_id: employeeId })
      .eq('id', id);
    if (error) { log('assignEmployee appointment', error); return false; }
    return true;
  },

  async deleteById(id: string): Promise<boolean> {
    const { error } = await supabase.from('okleyka_appointments').delete().eq('id', id);
    if (error) { log('delete appointment', error); return false; }
    return true;
  },
};

export const okleykaSettingsService = {
  async get(): Promise<{ adminSalaryType: 'percent' | 'fixed'; adminSalaryValue: number } | null> {
    const { data, error } = await supabase.from('settings').select('data').eq('key', 'okleykaSettings').single();
    if (error) return null;
    return data?.data || null;
  },
  async save(settings: { adminSalaryType: 'percent' | 'fixed'; adminSalaryValue: number }): Promise<boolean> {
    const { error } = await supabase.from('settings').upsert({ key: 'okleykaSettings', data: settings }, { onConflict: 'key' });
    return !error;
  },

  async clearDatabase(options: {
    employees: boolean;
    organizations: boolean;
    appointments: boolean;
    ordersAndDebts: boolean;
  }) {
    try {
      if (options.ordersAndDebts) {
        // delete in correct foreign key order
        const r1 = await supabase.from('okleyka_debts').delete().not('id', 'is', null);
        if (r1.error) throw r1.error;
        const r2 = await supabase.from('okleyka_order_workers').delete().not('id', 'is', null);
        if (r2.error) throw r2.error;
        const r3 = await supabase.from('okleyka_order_items').delete().not('id', 'is', null);
        if (r3.error) throw r3.error;
        const r4 = await supabase.from('okleyka_orders').delete().not('id', 'is', null);
        if (r4.error) throw r4.error;
        const r5 = await supabase.from('okleyka_shifts').delete().not('id', 'is', null);
        if (r5.error) throw r5.error;
      }
      if (options.appointments) {
        const r = await supabase.from('okleyka_appointments').delete().not('id', 'is', null);
        if (r.error) throw r.error;
      }
      if (options.employees) {
        const r = await supabase.from('okleyka_employees').delete().not('id', 'is', null);
        if (r.error) throw r.error;
      }
      if (options.organizations) {
        const r = await supabase.from('okleyka_organizations').delete().not('id', 'is', null);
        if (r.error) throw r.error;
      }
      return { success: true };
    } catch (e) {
      console.error('Clear database error:', e);
      return { success: false, error: e };
    }
  },
};
