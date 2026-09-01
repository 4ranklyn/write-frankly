export interface JournalSummaryPayload {
  title: string;
  mood: string;
  summary: string;
  keyTakeaways: string[];
}

export async function sendTelegramNotification(
  payload: JournalSummaryPayload
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return false;

  const text =
    `📓 *New Journal Reflection Synthesized*\n\n` +
    `*Title:* ${escapeTelegramMarkdown(payload.title)}\n` +
    `*Mood:* ${escapeTelegramMarkdown(payload.mood)}\n\n` +
    `*Summary:*\n_${escapeTelegramMarkdown(payload.summary)}_\n\n` +
    `*Key Insights:*\n` +
    (payload.keyTakeaways || []).map((t) => `• ${escapeTelegramMarkdown(t)}`).join("\n");

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "MarkdownV2",
      }),
    });

    return res.ok;
  } catch (error) {
    console.error("Telegram notification error:", error);
    return false;
  }
}

export async function sendDiscordNotification(
  payload: JournalSummaryPayload
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const body = {
    embeds: [
      {
        title: `📓 Journal Reflection: ${payload.title}`,
        color: 0x52525b, // Zinc-600 Apple HIG neutral tone
        fields: [
          { name: "Mood", value: payload.mood || "thoughtful", inline: true },
          { name: "Summary", value: payload.summary || "No summary provided." },
          {
            name: "Key Takeaways",
            value:
              (payload.keyTakeaways || []).map((t) => `• ${t}`).join("\n") ||
              "None",
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res.ok;
  } catch (error) {
    console.error("Discord notification error:", error);
    return false;
  }
}

function escapeTelegramMarkdown(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
