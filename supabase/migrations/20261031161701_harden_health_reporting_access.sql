/*
# Harden health reporting access and add per-machine report keys

1. Changes to `vm_health_checks`
- Remove all table privileges from `anon` and `authenticated` that were granted by default.
- Signed-in users can only SELECT readings. Only the server (service role) writes readings.

2. New Table: `vm_report_keys`
- One row per key issued to a machine.
- `machine_name`: the machine the key is allowed to report for.
- `key_hash`: SHA-256 hash of the key. The plain key is shown once in the dashboard and never stored.
- `created_by`: the signed-in user who created the key, defaults to the caller.
- `revoked_at`: set when a key is revoked. Revoked keys are rejected by the report endpoint.
- Only one active (not revoked) key may exist per machine name.

3. Security
- Row level security enabled on `vm_report_keys`.
- Users can only see, create, and revoke keys they created.
- Users can change only the `revoked_at` column. The hash and machine name are fixed after creation.
- `anon` has no access.

4. Important notes
- Keys are never retrievable after creation; a lost key must be revoked and replaced.
- The report endpoint reads keys with the service role, which bypasses these policies.
*/

REVOKE ALL ON vm_health_checks FROM anon, authenticated;
GRANT SELECT ON vm_health_checks TO authenticated;

CREATE TABLE IF NOT EXISTS vm_report_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name text NOT NULL CHECK (machine_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$'),
  key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS vm_report_keys_one_active_per_machine
  ON vm_report_keys (machine_name) WHERE revoked_at IS NULL;

ALTER TABLE vm_report_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON vm_report_keys FROM anon, authenticated;
GRANT SELECT, INSERT ON vm_report_keys TO authenticated;
GRANT UPDATE (revoked_at) ON vm_report_keys TO authenticated;

DROP POLICY IF EXISTS "select_own_report_keys" ON vm_report_keys;
CREATE POLICY "select_own_report_keys" ON vm_report_keys FOR SELECT
  TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "insert_own_report_keys" ON vm_report_keys;
CREATE POLICY "insert_own_report_keys" ON vm_report_keys FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_report_keys" ON vm_report_keys;
CREATE POLICY "update_own_report_keys" ON vm_report_keys FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
