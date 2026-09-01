import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase";
import {
  sendTelegramNotification,
  sendDiscordNotification,
  JournalSummaryPayload,
} from "@/lib/notifier";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    // 2. Parse payload
    const body = await req.json();
    const { summaryData, provider } = body as {
      summaryData: JournalSummaryPayload;
      provider?: "telegram" | "discord" | "all";
    };

    if (!summaryData?.title || !summaryData?.summary) {
      return NextResponse.json({ error: "Invalid summary payload" }, { status: 400 });
    }

    // 3. Dispatch notifications safely
    const targetProvider = provider || "all";
    const dispatches: Promise<boolean>[] = [];

    if (targetProvider === "telegram" || targetProvider === "all") {
      dispatches.push(sendTelegramNotification(summaryData));
    }
    if (targetProvider === "discord" || targetProvider === "all") {
      dispatches.push(sendDiscordNotification(summaryData));
    }

    await Promise.allSettled(dispatches);

    return NextResponse.json({ success: true, dispatchedTo: targetProvider });
  } catch (error: any) {
    console.error("Notification Dispatch Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
