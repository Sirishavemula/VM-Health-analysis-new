import Gauge from './Gauge.jsx';
import { LIMIT_PCT } from '../lib/healthData.js';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMinutesAgo(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

export default function CurrentStatus({ latest, isOnline, minutesSinceLatest }) {
  const healthy = latest.status === 'HEALTHY';

  return (
    <section className="card">
      <div className="status-row">
        <span className={`status-badge ${healthy ? 'status-healthy' : 'status-unhealthy'}`}>
          {healthy ? 'Healthy' : 'Unhealthy'}
        </span>
        <span className={`status-badge ${isOnline ? 'status-online' : 'status-offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <div>
          <h2>{latest.machine_name}</h2>
          <p className="muted">
            Last report {timeFormatter.format(new Date(latest.checked_at))} ({formatMinutesAgo(minutesSinceLatest)})
          </p>
        </div>
      </div>

      {!isOnline && (
        <p className="stale-warning" role="status">
          This machine has not sent a report recently. It may be offline, or its health check may have stopped.
        </p>
      )}

      <div className="gauge-grid">
        <Gauge label="CPU usage" value={latest.cpu_pct} />
        <Gauge label="Memory usage" value={latest.mem_pct} />
        <Gauge label={`Disk usage (${latest.disk_mount})`} value={latest.disk_pct} />
      </div>

      {latest.reasons.length > 0 && (
        <div className="reasons">
          <h3>Why it needs attention</h3>
          <ul>
            {latest.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="muted small">Each measure must stay at or below {LIMIT_PCT}% to be healthy.</p>
    </section>
  );
}
