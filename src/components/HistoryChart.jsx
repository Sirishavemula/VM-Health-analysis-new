import { LIMIT_PCT } from '../lib/healthData.js';

const WIDTH = 800;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

const SERIES = [
  { key: 'cpu_pct', label: 'Processor', color: '#2563eb' },
  { key: 'mem_pct', label: 'Memory', color: '#0d9488' },
  { key: 'disk_pct', label: 'Disk', color: '#d97706' },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function HistoryChart({ rows }) {
  const times = rows.map((row) => new Date(row.checked_at).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const xFor = (time) =>
    maxTime === minTime
      ? PAD.left + plotWidth / 2
      : PAD.left + ((time - minTime) / (maxTime - minTime)) * plotWidth;
  const yFor = (value) => PAD.top + plotHeight - (Math.min(Math.max(value, 0), 100) / 100) * plotHeight;

  const limitY = yFor(LIMIT_PCT);
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <section className="card">
      <div className="chart-header">
        <h2>History</h2>
        <ul className="legend">
          {SERIES.map((series) => (
            <li key={series.key}>
              <span className="legend-swatch" style={{ background: series.color }} />
              {series.label}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="history-chart" role="img" aria-label="Usage history chart">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="chart-grid"
            />
            <text x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end" className="chart-axis-label">
              {tick}%
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={limitY} y2={limitY} className="chart-limit" />
        <text x={WIDTH - PAD.right} y={limitY - 6} textAnchor="end" className="chart-limit-label">
          {LIMIT_PCT}% limit
        </text>

        {SERIES.map((series) => (
          <polyline
            key={series.key}
            fill="none"
            stroke={series.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={rows
              .map((row, i) => `${xFor(times[i])},${yFor(Number(row[series.key]))}`)
              .join(' ')}
          />
        ))}

        <text x={PAD.left} y={HEIGHT - 8} className="chart-axis-label">
          {dateFormatter.format(new Date(minTime))}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" className="chart-axis-label">
          {dateFormatter.format(new Date(maxTime))}
        </text>
      </svg>
    </section>
  );
}
