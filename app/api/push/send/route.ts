import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails("mailto:admin@vita.app", publicKey, privateKey);
  vapidConfigured = true;
}

interface SendBody {
  userId: string;
  title: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    ensureVapid();

    const { userId, title, body }: SendBody = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const payload = JSON.stringify({ title, body });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    );

    // Remove stale subscriptions (410 Gone)
    const staleEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (
        result.status === "rejected" &&
        result.reason &&
        typeof result.reason === "object" &&
        "statusCode" in result.reason &&
        result.reason.statusCode === 410
      ) {
        staleEndpoints.push(subscriptions[i].endpoint);
      }
    });

    if (staleEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: staleEndpoints } },
      });
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[push/send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
