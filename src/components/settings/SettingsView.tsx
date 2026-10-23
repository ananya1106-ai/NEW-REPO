import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Shield,
  RotateCcw,
  Download,
  Upload,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Server,
  Sliders,
  Database,
  ExternalLink,
  Key,
  Save,
  Trash2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    resetDemoData,
    batches,
    dispatches,
    auditLogs,
    addToast,
    firebaseStatus,
    runConnectionTest,
    saveWebConfig,
    clearWebConfig,
  } = useApp();

  const [inputApiKey, setInputApiKey] = useState(() => {
    try {
      const cfg = localStorage.getItem('smartpds_firebase_web_config');
      if (cfg) return JSON.parse(cfg).apiKey || '';
    } catch {}
    return '';
  });
  const [inputAppId, setInputAppId] = useState(() => {
    try {
      const cfg = localStorage.getItem('smartpds_firebase_web_config');
      if (cfg) return JSON.parse(cfg).appId || '';
    } catch {}
    return '';
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputApiKey.trim() || !inputAppId.trim()) {
      addToast('error', 'Missing Information', 'Both Web API Key and Web App ID are required.');
      return;
    }
    setIsSavingConfig(true);
    try {
      await saveWebConfig({
        apiKey: inputApiKey.trim(),
        appId: inputAppId.trim(),
        authDomain: 'smartipds.firebaseapp.com',
        storageBucket: 'smartipds.firebasestorage.app',
      });
      setShowConfigForm(false);
    } catch (err: any) {
      addToast('error', 'Configuration Error', err?.message || 'Failed to save Firebase config');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleClearConfig = () => {
    clearWebConfig();
    setInputApiKey('');
    setInputAppId('');
  };

  const handleTestDatabaseConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const res = await runConnectionTest();
      if (res.isConnected) {
        addToast('success', 'Firestore Online', 'Connection to project smartipds verified successfully.');
      } else if (res.isDatabaseMissing) {
        addToast(
          'warning',
          'Database Not Created',
          'The database (default) does not exist for project smartipds.'
        );
      } else {
        addToast('info', 'Diagnostic Checked', res.error || 'Server responded.');
      }
    } catch (e: any) {
      addToast('error', 'Test Failed', e?.message || 'Error running connection test.');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      facility: 'FCI District Base Depot #4, Hubballi',
      batches,
      dispatches,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartpds_snapshot_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Snapshot Exported', 'Warehouse state downloaded as JSON file.');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.batches && Array.isArray(json.batches)) {
          localStorage.setItem('smartpds_v1_batches', JSON.stringify(json.batches));
          if (json.dispatches) localStorage.setItem('smartpds_v1_dispatches', JSON.stringify(json.dispatches));
          if (json.auditLogs) localStorage.setItem('smartpds_v1_audit_logs', JSON.stringify(json.auditLogs));
          window.location.reload();
        } else {
          addToast('error', 'Invalid File Format', 'File does not contain valid SmartPDS warehouse records.');
        }
      } catch (err) {
        addToast('error', 'Import Failed', 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const permissionsMatrix: Array<{
    feature: string;
    description: string;
    admin: boolean;
    operator: boolean;
    dealer: boolean;
  }> = [
    {
      feature: 'Record Inward Stock Receipt',
      description: 'Enter new grain consignments, moisture readings, and bay assignments',
      admin: true,
      operator: true,
      dealer: false,
    },
    {
      feature: 'Execute FIFO Dispatch',
      description: 'Compute oldest-first batch draw and issue digital gate passes',
      admin: true,
      operator: true,
      dealer: false,
    },
    {
      feature: 'Override Quarantine / Damaged Status',
      description: 'Lock batches failing moisture tests or release re-inspected grain',
      admin: true,
      operator: true,
      dealer: false,
    },
    {
      feature: 'Edit Storage Bay / Fumigation Notes',
      description: 'Update physical stack identifiers and pest management metadata',
      admin: true,
      operator: true,
      dealer: false,
    },
    {
      feature: 'Inspect Delivery & Digital Challans',
      description: 'Track vehicle transit status and confirm receipt at Fair Price Shop',
      admin: true,
      operator: true,
      dealer: true,
    },
    {
      feature: 'Inspect System Audit Logs',
      description: 'Review timestamped transaction records and operator history',
      admin: true,
      operator: true,
      dealer: false,
    },
    {
      feature: 'Reset Demo Dataset',
      description: 'Restore initial fictional Indian PDS test cases',
      admin: true,
      operator: false,
      dealer: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-[#344054] dark:text-[#F1F5F9] tracking-tight">
          System Roles & Prototype Settings
        </h2>
        <p className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-0.5">
          Simulated user roles, permission boundaries, and demo dataset lifecycle
        </p>
      </div>

      {/* Security Notice Banner */}
      <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Role-Based Access Governance:</span> Operations in SmartPDS are strictly partitioned between depot administration, godown operations, and fair price distribution network. Dispatches and inward receipts are restricted to depot operators and administrators.
        </div>
      </div>

      {/* Role Switcher Section */}
      <div className="p-5 bg-white dark:bg-[#151C28] rounded-xl border border-[#E7E2DF] dark:border-[#293445] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DF] dark:border-[#293445]">
          <span className="text-xs font-bold text-[#344054] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#702D3B] dark:text-[#E4B34F]" />
            <span>Active Simulated Role</span>
          </span>
          <span className="text-[11px] text-[#702D3B] dark:text-[#E4B34F] bg-[#FAF2F4] dark:bg-[#3B1020]/60 px-2 py-0.5 rounded font-medium border border-[#E7E2DF] dark:border-[#801B3A]/50">
            Current: {currentRole}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Administrator */}
          <div
            onClick={() => setCurrentRole('Administrator')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              currentRole === 'Administrator'
                ? 'border-[#702D3B] dark:border-[#801B3A] bg-[#FAF2F4] dark:bg-[#3B1020]/40 shadow-xs ring-1 ring-[#702D3B] dark:ring-[#801B3A]'
                : 'border-[#E7E2DF] dark:border-[#293445] hover:border-[#C5A46D] dark:hover:border-[#E4B34F] bg-white dark:bg-[#111827]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9]">Administrator</span>
              {currentRole === 'Administrator' && (
                <span className="text-[10px] bg-[#702D3B] dark:bg-[#801B3A] text-white px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-1">Simulated User: Sunil K. Verma</div>
            <p className="text-xs text-[#344054]/90 dark:text-[#CBD5E1] mt-3 leading-relaxed">
              Full administrative governance across personnel clearances, depot configuration, approval rules, and audit trails.
            </p>
          </div>

          {/* Warehouse Operator */}
          <div
            onClick={() => setCurrentRole('Warehouse Operator')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              currentRole === 'Warehouse Operator'
                ? 'border-[#702D3B] dark:border-[#801B3A] bg-[#FAF2F4] dark:bg-[#3B1020]/40 shadow-xs ring-1 ring-[#702D3B] dark:ring-[#801B3A]'
                : 'border-[#E7E2DF] dark:border-[#293445] hover:border-[#C5A46D] dark:hover:border-[#E4B34F] bg-white dark:bg-[#111827]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9]">Warehouse Operator</span>
              {currentRole === 'Warehouse Operator' && (
                <span className="text-[10px] bg-[#702D3B] dark:bg-[#801B3A] text-white px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-1">Simulated User: Rajesh V.</div>
            <p className="text-xs text-[#344054]/90 dark:text-[#CBD5E1] mt-3 leading-relaxed">
              Operational godown and stack handling. Records inward stock receipts, manages bay allocations, and executes FIFO dispatches.
            </p>
          </div>

          {/* Ration Shop Dealer */}
          <div
            onClick={() => setCurrentRole('Ration Shop Dealer')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              currentRole === 'Ration Shop Dealer'
                ? 'border-[#702D3B] dark:border-[#801B3A] bg-[#FAF2F4] dark:bg-[#3B1020]/40 shadow-xs ring-1 ring-[#702D3B] dark:ring-[#801B3A]'
                : 'border-[#E7E2DF] dark:border-[#293445] hover:border-[#C5A46D] dark:hover:border-[#E4B34F] bg-white dark:bg-[#111827]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9]">Ration Shop Dealer</span>
              {currentRole === 'Ration Shop Dealer' && (
                <span className="text-[10px] bg-[#702D3B] dark:bg-[#801B3A] text-white px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-1">Simulated User: Shankar Gowda</div>
            <p className="text-xs text-[#344054]/90 dark:text-[#CBD5E1] mt-3 leading-relaxed">
              Fair Price Shop network recipient. Inspects incoming truck deliveries, reviews digital challans, and logs transit discrepancies.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Comparison Matrix */}
      <div className="p-5 bg-white dark:bg-[#151C28] rounded-xl border border-[#E7E2DF] dark:border-[#293445] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DF] dark:border-[#293445]">
          <span className="text-xs font-bold text-[#344054] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#702D3B] dark:text-[#E4B34F]" />
            <span>Role Permissions Matrix</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] dark:bg-[#111827] border-b border-[#E7E2DF] dark:border-[#293445] text-[#707887] dark:text-[#A1AAB9] font-semibold">
              <tr>
                <th className="py-2.5 px-3">System Operation</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Administrator</th>
                <th className="py-2.5 px-3 text-center">Warehouse Operator</th>
                <th className="py-2.5 px-3 text-center">Ration Shop Dealer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DF] dark:divide-[#293445]">
              {permissionsMatrix.map((item) => (
                <tr key={item.feature} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#1E293B]/60">
                  <td className="py-2.5 px-3 font-semibold text-[#344054] dark:text-[#F1F5F9]">{item.feature}</td>
                  <td className="py-2.5 px-3 text-[#707887] dark:text-[#A1AAB9]">{item.description}</td>
                  <td className="py-2.5 px-3 text-center">
                    {item.admin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#E7E2DF] dark:text-[#293445] mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.operator ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#E7E2DF] dark:text-[#293445] mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.dealer ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#E7E2DF] dark:text-[#293445] mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloud Firestore Infrastructure & Setup Status */}
      <div className="p-5 bg-white dark:bg-[#151C28] rounded-xl border border-[#E7E2DF] dark:border-[#293445] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DF] dark:border-[#293445]">
          <span className="text-xs font-bold text-[#344054] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-[#702D3B] dark:text-[#C4B5FD]" />
            <span>Cloud Firestore Database Infrastructure</span>
          </span>
          <div className="flex items-center gap-2">
            {firebaseStatus.isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Online & Connected</span>
              </span>
            ) : firebaseStatus.isDatabaseMissing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Database Not Created</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-stone-500" />
                <span>Configuration Incomplete</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#FAF7F2] dark:bg-[#111827] rounded-lg border border-[#E7E2DF] dark:border-[#293445]">
            <span className="text-[#707887] dark:text-[#A1AAB9] block text-[11px]">Firebase Project ID</span>
            <span className="font-mono font-bold text-[#344054] dark:text-[#F1F5F9] mt-0.5 block">{firebaseStatus.projectId}</span>
          </div>
          <div className="p-3 bg-[#FAF7F2] dark:bg-[#111827] rounded-lg border border-[#E7E2DF] dark:border-[#293445]">
            <span className="text-[#707887] dark:text-[#A1AAB9] block text-[11px]">Target Database Instance</span>
            <span className="font-mono font-bold text-[#344054] dark:text-[#F1F5F9] mt-0.5 block">(default)</span>
          </div>
          <div className="p-3 bg-[#FAF7F2] dark:bg-[#111827] rounded-lg border border-[#E7E2DF] dark:border-[#293445]">
            <span className="text-[#707887] dark:text-[#A1AAB9] block text-[11px]">Auth Domain</span>
            <span className="font-mono text-[#344054] dark:text-[#CBD5E1] mt-0.5 block truncate">{firebaseStatus.authDomain}</span>
          </div>
        </div>

        {/* Firebase Web App Configuration Card */}
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#111827] rounded-xl border border-[#E7E2DF] dark:border-[#293445] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#702D3B] dark:text-[#C4B5FD]" />
              <h4 className="text-xs font-bold text-[#344054] dark:text-[#F1F5F9]">
                Firebase Web App Credentials (Project: {firebaseStatus.projectId})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigForm((v) => !v)}
              className="text-xs font-semibold text-[#702D3B] dark:text-[#E4B34F] hover:underline cursor-pointer"
            >
              {showConfigForm ? 'Close Editor' : 'Edit Web Credentials'}
            </button>
          </div>

          <p className="text-[11px] text-[#707887] dark:text-[#A1AAB9] leading-relaxed">
            Configure your Firebase Web App API Key and App ID to enable authoritative persistence for batch intakes, FIFO allocations, dispatches, digital challans, and audit trails directly in Cloud Firestore.
          </p>

          {showConfigForm ? (
            <form onSubmit={handleSaveConfig} className="space-y-3 pt-2 border-t border-[#E7E2DF] dark:border-[#293445]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#344054] dark:text-[#F1F5F9] mb-1">
                    Firebase Web API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-[#E7E2DF] dark:border-[#293445] rounded-lg text-[#344054] dark:text-[#F1F5F9] font-mono text-xs focus:border-[#702D3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#344054] dark:text-[#F1F5F9] mb-1">
                    Firebase Web App ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inputAppId}
                    onChange={(e) => setInputAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-[#E7E2DF] dark:border-[#293445] rounded-lg text-[#344054] dark:text-[#F1F5F9] font-mono text-xs focus:border-[#702D3B] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Credentials</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#707887] dark:text-[#A1AAB9] hover:bg-[#FAF7F2] dark:hover:bg-[#111827] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#702D3B] hover:bg-[#54212D] dark:bg-[#801B3A] dark:hover:bg-[#9E2248] rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Saving & Testing...' : 'Save & Connect'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E7E2DF] dark:border-[#293445]">
              <span className="text-[11px] text-[#707887] dark:text-[#A1AAB9] font-mono">
                {firebaseStatus.isConfigured ? '✓ Credentials configured in environment / browser' : '⚠️ Missing Web API Key or App ID'}
              </span>
              <button
                type="button"
                onClick={() => setShowConfigForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#702D3B] dark:text-[#E4B34F] bg-white dark:bg-[#151C28] border border-[#E7E2DF] dark:border-[#293445] rounded-lg hover:bg-[#FAF2F4] dark:hover:bg-[#3B1020]/40 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure Keys</span>
              </button>
            </div>
          )}
        </div>

        {firebaseStatus.isDatabaseMissing && (
          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-100">
                  Setup Action Required: Default Cloud Firestore Database Does Not Exist
                </h4>
                <p className="mt-1 leading-relaxed text-[#707887] dark:text-amber-300/90 text-[11px]">
                  Google Cloud returned <code className="font-mono font-bold">404 NOT_FOUND</code>: The database <code className="font-mono font-bold">(default)</code> has not yet been initialized for project <strong className="font-mono">{firebaseStatus.projectId}</strong>. In compliance with statutory PDS security requirements, dispatches and ledger entries cannot be issued until persistent storage is provisioned.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/70 dark:bg-black/30 rounded-lg border border-amber-500/20 text-[11px] space-y-1 font-mono text-[#344054] dark:text-[#CBD5E1]">
              <div className="font-sans font-bold text-amber-900 dark:text-amber-200 mb-1">Direct Setup Steps:</div>
              <div>1. Open: https://console.firebase.google.com/project/{firebaseStatus.projectId}/firestore</div>
              <div>2. Click &quot;Create database&quot;</div>
              <div>3. Select Production Mode</div>
              <div>4. Select Cloud Firestore Location (e.g., asia-south1 or us-central1)</div>
              <div>5. Click &quot;Create&quot; / &quot;Enable&quot;</div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a
                href={firebaseStatus.setupUrl || `https://console.firebase.google.com/project/${firebaseStatus.projectId}/firestore`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Firebase Console</span>
              </a>
              <button
                type="button"
                onClick={handleTestDatabaseConnection}
                disabled={isCheckingConnection}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                <span>{isCheckingConnection ? 'Testing Connection...' : 'Test & Reconnect Now'}</span>
              </button>
            </div>
          </div>
        )}

        {!firebaseStatus.isDatabaseMissing && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#707887] dark:text-[#A1AAB9]">
              Diagnostic Health: {firebaseStatus.isConnected ? 'Full read/write capability verified' : firebaseStatus.error || 'Awaiting test'}
            </span>
            <button
              type="button"
              onClick={handleTestDatabaseConnection}
              disabled={isCheckingConnection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344054] dark:text-[#F1F5F9] bg-[#FAF7F2] dark:bg-[#111827] hover:bg-[#FAF2F4] dark:hover:bg-[#1E293B] border border-[#E7E2DF] dark:border-[#293445] rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span>{isCheckingConnection ? 'Checking...' : 'Ping Firestore Connection'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Dataset & Demo Lifecycle Controls */}
      <div className="p-5 bg-white dark:bg-[#151C28] rounded-xl border border-[#E7E2DF] dark:border-[#293445] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DF] dark:border-[#293445]">
          <span className="text-xs font-bold text-[#344054] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-[#702D3B] dark:text-[#E4B34F]" />
            <span>Demo Data Lifecycle Controls</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reset Demo Data */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#111827] border border-[#E7E2DF] dark:border-[#293445] flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Reset Demo State</span>
              </h4>
              <p className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-1 leading-relaxed">
                Clears localStorage and restores initial batches (including older B001 with 100 bags and B002 with 150 bags, plus quarantined stock).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E7E2DF] dark:border-[#293445]">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2 px-3 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors text-center"
              >
                Restore Pristine Hackathon Dataset
              </button>
            </div>
          </div>

          {/* Backup / Restore JSON */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#111827] border border-[#E7E2DF] dark:border-[#293445] flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9] flex items-center gap-2">
                <Download className="w-4 h-4 text-[#702D3B] dark:text-[#E4B34F]" />
                <span>Export / Import Warehouse JSON</span>
              </h4>
              <p className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-1 leading-relaxed">
                Download the current batch registers, dispatches, and audit trail as a portable JSON snapshot.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E7E2DF] dark:border-[#293445] flex items-center gap-2">
              <button
                onClick={handleExportData}
                className="flex-1 py-2 px-3 text-xs font-semibold text-[#344054] dark:text-[#F1F5F9] bg-white dark:bg-[#151C28] hover:bg-[#FAF2F4] dark:hover:bg-[#3B1020]/40 border border-[#E7E2DF] dark:border-[#293445] rounded-lg transition-colors text-center"
              >
                Export JSON
              </button>
              <label className="flex-1 py-2 px-3 text-xs font-semibold text-[#344054] dark:text-[#F1F5F9] bg-white dark:bg-[#151C28] hover:bg-[#FAF2F4] dark:hover:bg-[#3B1020]/40 border border-[#E7E2DF] dark:border-[#293445] rounded-lg transition-colors text-center cursor-pointer">
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#151C28] rounded-2xl border border-[#E7E2DF] dark:border-[#293445] shadow-2xl p-6">
            <h3 className="text-sm font-bold text-[#344054] dark:text-[#F1F5F9]">Confirm Warehouse State Reset</h3>
            <p className="text-xs text-[#707887] dark:text-[#A1AAB9] mt-2 leading-relaxed">
              This will overwrite all active batch tallies, newly added inward receipts, and generated challans with the default demonstration data.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-[#707887] dark:text-[#A1AAB9] hover:bg-[#FAF7F2] dark:hover:bg-[#111827] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDemoData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#702D3B] hover:bg-[#54212D] dark:bg-[#801B3A] dark:hover:bg-[#9E2248] rounded-lg shadow-xs transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
