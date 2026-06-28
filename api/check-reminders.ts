import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Получаем настройки (телеграм-бот теперь хранится там же)
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "crmSettings")
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      throw settingsError;
    }

    const crmSettings = settingsRow?.data || {};

    // Если интеграция отключена или параметры не заполнены
    if (!crmSettings.telegramEnabled || !crmSettings.telegramBotToken || !crmSettings.telegramChatId) {
      return res.status(200).json({ status: "skipped", message: "Telegram integration is disabled or not configured." });
    }

    const now = new Date();
    const sentReport = [];

    // ════════════════════════════════════════════════════════
    // 1. CRM LEADS — напоминания о следующем шаге
    // ════════════════════════════════════════════════════════
    const { data: leads, error: leadsError } = await supabase
      .from("crm_leads")
      .select("*")
      .not("next_step_date", "is", null)
      .not("status", "in", '("won","lost")');

    if (leadsError) {
      throw leadsError;
    }

    for (const lead of leads) {
      const nextStepTime = new Date(lead.next_step_date);
      const diffMs = nextStepTime.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      const notifyBeforeList = (lead.notify_before || []).map(Number);
      const sentNotifications = (lead.sent_notifications || []).map(Number);

      const dueThresholds = notifyBeforeList.filter(minutes =>
        diffMinutes <= minutes &&
        diffMinutes > -10 &&
        !sentNotifications.includes(minutes)
      );

      if (dueThresholds.length > 0) {
        const targetMinutes = Math.min(...dueThresholds);

        const label = diffMinutes <= 0
          ? "Время визита наступило!"
          : `Визит запланирован через ${diffMinutes} минут!`;

        let statusLabel = lead.status;
        if (lead.status === "appointment") statusLabel = "Приезд";
        else if (lead.status === "call_back") statusLabel = "Перезвон";
        else if (lead.status === "in_work") statusLabel = "В работе";
        else if (lead.status === "no_answer") statusLabel = "Недозвон";
        else if (lead.status === "thinking") statusLabel = "Думает";
        else if (lead.status === "new") statusLabel = "Новый";

        const message =
          `🔔 <b>Напоминание: ${label}</b>\n\n` +
          `👤 <b>Клиент:</b> ${lead.name}\n` +
          `📞 <b>Телефон:</b> <code>${lead.phone}</code>\n` +
          (lead.car ? `🚗 <b>Автомобиль:</b> ${lead.car}\n` : "") +
          `🛠 <b>Услуга:</b> ${lead.service || "Не указана"}\n` +
          (lead.price > 0 ? `💰 <b>Стоимость:</b> ${lead.price} BYN\n` : "") +
          `📡 <b>Текущий статус:</b> ${statusLabel}\n` +
          (lead.notes ? `📝 <b>Заметки:</b> ${lead.notes}\n` : "");

        const tgRes = await fetch(`https://api.telegram.org/bot${crmSettings.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: crmSettings.telegramChatId,
            text: message,
            parse_mode: "HTML"
          })
        });

        if (!tgRes.ok) {
          const errorText = await tgRes.text();
          console.error(`Telegram sendMessage failed for lead ${lead.id}:`, errorText);
          continue;
        }

        const updatedSentNotifications = [...sentNotifications, ...dueThresholds];
        const timeString = nextStepTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        const dateString = nextStepTime.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        const historyEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
          type: "other",
          text: `Отправлено Telegram-напоминание за ${targetMinutes} мин. до шага (${dateString} в ${timeString})`,
          createdAt: new Date().toISOString()
        };

        const updatedHistory = [...(lead.history || []), historyEntry];

        const { error: dbError } = await supabase
          .from("crm_leads")
          .update({
            sent_notifications: updatedSentNotifications,
            history: updatedHistory
          })
          .eq("id", lead.id);

        if (dbError) {
          console.error(`Supabase update error for lead ${lead.id}:`, dbError);
        }

        sentReport.push({ type: "crm", leadId: lead.id, client: lead.name, minutes: targetMinutes });
      }
    }

    // ════════════════════════════════════════════════════════
    // 2. OKLEYKA — контрольные осмотры (за 24 часа)
    // ════════════════════════════════════════════════════════
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000); // чуть больше, чтобы не пропустить при следующем запуске

    const { data: ordersWithInspection, error: inspectionsError } = await supabase
      .from("okleyka_orders")
      .select(`
        id, car_info, client_name, client_phone,
        inspection_date, inspection_notified,
        status
      `)
      .not("inspection_date", "is", null)
      .eq("inspection_notified", false)
      .gte("inspection_date", in24h.toISOString())
      .lte("inspection_date", in25h.toISOString());

    if (inspectionsError) {
      console.error("Error fetching okleyka inspections:", inspectionsError);
    } else if (ordersWithInspection && ordersWithInspection.length > 0) {
      for (const order of ordersWithInspection) {
        const inspectionDate = new Date(order.inspection_date);
        const dateStr = inspectionDate.toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long"
        });
        const timeStr = inspectionDate.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit"
        });

        // Получаем услуги заказа
        const { data: items } = await supabase
          .from("okleyka_order_items")
          .select("name, price")
          .eq("order_id", order.id);

        const servicesText = items && items.length > 0
          ? items.map((i: any) => i.name).join(", ")
          : "Не указаны";

        const message =
          `🔍 <b>Завтра контрольный осмотр — Оклейка</b>\n\n` +
          `🚗 <b>Автомобиль:</b> ${order.car_info}\n` +
          (order.client_name ? `👤 <b>Клиент:</b> ${order.client_name}\n` : "") +
          (order.client_phone ? `📞 <b>Телефон:</b> <code>${order.client_phone}</code>\n` : "") +
          `🛠 <b>Услуги:</b> ${servicesText}\n` +
          `📅 <b>Дата осмотра:</b> ${dateStr} в ${timeStr}`;

        const tgRes = await fetch(`https://api.telegram.org/bot${crmSettings.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: crmSettings.telegramChatId,
            text: message,
            parse_mode: "HTML"
          })
        });

        if (tgRes.ok) {
          // Помечаем как отправленное
          await supabase
            .from("okleyka_orders")
            .update({ inspection_notified: true })
            .eq("id", order.id);

          sentReport.push({ type: "inspection", orderId: order.id, car: order.car_info });
        } else {
          const errorText = await tgRes.text();
          console.error(`Telegram inspection notification failed for order ${order.id}:`, errorText);
        }
      }
    }

    return res.status(200).json({
      status: "success",
      sentCount: sentReport.length,
      sentItems: sentReport
    });
  } catch (error: any) {
    console.error("Check reminders cron error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
