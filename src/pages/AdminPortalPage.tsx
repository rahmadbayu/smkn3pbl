import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  LayoutTemplate,
  LogOut,
  Menu,
  Printer,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { classifyAuditAction, getAuditCategoryLabel, getPreviewPresetForTab } from '../utils/portalLogic';
import { AdminAuthScreen } from '../components/admin/AdminAuthScreen';
import { AdminAuditLogPanel } from '../components/admin/AdminAuditLogPanel';
import {
  AdminLayoutSectionsPanel,
  AdminPostsPanel,
  AdminProgramsAndMediaPanel,
} from '../components/admin/AdminContentPanels';
import {
  AdminSecurityBackupPanel,
  AdminServicesAndPpidPanel,
  AdminSettingsPanel,
} from '../components/admin/AdminGovernancePanels';
import { SitePreviewPanel } from '../components/admin/SitePreviewPanel';
import type { AuditLogItem, PreviewTarget } from '../shared/types';

type AdminTab =
  | 'dashboard'
  | 'posts'
  | 'layout'
  | 'programs'
  | 'services'
  | 'settings'
  | 'preview'
  | 'audit'
  | 'security'
  | 'docs';

interface DashboardData {
  counts: {
    posts: number;
    pages: number;
    announcements: number;
    events: number;
    achievements: number;
    partners: number;
    media: number;
    users: number;
    pending_posts: number;
    pending_requests: number;
    open_complaints: number;
    total_visitors: number;
  };
  visitorSeries: Array<{ visit_date: string; total_views: number }>;
  popularPosts: Array<{ id: number; title: string; views_count: number; status: string }>;
  postsByCategory: Array<{ category: string; total: number }>;
  recentAudit: AuditLogItem[];
  lastBackup: { backup_name: string; created_at: string } | null;
  systemHealth: { databaseOk: boolean; dbSizeKb: number; uptimeSeconds: number; nodeVersion: string };
}

