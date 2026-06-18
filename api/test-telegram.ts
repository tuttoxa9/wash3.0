import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST-запросы
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { botToken, chatId } = req.body || {};

    if (!botToken || !chatId) {
      return res.status(400).json({ error: "botToken and chatId are required" });
    }

    const message = 
      `🔔 <b>Тестовое сообщение CRM</b>\n\n` +
      `✅ Telegram-бот успешно настроен и подключен через прокси-сервер!\n` +
      `📅 Время проверки: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });

    const responseData = await tgRes.json().catch(() => ({}));

    if (tgRes.ok) {
      return res.status(200).json({ success: true, data: responseData });
    } else {
      return res.status(tgRes.status).json({
        success: false,
        error: responseData.description || "Ошибка Telegram API"
      });
    }
  } catch (error: any) {
    console.error("Test Telegram endpoint error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
