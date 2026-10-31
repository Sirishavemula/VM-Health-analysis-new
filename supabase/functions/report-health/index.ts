import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LIMIT_PCT = 60;
const MAX_BODY_BYTES = 4096;
const KEY_PATTERN = /^vmh_[a-f0-9]{64}$/;
const MACHINE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;
const DISK_MOUNT_PATTERN = /^[\x20-\x7E]{1,255}$/;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status: number) => jsonResponse({ error: message }, status);

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

const parsePercent = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return Math.round(value * 10) / 10;
};

const buildReasons = (metrics: { cpu: number; mem: number; disk: number; diskMount: string }) => {
  const reasons: string[] = [];
  if (metrics.cpu > LIMIT_PCT) reasons.push(`CPU usage is ${metrics.cpu}%, above the ${LIMIT_PCT}% limit.`);
  if (metrics.mem > LIMIT_PCT) reasons.push(`Memory usage is ${metrics.mem}%, above the ${LIMIT_PCT}% limit.`);
  if (metrics.disk > LIMIT_PCT) {
    reasons.push(`Disk usage is ${metrics.disk}% on ${metrics.diskMount}, above the ${LIMIT_PCT}% limit.`);
  }
  return reasons;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const reportKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!KEY_PATTERN.test(reportKey)) {
      return errorResponse("Unauthorized", 401);
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return errorResponse("Report is too large", 413);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse("Report must be valid JSON", 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return errorResponse("Report must be a JSON object", 400);
    }

    const machineName = typeof body.machine_name === "string" ? body.machine_name.trim() : "";
    const diskMount = typeof body.disk_mount === "string" ? body.disk_mount : "";
    const cpu = parsePercent(body.cpu_pct);
    const mem = parsePercent(body.mem_pct);
    const disk = parsePercent(body.disk_pct);

    if (
      !MACHINE_NAME_PATTERN.test(machineName) ||
      !DISK_MOUNT_PATTERN.test(diskMount) ||
      cpu === null || mem === null || disk === null
    ) {
      return errorResponse("Invalid health report", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const keyHash = await sha256Hex(reportKey);
    const { data: keyRow, error: keyError } = await supabase
      .from("vm_report_keys")
      .select("machine_name")
      .eq("key_hash", keyHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (keyError) {
      console.error("Key lookup failed", keyError);
      return errorResponse("Could not store report", 500);
    }
    if (!keyRow) {
      return errorResponse("Unauthorized", 401);
    }
    if (keyRow.machine_name !== machineName) {
      return errorResponse("Key is not valid for this machine", 403);
    }

    const reasons = buildReasons({ cpu, mem, disk, diskMount });
    const { error: insertError } = await supabase.from("vm_health_checks").insert({
      machine_name: machineName,
      status: reasons.length > 0 ? "UNHEALTHY" : "HEALTHY",
      cpu_pct: cpu,
      mem_pct: mem,
      disk_pct: disk,
      disk_mount: diskMount,
      reasons,
    });

    if (insertError) {
      console.error("Failed to store health report", insertError);
      return errorResponse("Could not store report", 500);
    }

    return jsonResponse({ ok: true, status: reasons.length > 0 ? "UNHEALTHY" : "HEALTHY" }, 201);
  } catch (err) {
    console.error("Unexpected error in report-health", err);
    return errorResponse("Unexpected error", 500);
  }
});
