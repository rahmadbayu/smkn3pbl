import React, { useEffect, useState } from 'react';
import { Download, Plus, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { formatIndonesianDate } from '../../utils/portalLogic';
import type {
  AdminUser,
  AuditLogItem,
  ComplaintItem,
  DocumentClassification,
  DocumentItem,
  PreviewTarget,
  RoleDefinition,
  SchoolStat,
  ServiceRequest,
  ServiceRequestStatus,
} from '../../shared/types';

interface AdminFetchHelper {
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  notify: (msg: string, isErr?: boolean, previewTarget?: PreviewTarget) => void;
}

export const AdminServicesAndPpidPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [staffNote, setStaffNote] = useState<Record<number, string>>({});

  const [docTitle, setDocTitle] = useState('');
  const [docClass, setDocClass] = useState<DocumentClassification>('publik');
  const [docGroup, setDocGroup] = useState('berkala');

  const load = () => {
    apiFetch<ServiceRequest[]>('/api/admin/service-requests').then(setRequests).catch(() => {});
    apiFetch<ComplaintItem[]>('/api/admin/complaints').then(setComplaints).catch(() => {});
    apiFetch<DocumentItem[]>('/api/admin/documents').then(setDocs).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const updateReqStatus = async (id: number, nextStatus: ServiceRequestStatus) => {
    try {
      await apiFetch(`/api/admin/service-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, staff_note: staffNote[id] || 'Diproses oleh petugas layanan.' }),
      });
      notify(`Status tiket diperbarui menjadi ${nextStatus}.`, false, { path: '/layanan-digital', label: 'Layanan Digital' });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui tiket.', true);
    }
  };

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/documents', {
        method: 'POST',
        body: JSON.stringify({ title: docTitle, classification: docClass, ppid_group: docGroup, is_approved: true }),
      });
      setDocTitle('');
      load();
      notify('Dokumen berhasil didaftarkan.', false, { path: '/informasi-publik', label: 'Informasi Publik (PPID)' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah dokumen.', true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Service Requests */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-xl font-semibold">Antrean Layanan Administrasi Digital</h2>
        {requests.length === 0 ? (
          <p className="text-xs text-stone-500">Belum ada permohonan layanan masuk.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="p-4 rounded border border-stone-200 dark:border-slate-800 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono-tabular font-semibold text-xs text-[#1E3A8A] dark:text-blue-400">{r.ticket_number}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="font-semibold">{r.service_name}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded border border-stone-300 dark:border-slate-700">
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-stone-600 dark:text-slate-300">
                  Pemohon: {r.applicant_name} ({r.applicant_role}) · {r.applicant_email} · {r.applicant_phone}
                </div>
                <p className="text-xs text-stone-700 dark:text-slate-300">{r.details}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Catatan petugas..."
                    value={staffNote[r.id] ?? r.staff_note}
                    onChange={(e) => setStaffNote((s) => ({ ...s, [r.id]: e.target.value }))}
                    className="flex-1 min-w-[200px] px-2.5 py-1 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                  />
                  {r.status === 'diajukan' && (
                    <button type="button" onClick={() => updateReqStatus(r.id, 'diverifikasi')} className="px-2.5 py-1 text-xs rounded bg-[#1E3A8A] text-white">
                      Verifikasi
                    </button>
                  )}
                  {r.status === 'diverifikasi' && (
                    <button type="button" onClick={() => updateReqStatus(r.id, 'diproses')} className="px-2.5 py-1 text-xs rounded bg-[#1E3A8A] text-white">
                      Proses
                    </button>
                  )}
                  {r.status === 'diproses' && (
                    <button type="button" onClick={() => updateReqStatus(r.id, 'selesai')} className="px-2.5 py-1 text-xs rounded bg-emerald-700 text-white">
                      Selesaikan
                    </button>
                  )}
                  {r.status !== 'selesai' && r.status !== 'ditolak' && (
                    <button type="button" onClick={() => updateReqStatus(r.id, 'ditolak')} className="px-2.5 py-1 text-xs rounded border border-red-300 text-red-700">
                      Tolak
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaints */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <h2 className="font-display text-xl font-semibold">Pengaduan Masyarakat ({complaints.length})</h2>
        {complaints.length === 0 ? (
          <p className="text-xs text-stone-500">Belum ada pengaduan masyarakat masuk.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {complaints.map((c) => (
              <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.ticket_number} · {c.subject}</div>
                  <div className="text-stone-500">{c.reporter_name} ({c.category}) — {c.description}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/complaints/${c.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'selesai', resolution_note: 'Telah ditindaklanjuti.' }),
                    });
                    load();
                    notify('Status pengaduan diselesaikan.');
                  }}
                  className="px-3 py-1 rounded border border-stone-300 dark:border-slate-700"
                >
                  {c.status === 'selesai' ? 'Selesai' : 'Tandai Selesai'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PPID & Document Classification */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-xl font-semibold">Manajemen Dokumen & Klasifikasi PPID</h2>
        <form onSubmit={addDocument} className="flex flex-wrap gap-2">
          <input required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Judul dokumen resmi..." className="flex-1 min-w-[220px] px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          <select value={docClass} onChange={(e) => setDocClass(e.target.value as DocumentClassification)} className="px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
            <option value="publik" className="dark:bg-slate-900">Publik (Tampil di Web)</option>
            <option value="internal" className="dark:bg-slate-900">Internal (Terlindungi)</option>
            <option value="terbatas" className="dark:bg-slate-900">Terbatas</option>
            <option value="rahasia" className="dark:bg-slate-900">Rahasia</option>
          </select>
          <select value={docGroup} onChange={(e) => setDocGroup(e.target.value)} className="px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
            <option value="berkala" className="dark:bg-slate-900">Berkala</option>
            <option value="serta_merta" className="dark:bg-slate-900">Serta-Merta</option>
            <option value="setiap_saat" className="dark:bg-slate-900">Setiap Saat</option>
            <option value="sop" className="dark:bg-slate-900">SOP Pelayanan</option>
            <option value="mutu" className="dark:bg-slate-900">Dokumen Mutu</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium">Simpan Dokumen</button>
        </form>
        <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
          {docs.map((d) => (
            <div key={d.id} className="py-2 flex items-center justify-between gap-2">
              <div>
                <span className="font-semibold">{d.title}</span>
                <span className="text-stone-500 ml-2">[{d.classification.toUpperCase()} · {d.ppid_group}]</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/api/admin/documents/${d.id}`, { method: 'DELETE' });
                  load();
                }}
                aria-label={`Hapus dokumen ${d.title}`}
                className="text-red-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminSettingsPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify }) => {
  const { settings, refreshBootstrap } = usePortal();
  const [schoolName, setSchoolName] = useState(settings?.school_name || '');
  const [sloganId, setSloganId] = useState(settings?.slogan_id || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [principalName, setPrincipalName] = useState(settings?.principal_name || '');
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color || '#1E3A8A');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(Boolean(settings?.ai_enabled));
  const [stats, setStats] = useState<SchoolStat[]>([]);

  useEffect(() => {
    if (settings) {
      setSchoolName(settings.school_name);
      setSloganId(settings.slogan_id);
      setAddress(settings.address);
      setPhone(settings.phone);
      setEmail(settings.email);
      setPrincipalName(settings.principal_name);
      setPrimaryColor(settings.primary_color);
      setLogoUrl(settings.logo_url || '');
      setAiEnabled(settings.ai_enabled);
    }
    apiFetch<SchoolStat[]>('/api/admin/stats').then(setStats).catch(() => {});
  }, [settings]);

  const handleUploadLogo = async (file: File | null) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'logo');
      const res = await apiFetch<{ url: string }>('/api/admin/media/upload', {
        method: 'POST',
        body: fd,
      });
      setLogoUrl(res.url);
      notify('Logo header diunggah. Klik "Simpan Pengaturan Sekolah" untuk menerapkan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengunggah logo.', true);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          school_name: schoolName,
          slogan_id: sloganId,
          address,
          phone,
          email,
          principal_name: principalName,
          primary_color: primaryColor,
          logo_url: logoUrl,
          ai_enabled: aiEnabled,
        }),
      });
      await refreshBootstrap();
      notify('Identitas sekolah dan pengaturan tampilan berhasil diperbarui.', false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', true);
    }
  };

  const handleSaveStats = async () => {
    try {
      await apiFetch('/api/admin/stats', {
        method: 'PUT',
        body: JSON.stringify({ stats }),
      });
      await refreshBootstrap();
      notify('Statistik kelembagaan diperbarui.', false, { path: '/#statistik', label: 'Statistik Sekolah' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan statistik.', true);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSaveSettings} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-xl font-semibold">Identitas Sekolah, Warna Tema & Modul AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Nama Sekolah</label>
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Kepala Sekolah</label>
            <input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Telepon Resmi</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Email Resmi</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Slogan Sekolah</label>
            <input value={sloganId} onChange={(e) => setSloganId(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Alamat Lengkap</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Warna Identitas Utama (Hex)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border border-stone-300" />
              <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular" />
            </div>
          </div>
          <div className="md:col-span-2 p-4 rounded border border-stone-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-medium">Logo Header Sekolah (Bilah Navigasi Atas)</label>
            <div className="flex flex-wrap items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Pratinjau Logo Header" className="w-10 h-10 rounded object-cover border border-stone-300 dark:border-slate-700 bg-white" />
              ) : (
                <span className="w-10 h-10 rounded flex items-center justify-center text-white font-display font-bold text-sm" style={{ backgroundColor: primaryColor }}>
                  S3
                </span>
              )}
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Kosongkan untuk monogram S3, atau unggah gambar / isi URL..."
                className="flex-1 min-w-[220px] px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular text-xs"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-800">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{logoUploading ? 'Mengunggah...' : 'Unggah Logo'}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  disabled={logoUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    e.target.value = '';
                    void handleUploadLogo(file);
                  }}
                  className="sr-only"
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  Reset ke Monogram
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
              <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
              <span>Aktifkan Modul AI (Asisten Redaksi & Chatbot Info Publik)</span>
            </label>
          </div>
        </div>
        <button type="submit" className="px-5 py-2.5 rounded bg-[#1E3A8A] text-white text-sm font-medium">
          Simpan Pengaturan Sekolah
        </button>
      </form>

      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Statistik Kelembagaan</h2>
          <button type="button" onClick={handleSaveStats} className="px-4 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium">
            Simpan Statistik
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((st, idx) => (
            <div key={st.id} className="p-3 rounded border border-stone-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-medium">{st.label_id}</div>
              <input
                type="number"
                value={st.value}
                onChange={(e) =>
                  setStats((prev) => prev.map((item, i) => (i === idx ? { ...item, value: Number(e.target.value) } : item)))
                }
                className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminSecurityBackupPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; user_name: string; email: string; ip_address: string; created_at: string }>>([]);
  const [audits, setAudits] = useState<AuditLogItem[]>([]);
  const [backups, setBackups] = useState<Array<{ id: number; backup_name: string; created_by: string; record_count: number; size_bytes: number; created_at: string }>>([]);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRoleId, setNewRoleId] = useState<number>(2);

  const load = () => {
    apiFetch<AdminUser[]>('/api/admin/users').then(setUsers).catch(() => {});
    apiFetch<RoleDefinition[]>('/api/admin/roles').then(setRoles).catch(() => {});
    apiFetch<Array<{ id: string; user_name: string; email: string; ip_address: string; created_at: string }>>('/api/admin/sessions').then(setSessions).catch(() => {});
    apiFetch<AuditLogItem[]>('/api/admin/audit-logs').then(setAudits).catch(() => {});
    apiFetch<Array<{ id: number; backup_name: string; created_by: string; record_count: number; size_bytes: number; created_at: string }>>('/api/admin/backups').then(setBackups).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: newName, email: newEmail, password: newPass, role_id: newRoleId }),
      });
      setNewName('');
      setNewEmail('');
      setNewPass('');
      load();
      notify('Pengguna baru berhasil ditambahkan dengan peran RBAC.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah pengguna.', true);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await apiFetch<{ backupName: string; totalRows: number; payload: string }>('/api/admin/backup/create', {
        method: 'POST',
      });
      const blob = new Blob([res.payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.backupName;
      a.click();
      URL.revokeObjectURL(url);
      load();
      notify(`Backup berhasil dibuat (${res.totalRows} rekaman).`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membuat backup.', true);
    }
  };

  return (
    <div className="space-y-8">
      {/* User Management & RBAC */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-xl font-semibold">Manajemen Pengguna & Hak Akses RBAC ({roles.length} Role)</h2>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama lengkap" className="px-3 py-2 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          <input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@smkn3probolinggo.sch.id" className="px-3 py-2 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          <input required type="password" minLength={8} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Sandi (min 8)" className="px-3 py-2 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          <select value={newRoleId} onChange={(e) => setNewRoleId(Number(e.target.value))} className="px-3 py-2 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent">
            {roles.map((r) => (
              <option key={r.id} value={r.id} className="dark:bg-slate-900">{r.name}</option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Tambah User
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 dark:border-slate-800 text-stone-500 uppercase">
              <tr>
                <th className="py-2 pr-4">Nama & Email</th>
                <th className="py-2 pr-4">Role RBAC</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-stone-500">{u.email}</div>
                  </td>
                  <td className="py-2 pr-4">{u.role_name}</td>
                  <td className="py-2 pr-4">{u.is_active ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/users/${u.id}/toggle`, { method: 'PATCH' });
                        load();
                      }}
                      className="underline text-[#1E3A8A] dark:text-blue-400"
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Sessions & Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
            <span>Sesi Login Aktif ({sessions.length})</span>
          </h2>
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {sessions.map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{s.user_name} ({s.email})</div>
                  <div className="text-stone-500">IP: {s.ip_address} · {formatIndonesianDate(s.created_at, 'id')}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/sessions/${s.id}`, { method: 'DELETE' });
                    load();
                    notify('Sesi dicabut.');
                  }}
                  className="px-2.5 py-1 rounded border border-red-300 text-red-700"
                >
                  Cabut Sesi
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Backup & Pemulihan Data</h2>
            <button type="button" onClick={handleCreateBackup} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-medium">
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unduh Snapshot Backup</span>
            </button>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {backups.length === 0 ? (
              <p className="text-stone-500 py-2">Belum ada riwayat backup manual.</p>
            ) : (
              backups.map((b) => (
                <div key={b.id} className="py-2 flex justify-between">
                  <span className="font-mono-tabular truncate">{b.backup_name}</span>
                  <span className="text-stone-500 shrink-0">{b.record_count} baris · {Math.round(b.size_bytes / 1024)} KB</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <h2 className="font-display text-xl font-semibold">Audit Log Keamanan & Aktivitas</h2>
        <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800 text-xs">
          {audits.map((a) => {
            const isFailure = a.action.includes('FAILED') || a.action.includes('RATE_LIMITED');
            return (
              <div key={a.id} className="py-2 flex flex-wrap justify-between gap-2">
                <div>
                  <span
                    className={`font-mono-tabular font-semibold ${
                      isFailure ? 'text-red-600 dark:text-red-400' : 'text-[#1E3A8A] dark:text-blue-400'
                    }`}
                  >
                    {a.action}
                  </span>
                  <span className="mx-1.5">·</span>
                  <span className="font-medium">{a.user_name}</span>
                  <span className="text-stone-500 ml-2">{a.details}</span>
                </div>
                <span className="text-stone-400 font-mono-tabular">
                  {a.ip_address ? `${a.ip_address} · ` : ''}
                  {a.created_at.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
