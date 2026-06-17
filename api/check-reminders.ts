import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Получаем настройки CRM
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
    const nowIso = now.toISOString();

    // Получаем лиды, у которых запланирован следующий шаг,
    // и статус не является завершенным (won / lost)
    const { data: leads, error: leadsError } = await supabase
      .from("crm_leads")
      .select("*")
      .not("next_step_date", "is", null)
      .not("status", "in", '("won","lost")');

    if (leadsError) {
      throw leadsError;
    }

    const sentReport = [];

    for (const lead of leads) {
      const nextStepTime = new Date(lead.next_step_date);
      const diffMs = nextStepTime.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      const notifyBeforeList = lead.notify_before || [];
      const sentNotifications = lead.sent_notifications || [];

      // Находим все пороги напоминаний, которые подошли по времени, но еще не были отправлены
      const dueThresholds = notifyBeforeList.filter(minutes => 
        diffMinutes <= minutes && 
        diffMinutes > -10 && 
        !sentNotifications.includes(minutes)
      );

      if (dueThresholds.length > 0) {
        // Выбираем самый минимальный (наиболее актуальный на данный момент) порог, чтобы отправить только его
        const targetMinutes = Math.min(...dueThresholds);

        // Отправляем сообщение в Telegram
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
          (lead.price > 0 ? `💰 <b>Стоимость:</b> ${lead.price} руб.\n` : "") +
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

        // Помечаем все подошедшие пороги как отправленные, чтобы они больше не срабатывали
        const updatedSentNotifications = [...sentNotifications, ...dueThresholds];
        
        // Создаем запись в историю
        const timeString = nextStepTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        const dateString = nextStepTime.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        const historyEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
          type: "other",
          text: `Отправлено Telegram-напоминание за ${targetMinutes} мин. до шага (${dateString} в ${timeString})`,
          createdAt: new Date().toISOString()
        };

        const updatedHistory = [...(lead.history || []), historyEntry];

        // Сохраняем изменения в БД
        await supabase
          .from("crm_leads")
          .update({
            sent_notifications: updatedSentNotifications,
            history: updatedHistory
          })
          .eq("id", lead.id);

        sentReport.push({ leadId: lead.id, client: lead.name, minutes: targetMinutes });
      }
    }

    return res.status(200).json({ status: "success", sentCount: sentReport.length, sentItems: sentReport });
  } catch (error: any) {
    console.error("Check reminders cron error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
