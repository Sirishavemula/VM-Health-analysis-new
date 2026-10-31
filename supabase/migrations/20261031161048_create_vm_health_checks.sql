/*
# Create vm_health_checks table

1. New Tables
- `vm_health_checks`: one row per health check reported by a machine.
  - `id` (uuid, primary key)
  - `machine_name` (text): which machine the reading came from
  - `status` (text): HEALTHY or UNHEALTHY
  - `cpu_pct`, `mem_pct`, `disk_pct` (numeric): usage percentages
  - `disk_mount` (text): the most-used disk mount point
  - `reasons` (text[]): plain-language reasons when unhealthy
  - `checked_at` (timestamptz): when the check was taken

2. Security
- Row level security enabled on `vm_health_checks`.
- Signed-in users can read rows (SELECT only). The dashboard is shared by all signed-in users.
- No anon access. Inserts come only from the report-health edge function using the service role.

3. Notes
- Index on (machine_name, checked_at) for fast history queries.
*/

CREATE TABLE IF NOT EXISTS vm_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('HEALTHY', 'UNHEALTHY')),
  cpu_pct numeric NOT NULL,
  mem_pct numeric NOT NULL,
  disk_pct numeric NOT NULL,
  disk_mount text NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vm_health_checks_machine_time_idx
  ON vm_health_checks (machine_name, checked_at DESC);

ALTER TABLE vm_health_checks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON vm_health_checks TO authenticated;
GRANT INSERT ON vm_health_checks TO service_role;

DROP POLICY IF EXISTS "select_vm_health_checks" ON vm_health_checks;
CREATE POLICY "select_vm_health_checks" ON vm_health_checks FOR SELECT
  TO authenticated USING (true);
