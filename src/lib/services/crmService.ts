import { supabase } from "@/lib/supabase";
import type { CRMLead, CRMSettings } from "../types";

export const crmService = {
  // Получение всех лидов, сортированных по дате создания
  async getAllLeads(): Promise<CRMLead[]> {
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("crmService.getAllLeads error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      phone: r.phone,
      car: r.car || "",
      status: r.status,
      source: r.source || "",
      service: r.service || "",
      price: Number(r.price || 0),
      nextStepDate: r.next_step_date || undefined,
      notifyBefore: r.notify_before || [],
      sentNotifications: r.sent_notifications || [],
      notes: r.notes || "",
      history: r.history || [],
    }));
  },

  // Добавление нового лида
  async addLead(lead: Omit<CRMLead, "id" | "createdAt" | "sentNotifications">): Promise<CRMLead | null> {
    const payload = {
      name: lead.name,
      phone: lead.phone,
      car: lead.car || "",
      status: lead.status || "new",
      source: lead.source || "",
      service: lead.service || "",
      price: lead.price || 0,
      next_step_date: lead.nextStepDate || null,
      notify_before: lead.notifyBefore || [],
      sent_notifications: [],
      notes: lead.notes || "",
      history: lead.history || [],
    };

    const { data, error } = await supabase
      .from("crm_leads")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("crmService.addLead error:", error);
      return null;
    }

    return {
      id: data.id,
      createdAt: data.created_at,
      name: data.name,
      phone: data.phone,
      car: data.car || "",
      status: data.status,
      source: data.source || "",
      service: data.service || "",
      price: Number(data.price || 0),
      nextStepDate: data.next_step_date || undefined,
      notifyBefore: data.notify_before || [],
      sentNotifications: data.sent_notifications || [],
      notes: data.notes || "",
      history: data.history || [],
    };
  },

  // Обновление существующего лида
  async updateLead(lead: CRMLead): Promise<boolean> {
    const payload = {
      name: lead.name,
      phone: lead.phone,
      car: lead.car || "",
      status: lead.status,
      source: lead.source || "",
      service: lead.service || "",
      price: lead.price || 0,
      next_step_date: lead.nextStepDate || null,
      notify_before: lead.notifyBefore || [],
      sent_notifications: lead.sentNotifications || [],
      notes: lead.notes || "",
      history: lead.history || [],
    };

    const { error } = await supabase
      .from("crm_leads")
      .update(payload)
      .eq("id", lead.id);

    if (error) {
      console.error("crmService.updateLead error:", error);
      return false;
    }

    return true;
  },

  // Удаление лида
  async deleteLead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("crm_leads")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("crmService.deleteLead error:", error);
      return false;
    }

    return true;
  },

  // Получение настроек CRM
  async getSettings(): Promise<CRMSettings | null> {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "crmSettings")
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") return null;
      console.error("crmService.getSettings error:", error);
      return null;
    }

    return (data as any)?.data ?? null;
  },

  // Сохранение настроек CRM
  async saveSettings(settings: CRMSettings): Promise<boolean> {
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "crmSettings", data: settings }, { onConflict: "key" });

    if (error) {
      console.error("crmService.saveSettings error:", error);
      return false;
    }

    return true;
  }
};
