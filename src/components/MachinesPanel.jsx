import { useEffect, useState } from 'react';
import {
  createReportKey,
  fetchReportKeys,
  MACHINE_NAME_PATTERN,
  revokeReportKey,
} from '../lib/reportKeys.js';

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-health`;

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function MachinesPanel() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [machineName, setMachineName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  async function loadKeys() {
    try {
      setKeys(await fetchReportKeys());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    const name = machineName.trim();
    if (!MACHINE_NAME_PATTERN.test(name)) {
      setError('Machine name can use letters, numbers, dots, dashes, and underscores (max 63 characters), and must start with a letter or number.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const key = await createReportKey(name);
      setNewKey({ machineName: name, key });
      setCopied(false);
      setMachineName('');
      await loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this key? The machine will stop sending health reports until you add a new key.')) {
      return;
    }
    setRevokingId(id);
    setError('');
    try {
      await revokeReportKey(id);
      await loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevokingId(null);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select the key and copy it manually.');
    }
  }

  return (
    <div className="machines">
      <section className="card">
        <h2>Add a machine</h2>
        <p className="muted small">
          Each machine gets its own key. The key is shown only once, so save it somewhere safe.
        </p>
        <form onSubmit={handleCreate} className="inline-form">
          <label>
            Machine name
            <input
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              placeholder="e.g. ec2-web-1"
              maxLength={63}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create key'}
          </button>
        </form>

        {newKey && (
          <div className="key-reveal" role="status">
            <h3>Key for {newKey.machineName}</h3>
            <p className="small">Copy this key now. You will not be able to see it again.</p>
            <code className="key-value">{newKey.key}</code>
            <div className="key-actions">
              <button type="button" className="btn btn-secondary" onClick={copyKey}>
                {copied ? 'Copied' : 'Copy key'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setNewKey(null)}>
                I have saved it
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Setup on the machine</h2>
        <p className="muted small">
          Set these three values on the machine where the health check runs. The address is public; the key
          is the secret and must never be shared.
        </p>
        <dl className="setup-list">
          <dt>HEALTH_REPORT_URL</dt>
          <dd><code>{REPORT_URL}</code></dd>
          <dt>HEALTH_MACHINE_NAME</dt>
          <dd>The machine name you chose above</dd>
          <dt>HEALTH_REPORT_KEY</dt>
          <dd>The key you copied when creating it</dd>
        </dl>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="card">
        <h2>Machines</h2>
        {loading && <p className="muted">Loading machines...</p>}
        {!loading && keys.length === 0 && <p className="muted">No machines added yet.</p>}
        {keys.length > 0 && (
          <ul className="key-list">
            {keys.map((key) => {
              const revoked = Boolean(key.revoked_at);
              return (
                <li key={key.id} className="key-row">
                  <div>
                    <strong>{key.machine_name}</strong>
                    <p className="muted small">
                      Added {dateFormatter.format(new Date(key.created_at))}
                      {revoked && ` - revoked ${dateFormatter.format(new Date(key.revoked_at))}`}
                    </p>
                  </div>
                  {revoked ? (
                    <span className="status-badge status-muted">Revoked</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokingId === key.id}
                    >
                      {revokingId === key.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
