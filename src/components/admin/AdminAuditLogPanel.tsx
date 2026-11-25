import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import type { AuditLogItem } from '../../shared/types';
import {
  classifyAuditAction,
  filterAuditLogs,
  getAuditCategoryLabel,
  summarizeAuditLogs,
  type AuditCategory,
} from '../../utils/portalLogic';

interface AdminAuditLogPanelProps {
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  notify: (msg: string, isErr?: boolean) => void;
  onExportAuditCsv: () => void;
}

const CATEGORY_TABS: Array<{ key: AuditCategory | 'all'; label: string }> = [
  { key: 'all', label: 'Semua Aktivitas' },
  { key: 'auth', label: 'Login & Sesi' },
  { key: 'content', label: 'Pembaruan Konten' },
  { key: 'settings', label: 'Pengaturan' },
  { key: 'governance', label: 'Tata Kelola & Layanan' },
];

function getActionBadgeStyle(action: string): string {
  const upper = action.toUpperCase();
  if (upper.includes('FAILED') || upper.includes('RATE_LIMITED')) {
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900';
  }
  if (upper.includes('DELETE') || upper.includes('REVOKE')) {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
  }
  if (upper === 'LOGIN' || upper.includes('CREATE') || upper.includes('RESTORE') || upper.includes('UPLOAD')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
  }
  return 'bg-blue-50 text-[#1E3A8A] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';
}

export const AdminAuditLogPanel: React.FC<AdminAuditLogPanelProps> = ({
  apiFetch,
  notify,
  onExportAuditCsv,
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [category, setCategory] = useState<AuditCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiFetch<AuditLogItem[]>('/api/admin/audit-logs?limit=200');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat audit log.';
      setErrorMsg(msg);
      notify(msg, true);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notify]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const summary = useMemo(() => summarizeAuditLogs(logs), [logs]);
  const filteredLogs = useMemo(
    () => filterAuditLogs(logs, { category, query }),
    [logs, category, query]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Audit Log Aktivitas Admin</h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-1">
            Catatan kronologis pembaruan konten, percobaan masuk (berhasil/gagal), perubahan pengaturan, dan aktivitas RBAC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={onExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-medium hover:opacity-95"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(
          [
            ['all', 'Total Rekaman', summary.total],
            ['auth', 'Login & Sesi', summary.auth],
            ['content', 'Pembaruan Konten', summary.content],
            ['settings', 'Pengaturan', summary.settings],
            ['governance', 'Tata Kelola', summary.governance],
          ] as Array<[AuditCategory | 'all', string, number]>
        ).map(([key, label, count]) => {
          const isSelected = category === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`p-3.5 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-[#1E3A8A] bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500'
                  : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] text-stone-500 dark:text-slate-400">{label}</div>
              <div className="font-mono-tabular text-xl font-semibold mt-0.5">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Filter & Table Container */}
      <div className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter kategori audit log">
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(tab.key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#1E3A8A] text-white'
                      : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari aktor, aksi, detail, atau IP..."
              aria-label="Cari catatan audit log"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>
        </div>

        {errorMsg ? (
          <div className="p-4 rounded border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 dark:border-slate-800 text-stone-500 uppercase">
                <tr>
                  <th className="py-2.5 pr-4 whitespace-nowrap">Waktu (UTC)</th>
                  <th className="py-2.5 pr-4 whitespace-nowrap">Aktor</th>
                  <th className="py-2.5 pr-4 whitespace-nowrap">Aksi & Kategori</th>
                  <th className="py-2.5 pr-4 whitespace-nowrap">Entitas</th>
                  <th className="py-2.5 pr-4">Rincian Aktivitas</th>
                  <th className="py-2.5 whitespace-nowrap">Alamat IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-500">
                      Memuat riwayat aktivitas...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-500">
                      Tidak ada catatan audit log yang sesuai dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry) => {
                    const entryCategory = classifyAuditAction(entry.action);
                    return (
                      <tr key={entry.id} className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-4 font-mono-tabular text-stone-500 whitespace-nowrap">
                          {entry.created_at.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                          {entry.user_name}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border font-mono-tabular text-[11px] font-semibold ${getActionBadgeStyle(
                                entry.action
                              )}`}
                            >
                              {entry.action}
                            </span>
                            <span className="text-[10px] text-stone-500 dark:text-slate-400">
                              {getAuditCategoryLabel(entryCategory)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono-tabular text-stone-600 dark:text-slate-300 whitespace-nowrap">
                          {entry.entity_type}
                          {entry.entity_id ? ` #${entry.entity_id}` : ''}
                        </td>
                        <td className="py-2.5 pr-4 text-stone-700 dark:text-slate-200 max-w-md">
                          {entry.details}
                        </td>
                        <td className="py-2.5 font-mono-tabular text-stone-500 whitespace-nowrap">
                          {entry.ip_address || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
