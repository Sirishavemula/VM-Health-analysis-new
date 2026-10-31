import { useEffect, useState } from 'react';
import { fetchHealthChecks, HISTORY_RANGES, STALE_AFTER_MINUTES } from '../lib/healthData.js';
import CurrentStatus from './CurrentStatus.jsx';
import HistoryChart from './HistoryChart.jsx';

const REFRESH_MS = 60 * 1000;

export default function StatusView() {
  const [range, setRange] = useState('24h');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchHealthChecks(range);
        if (!cancelled) {
          setRows(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const intervalId = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [range]);

  const machines = [...new Set(rows.map((row) => row.machine_name))];
  const activeMachine = machines.includes(selectedMachine) ? selectedMachine : machines[0] ?? null;
  const machineRows = rows.filter((row) => row.machine_name === activeMachine);
  const latest = machineRows.at(-1) ?? null;

  const minutesSinceLatest = latest
    ? (Date.now() - new Date(latest.checked_at).getTime()) / 60000
    : null;
  const isOnline = minutesSinceLatest !== null && minutesSinceLatest <= STALE_AFTER_MINUTES;

  return (
    <>
      <div className="toolbar">
        <label>
          Machine
          <select
            value={activeMachine ?? ''}
            onChange={(e) => setSelectedMachine(e.target.value)}
            disabled={machines.length === 0}
          >
            {machines.length === 0 && <option value="">No machines yet</option>}
            {machines.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Time range
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {Object.entries(HISTORY_RANGES).map(([key, option]) => (
              <option key={key} value={key}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error} {rows.length > 0 && 'Showing the last data that loaded.'}
        </p>
      )}

      {loading && rows.length === 0 && !error && <p className="muted">Loading health checks...</p>}

      {!loading && !error && !latest && (
        <section className="card empty-state">
          <h2>No health reports yet</h2>
          <p className="muted">
            Add a machine on the Machines screen and set up its health check. Its results will appear here.
          </p>
        </section>
      )}

      {latest && (
        <>
          <CurrentStatus latest={latest} isOnline={isOnline} minutesSinceLatest={minutesSinceLatest} />
          <HistoryChart rows={machineRows} />
        </>
      )}
    </>
  );
}
