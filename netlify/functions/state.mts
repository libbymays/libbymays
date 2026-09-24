import { getStore, getDeployStore } from "@netlify/blobs";

const DEFAULT_STATE = {
  savings: 300,
  flightFund: 0,
  hotelFund: 0,
  tripCushion: 0,
  tripSpent: 0,
  notes: "",
  completed: {}
};

function store() {
  const context = (globalThis as any).Netlify?.context?.deploy?.context;
  if (context === "production") {
    return getStore("mexico-calendar", { consistency: "strong" });
  }
  return getDeployStore("mexico-calendar");
}

export default async (req: Request) => {
  const s = store();

  if (req.method === "GET") {
    const saved = await s.get("state", { type: "json" });
    return Response.json(saved ?? DEFAULT_STATE, {
      headers: { "cache-control": "no-store" }
    });
  }

  if (req.method === "PUT") {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 65536) return new Response("Payload too large", { status: 413 });

    let body: any;
    try { body = await req.json(); }
    catch { return new Response("Invalid JSON", { status: 400 }); }

    const num = (v: any) => Math.max(0, Number(v) || 0);
    const next = {
      savings: num(body.savings),
      flightFund: num(body.flightFund),
      hotelFund: num(body.hotelFund),
      tripCushion: num(body.tripCushion),
      tripSpent: num(body.tripSpent),
      notes: String(body.notes || "").slice(0, 12000),
      completed: body.completed && typeof body.completed === "object" ? body.completed : {},
      lastUpdated: new Date().toISOString()
    };

    await s.setJSON("state", next);
    return Response.json(next, { headers: { "cache-control": "no-store" } });
  }

  return new Response("Method not allowed", { status: 405, headers: { allow: "GET, PUT" } });
};

export const config = { path: "/api/state" };