export const AdminPortalPage: React.FC = () => {
  const { authToken, authUser, logout } = usePortal();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [previousTab, setPreviousTab] = useState<AdminTab>('posts');
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>({ path: '/', label: 'Beranda Utama' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState<'7d' | '30d' | '365d'>('30d');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [toast, setToast] = useState<{ msg: string; isErr: boolean; previewTarget?: PreviewTarget } | null>(null);

  const openPreview = useCallback(
    (target?: PreviewTarget) => {
      if (activeTab !== 'preview') {
        setPreviousTab(activeTab);
      }
      if (target) {
        setPreviewTarget(target);
      }
      setActiveTab('preview');
      setSidebarOpen(false);
    },
    [activeTab]
  );

  const notify = useCallback((msg: string, isErr = false, nextPreview?: PreviewTarget) => {
    if (!isErr && nextPreview) {
      setPreviewTarget(nextPreview);
    }
    setToast({ msg, isErr, previewTarget: !isErr ? nextPreview : undefined });
    setTimeout(() => {
      setToast((current) => (current?.msg === msg ? null : current));
    }, nextPreview ? 8000 : 4000);
  }, []);

  const apiFetch = useCallback(
    async <T = unknown,>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Permintaan gagal.');
      return data as T;
    },
    [authToken]
  );

  useEffect(() => {
    if (!authToken || activeTab !== 'dashboard') return;
    apiFetch<DashboardData>(`/api/admin/dashboard?range=${range}`)
      .then(setDashboard)
      .catch((e) => notify(e.message, true));
  }, [authToken, activeTab, range, apiFetch, notify]);

  if (!authToken || !authUser) {
    return <AdminAuthScreen />;
  }

  const navItems: Array<{ key: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { key: 'dashboard', label: 'Dashboard Analitik', icon: BarChart3 },
    { key: 'posts', label: 'Berita & Workflow', icon: FileText },
    { key: 'layout', label: 'Beranda & Menu', icon: LayoutTemplate },
    { key: 'programs', label: 'Jurusan, BKK & Media', icon: BookOpen },
    { key: 'services', label: 'Layanan & PPID', icon: ClipboardList },
    { key: 'settings', label: 'Identitas & Statistik', icon: Settings },
    { key: 'preview', label: 'Preview Site', icon: Eye },
    { key: 'audit', label: 'Audit Log', icon: History },
    { key: 'security', label: 'RBAC, Audit & Backup', icon: Users },
    { key: 'docs', label: 'Dokumentasi Sistem', icon: Shield },
  ];

  const handleExportCsv = async (type: 'posts' | 'requests' | 'audit') => {
    try {
      const res = await fetch(`/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Gagal mengekspor CSV.');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smkn3-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Ekspor gagal.', true);
    }
  };

  const maxViews = Math.max(1, ...(dashboard?.visitorSeries.map((v) => v.total_views) || [1]));

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800 flex flex-col transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div className="font-display font-semibold text-base">CMS SMKN 3 Probolinggo</div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Tutup sidebar" className="lg:hidden p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Menu Administrator CMS" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'preview') {
                    openPreview(
                      activeTab !== 'preview' &&
                        activeTab !== 'dashboard' &&
                        activeTab !== 'audit' &&
                        activeTab !== 'security' &&
                        activeTab !== 'docs'
                        ? previewTarget
                        : { path: getPreviewPresetForTab(activeTab), label: 'Pratinjau Portal' }
                    );
                    return;
                  }
                  setPreviousTab(item.key);
                  setActiveTab(item.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 dark:border-slate-800 space-y-3 text-xs">
          <div>
            <div className="font-semibold truncate">{authUser.name}</div>
            <div className="text-stone-500 truncate">{authUser.role_name}</div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu administrator"
              className="lg:hidden p-2 rounded border border-stone-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              Portal Admin / <strong className="text-stone-900 dark:text-white">{navItems.find((n) => n.key === activeTab)?.label}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                openPreview(
                  previewTarget || { path: getPreviewPresetForTab(activeTab), label: 'Pratinjau Portal' }
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium whitespace-nowrap shrink-0 ${
                activeTab === 'preview'
                  ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                  : 'border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Preview Site</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cetak / PDF</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <span>Lihat Portal Publik</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {toast && (
          <div
            role="status"
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-md text-xs font-medium border flex flex-wrap items-center justify-between gap-3 ${
              toast.isErr
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-700 dark:text-red-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <span>{toast.msg}</span>
            {toast.previewTarget && (
              <button
                type="button"
                onClick={() => openPreview(toast.previewTarget)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-semibold hover:opacity-95 shrink-0"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Preview Site</span>
              </button>
            )}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-semibold">Ringkasan Operasional Portal</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter rentang analitik"
                    value={range}
                    onChange={(e) => setRange(e.target.value as '7d' | '30d' | '365d')}
                    className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">30 Hari Terakhir</option>
                    <option value="365d">1 Tahun Terakhir</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleExportCsv('posts')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV Berita
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCsv('audit')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV Audit
                  </button>
                </div>
              </div>

              {dashboard && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      ['Total Berita', dashboard.counts.posts],
                      ['Pengunjung Portal', dashboard.counts.total_visitors],
                      ['Permohonan Layanan', dashboard.counts.pending_requests],
                      ['Pengaduan Terbuka', dashboard.counts.open_complaints],
                      ['Mitra Industri', dashboard.counts.partners],
                      ['Pengguna CMS', dashboard.counts.users],
                    ].map(([label, val]) => (
                      <div key={label as string} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-stone-500">{label}</div>
                        <div className="font-mono-tabular text-2xl font-semibold mt-1">{Number(val).toLocaleString('id-ID')}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Visitor Bar Chart */}
                    <div className="lg:col-span-7 p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                      <h2 className="font-semibold text-sm">Statistik Kunjungan Portal (Basis Data Teragregasi)</h2>
                      <div className="h-44 flex items-end gap-2 pt-4">
                        {dashboard.visitorSeries.map((v) => (
                          <div key={v.visit_date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono-tabular text-stone-500">{v.total_views}</span>
                            <div
                              className="w-full rounded-t bg-[#1E3A8A] dark:bg-blue-500 min-h-[6px]"
                              style={{ height: `${Math.max(8, (v.total_views / maxViews) * 120)}px` }}
                            />
                            <span className="text-[10px] font-mono-tabular text-stone-400">{v.visit_date.slice(5)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* System Health & Popular Posts */}
                    <div className="lg:col-span-5 p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                      <h2 className="font-semibold text-sm">Kesehatan Sistem & Backup</h2>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-stone-100 dark:border-slate-800">
                          <span>Status Basis Data</span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {dashboard.systemHealth.databaseOk ? 'Aktif & Normal' : 'Gangguan'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-100 dark:border-slate-800">
                          <span>Ukuran Penyimpanan DB</span>
                          <span className="font-mono-tabular">{dashboard.systemHealth.dbSizeKb} KB</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-100 dark:border-slate-800">
                          <span>Backup Terakhir</span>
                          <span className="font-mono-tabular">
                            {dashboard.lastBackup ? dashboard.lastBackup.backup_name.slice(0, 22) : 'Belum dibuat'}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-xs pt-2 uppercase text-stone-500">Berita Terpopuler</h3>
                      <div className="space-y-1.5 text-xs">
                        {dashboard.popularPosts.map((p) => (
                          <div key={p.id} className="flex justify-between gap-2">
                            <span className="truncate">{p.title}</span>
                            <span className="font-mono-tabular text-stone-500 shrink-0">{p.views_count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity & Audit Feed */}
                  <div className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-sm">Riwayat Aktivitas & Audit Log Terbaru</h2>
                        <p className="text-xs text-stone-500 dark:text-slate-400">
                          Pembaruan konten, percobaan masuk, dan perubahan pengaturan terakhir.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('audit')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
                      >
                        <History className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Buka Audit Log Lengkap</span>
                      </button>
                    </div>

                    {dashboard.recentAudit.length === 0 ? (
                      <p className="text-xs text-stone-500 py-2">Belum ada aktivitas tercatat atau Anda tidak memiliki izin melihat audit log.</p>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                        {dashboard.recentAudit.map((entry) => {
                          const cat = classifyAuditAction(entry.action);
                          const isFailure = entry.action.includes('FAILED') || entry.action.includes('RATE_LIMITED');
                          return (
                            <div key={entry.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded border font-mono-tabular text-[11px] font-semibold ${
                                    isFailure
                                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                                      : 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {entry.action}
                                </span>
                                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                                  {getAuditCategoryLabel(cat)}
                                </span>
                                <span className="font-medium">{entry.user_name}</span>
                                <span className="text-stone-600 dark:text-slate-300 truncate">{entry.details}</span>
                              </div>
                              <div className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                                {entry.ip_address ? `${entry.ip_address} · ` : ''}
                                {entry.created_at.slice(0, 19).replace('T', ' ')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'posts' && <AdminPostsPanel apiFetch={apiFetch} notify={notify} onOpenPreview={openPreview} />}
          {activeTab === 'layout' && <AdminLayoutSectionsPanel apiFetch={apiFetch} notify={notify} />}
          {activeTab === 'programs' && <AdminProgramsAndMediaPanel apiFetch={apiFetch} notify={notify} />}
          {activeTab === 'services' && <AdminServicesAndPpidPanel apiFetch={apiFetch} notify={notify} />}
          {activeTab === 'settings' && <AdminSettingsPanel apiFetch={apiFetch} notify={notify} />}
          {activeTab === 'preview' && (
            <SitePreviewPanel
              target={previewTarget}
              previousTabLabel={navItems.find((n) => n.key === previousTab)?.label}
              onBackToEditor={() => setActiveTab(previousTab === 'preview' ? 'posts' : previousTab)}
            />
          )}
          {activeTab === 'audit' && (
            <AdminAuditLogPanel
              apiFetch={apiFetch}
              notify={notify}
              onExportAuditCsv={() => void handleExportCsv('audit')}
            />
          )}
          {activeTab === 'security' && <AdminSecurityBackupPanel apiFetch={apiFetch} notify={notify} />}

          {activeTab === 'docs' && (
            <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 text-sm">
              <h1 className="font-display text-2xl font-semibold">Dokumentasi Teknis, SRS, ERD, SOP & Evaluasi</h1>
              <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
                Seluruh artefak dokumentasi lengkap (SRS, Sitemap, User Flow, Arsitektur, ERD Relasional 32+ tabel, API Docs, Panduan Administrator & Penulis Berita, SOP Backup & Keamanan, Test Cases, Matriks Evaluasi, Roadmap, dan Changelog) tersedia di repositori pada berkas <code className="font-mono-tabular">README.md</code> dan <code className="font-mono-tabular">docs/PORTAL_DOCUMENTATION.md</code>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded border border-stone-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-semibold">Keamanan & Privasi Terverifikasi</div>
                  <p className="text-stone-600 dark:text-slate-300">
                    Hashing kata sandi menggunakan Node crypto.scryptSync dengan salt acak per pengguna, token sesi ditandatangani HMAC-SHA256 dengan pencabutan sesi aktif, otorisasi RBAC 10 peran pada level API backend, pelacakan tiket layanan dilindungi kode verifikasi, dan dokumen PPID dipisahkan berdasarkan klasifikasi publik/internal.
                  </p>
                </div>
                <div className="p-4 rounded border border-stone-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-semibold">Arsitektur & Pemeliharaan</div>
                  <p className="text-stone-600 dark:text-slate-300">
                    React 19 + TypeScript + Tailwind CSS v4 + Express REST API + SQLite relasional (node:sqlite) tanpa ketergantungan layanan berbayar eksternal. Mendukung migrasi, seeder otomatis, ekspor laporan CSV/PDF, dan backup JSON tervalidasi.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
