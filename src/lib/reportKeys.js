import { supabase } from './supabase.js';

export const MACHINE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;

const KEY_PREFIX = 'vmh_';

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

function generateReportKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `${KEY_PREFIX}${toHex(bytes)}`;
}

export async function fetchReportKeys() {
  const { data, error } = await supabase
    .from('vm_report_keys')
    .select('id, machine_name, created_at, revoked_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Could not load machines. Please try again.');
  }
  if (!Array.isArray(data)) {
    throw new Error('Machines returned an unexpected response.');
  }
  return data;
}

export async function createReportKey(machineName) {
  const reportKey = generateReportKey();
  const keyHash = await sha256Hex(reportKey);

  const { error } = await supabase
    .from('vm_report_keys')
    .insert({ machine_name: machineName, key_hash: keyHash });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This machine already has an active key. Revoke it first to create a new one.');
    }
    throw new Error('Could not create the key. Please try again.');
  }
  return reportKey;
}

export async function revokeReportKey(id) {
  const { error } = await supabase
    .from('vm_report_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null);

  if (error) {
    throw new Error('Could not revoke the key. Please try again.');
  }
}
