import { useEffect, useState } from 'react';
import API from '../api';

const defaultRules = {
  autoApproveLowRiskListings: false,
  autoResolveStaleComplaintsDays: 0,
  highRiskPaymentFailRatePct: 20,
  payoutDelayThresholdDays: 3,
  broadcastOnCriticalIncident: false,
};

export default function RuleEngine() {
  const [rules, setRules] = useState(defaultRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/rules');
      setRules({ ...defaultRules, ...(res.data?.rules || {}) });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = {
        autoApproveLowRiskListings: Boolean(rules.autoApproveLowRiskListings),
        autoResolveStaleComplaintsDays: Number(rules.autoResolveStaleComplaintsDays || 0),
        highRiskPaymentFailRatePct: Number(rules.highRiskPaymentFailRatePct || 20),
        payoutDelayThresholdDays: Number(rules.payoutDelayThresholdDays || 3),
        broadcastOnCriticalIncident: Boolean(rules.broadcastOnCriticalIncident),
      };
      const res = await API.put('/rules', payload);
      setRules({ ...defaultRules, ...(res.data?.rules || payload) });
      setSuccess('Rule engine updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><div><h1>Rule Engine</h1></div></div>
        <p>Loading rules...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Rule Engine</h1>
          <p className="page-subtitle">Configure automation thresholds and incident behavior.</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p>{success}</p> : null}

      <section className="card">
        <div className="toolbar">
          <label>
            <input
              type="checkbox"
              checked={Boolean(rules.autoApproveLowRiskListings)}
              onChange={(e) => setRules((prev) => ({ ...prev, autoApproveLowRiskListings: e.target.checked }))}
            />
            {' '}
            Auto-approve low-risk listings
          </label>
        </div>

        <div className="toolbar">
          <label style={{ minWidth: '260px' }}>Auto-resolve stale complaints (days)</label>
          <input
            type="number"
            min="0"
            max="365"
            value={rules.autoResolveStaleComplaintsDays}
            onChange={(e) =>
              setRules((prev) => ({ ...prev, autoResolveStaleComplaintsDays: e.target.value }))
            }
          />
        </div>

        <div className="toolbar">
          <label style={{ minWidth: '260px' }}>High-risk payment fail rate (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={rules.highRiskPaymentFailRatePct}
            onChange={(e) =>
              setRules((prev) => ({ ...prev, highRiskPaymentFailRatePct: e.target.value }))
            }
          />
        </div>

        <div className="toolbar">
          <label style={{ minWidth: '260px' }}>Payout delay threshold (days)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={rules.payoutDelayThresholdDays}
            onChange={(e) =>
              setRules((prev) => ({ ...prev, payoutDelayThresholdDays: e.target.value }))
            }
          />
        </div>

        <div className="toolbar">
          <label>
            <input
              type="checkbox"
              checked={Boolean(rules.broadcastOnCriticalIncident)}
              onChange={(e) => setRules((prev) => ({ ...prev, broadcastOnCriticalIncident: e.target.checked }))}
            />
            {' '}
            Broadcast alerts on critical incidents
          </label>
        </div>

        <div className="toolbar" style={{ marginTop: '0.6rem' }}>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </section>
    </div>
  );
}
