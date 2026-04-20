const TERRA_BASE = "https://api.tryterra.co/v2";

function terraHeaders() {
  const apiKey = process.env.TERRA_API_KEY;
  const devId = process.env.TERRA_DEV_ID;
  if (!apiKey || !devId) {
    throw new Error("Terra credentials not configured (TERRA_API_KEY, TERRA_DEV_ID)");
  }
  return {
    "dev-id": devId,
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };
}

// Get a Terra widget session URL for connecting a new device
export async function getTerraWidgetUrl(userId: string, provider?: string): Promise<string> {
  const body: Record<string, unknown> = {
    reference_id: userId,
    language: "en",
  };
  if (provider) {
    body.providers = [provider];
  }

  const res = await fetch(`${TERRA_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: terraHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Terra widget session failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { url: string };
  return data.url;
}

// Deauthenticate a Terra user
export async function deauthTerraUser(terraUserId: string): Promise<void> {
  const res = await fetch(
    `${TERRA_BASE}/auth/deauthenticateUser?user_id=${encodeURIComponent(terraUserId)}`,
    { method: "DELETE", headers: terraHeaders() }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Terra deauth failed: ${res.status} ${text}`);
  }
}

// Get recent activity data for a Terra user
export async function getTerraActivity(
  terraUserId: string,
  startDate: string,
  endDate: string
): Promise<unknown> {
  const url = new URL(`${TERRA_BASE}/activity`);
  url.searchParams.set("user_id", terraUserId);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("with_samples", "false");

  const res = await fetch(url.toString(), { method: "GET", headers: terraHeaders() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Terra activity fetch failed: ${res.status} ${text}`);
  }

  return res.json();
}
