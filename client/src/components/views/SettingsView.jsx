import { useState, useEffect } from 'react';
import { Download, Globe, RefreshCw, ShieldCheck, Trash2, User as UserIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { settingsApi } from '../../api/apiClient';
import { useAuth } from '../../hooks/useAuth';

function normalizeSettingsTab(tab) {
  if (['general', 'regional'].includes(tab)) return 'preferences';
  if (['appearance', 'about'].includes(tab)) return 'preferences';
  return ['profile', 'preferences', 'security', 'data_privacy'].includes(tab) ? tab : 'profile';
}

export default function SettingsView({ initialTab = 'profile' }) {
  const { logoutAll, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeTab = normalizeSettingsTab(searchParams.get('tab') || initialTab);
  const activeTab = routeTab;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Profile Form
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Preferences Form
  const [preferences, setPreferences] = useState({
    country: 'IN',
    baseCurrency: 'INR',
    timezone: 'IST',
    language: 'en',
    theme: 'light',
    weekStartsOn: 'Monday',
  });

  // Sessions
  const [sessions, setSessions] = useState([]);

  const loadSettings = () => {
    Promise.all([
      settingsApi.getSettings(),
      settingsApi.getSessions(),
    ])
      .then(([setRes, sesRes]) => {
        if (setRes.data?.success) {
          setProfile(setRes.data.data.profile);
          setPreferences(setRes.data.data.preferences);
        }
        if (sesRes.data?.success) {
          setSessions(sesRes.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await settingsApi.updatePreferences(preferences);
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const res = await settingsApi.exportAllData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finlab_complete_financial_data.json';
      a.click();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to deactivate your FinLab account? This action revokes all current sessions.')) {
      return;
    }
    try {
      await settingsApi.deleteAccount();
      alert('Your account has been deactivated.');
      window.location.href = '/login';
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'security', label: 'Security & Sessions', icon: ShieldCheck },
    { id: 'data_privacy', label: 'Data & Privacy', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Settings</h2>
        <p className="text-xs text-[var(--text-secondary)]">Manage your account profile, preferences and security</p>
      </div>

      {message && (
        <div className={`rounded-xl border p-3.5 text-xs font-semibold ${
          message.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
            : 'border-rose-500/20 bg-rose-500/10 text-rose-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] pb-2 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSearchParams({ tab: tab.id }, { replace: true });
              setMessage(null);
            }}
            className={`rounded-lg px-3.5 py-2 transition ${
              activeTab === tab.id
                ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* 1. Profile */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">Personal Information</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">Update your account name and contact details</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={profile.firstName}
                      onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={profile.lastName}
                      onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">
                    Email Address <span className="text-[10px] text-[var(--text-muted)]">(Immutable)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-[var(--text-secondary)] cursor-not-allowed opacity-80"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    For audit and security compliance, registered email addresses cannot be altered.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 555-0199"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. Preferences */}
          {activeTab === 'preferences' && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">Preferences & Regional Format</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">Manage your reporting currency, country, timezone, and week format</p>

              <form onSubmit={handleUpdatePreferences} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Base Currency</label>
                    <select
                      value={preferences.baseCurrency}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, baseCurrency: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Country</label>
                    <input
                      type="text"
                      value={preferences.country}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, country: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Timezone</label>
                    <input
                      type="text"
                      value={preferences.timezone}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, timezone: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Week Starts On</label>
                    <select
                      value={preferences.weekStartsOn}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, weekStartsOn: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. Security & Sessions */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Active Sessions</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Devices currently authenticated with your account</p>
                  </div>
                  <button
                    onClick={logoutAll}
                    className="rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"
                  >
                    Sign Out All Devices
                  </button>
                </div>

                <div className="divide-y divide-[var(--border)] text-xs">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3.5">
                      <div>
                        <div className="font-semibold text-[var(--text)]">
                          {s.userAgent} {s.isCurrent && <span className="text-[var(--primary)]">(Current Device)</span>}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          IP: {s.ip} • Active since {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="py-6 text-center text-xs text-[var(--text-muted)]">No active sessions were found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Data & Privacy */}
          {activeTab === 'data_privacy' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs hidden">
                <h3 className="text-base font-bold text-[var(--text)] mb-1">Export Complete Data</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Download a comprehensive JSON archive of all your accounts, transactions, budgets, goals and categories.
                </p>
                <button
                  onClick={handleExportAll}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95"
                >
                  <Download className="size-4" />
                  Download Complete Data (.json)
                </button>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-xs">
                <h3 className="text-base font-bold text-rose-600 mb-1">Danger Zone</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Deactivating your account immediately revokes all authenticated sessions across all devices.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
                >
                  <Trash2 className="size-4" />
                  Deactivate Account
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
