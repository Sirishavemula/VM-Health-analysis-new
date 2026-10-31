import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isPercent = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { machine_name, status, cpu_pct, mem_pct, disk_pct, disk_mount, reasons } = body ?? {};

    if (
      typeof machine_name !== "string" || machine_name.trim() === "" || machine_name.length > 100 ||
      (status !== "HEALTHY" && status !== "UNHEALTHY") ||
      !isPercent(cpu_pct) || !isPercent(mem_pct) || !isPercent(disk_pct) ||
      typeof disk_mount !== "string" || disk_mount.length > 255 ||
      !Array.isArray(reasons) || !reasons.every((r) => typeof r === "string" && r.length <= 500) ||
      reasons.length > 20
    ) {
      return jsonResponse({ error: "Invalid health report" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("vm_health_checks").insert({
      machine_name: machine_name.trim(),
      status,
      cpu_pct,
      mem_pct,
      disk_pct,
      disk_mount,
      reasons,
    });

    if (error) {
      console.error("Failed to store health report", error);
      return jsonResponse({ error: "Could not store report" }, 500);
    }

    return jsonResponse({ ok: true }, 201);
  } catch (err) {
    console.error("Unexpected error in report-health", err);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
