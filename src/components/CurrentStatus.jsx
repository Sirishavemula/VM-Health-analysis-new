import Gauge from './Gauge.jsx';
import { LIMIT_PCT } from '../lib/healthData.js';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function CurrentStatus({ latest }) {
  const healthy = latest.status === 'HEALTHY';

  return (
    <section className="card">
      <div className="status-row">
        <span className={`status-badge ${healthy ? 'status-healthy' : 'status-unhealthy'}`}>
          {healthy ? 'Healthy' : 'Unhealthy'}
        </span>
        <div>
          <h2>{latest.machine_name}</h2>
          <p className="muted">Last checked {timeFormatter.format(new Date(latest.checked_at))}</p>
        </div>
      </div>

      <div className="gauge-grid">
        <Gauge label="Processor" value={latest.cpu_pct} />
        <Gauge label="Memory" value={latest.mem_pct} />
        <Gauge label={`Disk (${latest.disk_mount})`} value={latest.disk_pct} />
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
