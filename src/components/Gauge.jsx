import { LIMIT_PCT } from '../lib/healthData.js';

export default function Gauge({ label, value }) {
  const percent = Math.min(Math.max(Number(value), 0), 100);
  const over = percent > LIMIT_PCT;

  return (
    <div className="gauge">
      <div className="gauge-header">
        <span>{label}</span>
        <strong className={over ? 'text-unhealthy' : 'text-healthy'}>{Number(value).toFixed(1)}%</strong>
      </div>
      <div className="gauge-track" aria-hidden="true">
        <div
          className={`gauge-fill ${over ? 'gauge-fill-over' : 'gauge-fill-ok'}`}
          style={{ width: `${percent}%` }}
        />
        <div className="gauge-limit" style={{ left: `${LIMIT_PCT}%` }} />
      </div>
    </div>
  );
}
