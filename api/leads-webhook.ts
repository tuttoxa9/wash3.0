import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST запросы
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  // Получаем API-ключ из заголовков или параметров запроса
  const apiKey = (req.headers["x-api-key"] || req.query.api_key) as string;

  if (!apiKey) {
    return res.status(401).json({ error: "Unauthorized. Missing API key." });
  }

  try {
    // Получаем настройки CRM из таблицы settings
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("data")
      .eq("key", "crmSettings")
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      throw settingsError;
    }

    const crmSettings = settingsRow?.data || {};
    const validApiKey = crmSettings.webhookApiKey;

    // Если ключ не настроен или не совпадает
    if (!validApiKey || apiKey !== validApiKey) {
      return res.status(401).json({ error: "Unauthorized. Invalid API key." });
    }

    // Извлекаем тело запроса
    const { name, phone, car, source, service, price, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Missing required fields: name and phone are required." });
    }

    const leadSource = source || "Webhook";
    const leadPrice = Number(price || 0);

    // Подготавливаем историю
    const creationHistory = [
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "creation",
        text: `Лид создан автоматически через интеграцию. Источник: ${leadSource}`,
        createdAt: new Date().toISOString()
      }
    ];

    // Создаем лид
    const { data: newLead, error: insertError } = await supabase
      .from("crm_leads")
      .insert({
        name,
        phone,
        car: car || "",
        status: "new",
        source: leadSource,
        service: service || "",
        price: leadPrice,
        notes: notes || "",
        history: creationHistory,
        notify_before: [],
        sent_notifications: []
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    // Если включена отправка в Telegram
    if (crmSettings.telegramEnabled && crmSettings.telegramBotToken && crmSettings.telegramChatId) {
      try {
        const message = 
          `🆕 <b>Новая заявка с рекламы!</b>\n\n` +
          `👤 <b>Имя:</b> ${name}\n` +
          `📞 <b>Телефон:</b> <code>${phone}</code>\n` +
          (car ? `🚗 <b>Автомобиль:</b> ${car}\n` : "") +
          `📡 <b>Источник:</b> ${leadSource}\n` +
          (service ? `🛠 <b>Услуга:</b> ${service}\n` : "") +
          (leadPrice > 0 ? `💰 <b>Стоимость:</b> ${leadPrice} руб.\n` : "") +
          (notes ? `📝 <b>Заметка:</b> ${notes}\n` : "");

        await fetch(`https://api.telegram.org/bot${crmSettings.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: crmSettings.telegramChatId,
            text: message,
            parse_mode: "HTML"
          })
        });
      } catch (tgError) {
        console.error("Failed to send Telegram message for webhook lead:", tgError);
      }
    }

    return res.status(200).json({ success: true, leadId: newLead.id });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
