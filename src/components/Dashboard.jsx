import { useState } from 'react';
import MachinesPanel from './MachinesPanel.jsx';
import StatusView from './StatusView.jsx';

const TABS = [
  { key: 'status', label: 'Status' },
  { key: 'machines', label: 'Machines' },
];

export default function Dashboard({ onSignOut, userEmail }) {
  const [tab, setTab] = useState('status');

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>VM Health Dashboard</h1>
          <p className="muted">Signed in as {userEmail}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab ${tab === item.key ? 'tab-active' : ''}`}
            aria-current={tab === item.key ? 'page' : undefined}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'status' ? <StatusView /> : <MachinesPanel />}
    </div>
  );
}
