import { supabase } from './supabase.js';

export const LIMIT_PCT = 60;
export const STALE_AFTER_MINUTES = 15;

export const HISTORY_RANGES = {
  '24h': { label: 'Last 24 hours', hours: 24 },
  '7d': { label: 'Last 7 days', hours: 24 * 7 },
  '30d': { label: 'Last 30 days', hours: 24 * 30 },
};

export async function fetchHealthChecks(rangeKey) {
  const sinceIso = new Date(Date.now() - HISTORY_RANGES[rangeKey].hours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('vm_health_checks')
    .select('id, machine_name, status, cpu_pct, mem_pct, disk_pct, disk_mount, reasons, checked_at')
    .gte('checked_at', sinceIso)
    .order('checked_at', { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error('Could not load health checks. Please try again.');
  }
  if (!Array.isArray(data)) {
    throw new Error('Health checks returned an unexpected response.');
  }
  return data;
}
