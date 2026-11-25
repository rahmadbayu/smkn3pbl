import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

export const AdminAuthScreen: React.FC = () => {
  const { setAuthSession, settings } = usePortal();
  const [setupStatus, setSetupStatus] = useState<{ needsClaim: boolean; envConfigured: boolean } | null>(null);

  const [name, setName] = useState('Super Administrator');
  const [email, setEmail] = useState('admin@smkn3probolinggo.sch.id');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((d) => setSetupStatus(d))
      .catch(() => setSetupStatus({ needsClaim: false, envConfigured: false }));
  }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/claim-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengaktifkan akun administrator.');
      setAuthSession(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses aktivasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal masuk ke CMS.');
      setAuthSession(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-slate-400 hover:underline">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Kembali ke Portal Publik</span>
          </Link>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#1E3A8A] dark:text-blue-400 font-semibold">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>CMS & Tata Kelola Sekolah</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-white">
              {setupStatus?.needsClaim
                ? 'Aktivasi Awal Super Administrator'
                : `Masuk Panel CMS ${settings?.school_name || 'SMKN 3 Probolinggo'}`}
            </h1>
            <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
              {setupStatus?.needsClaim
                ? 'Belum ada akun Super Administrator yang aktif. Buat kata sandi administrator pertama untuk mengunci dan mengelola sistem.'
                : 'Masukkan kredensial akun pengelola portal yang telah terdaftar.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {setupStatus === null ? (
            <div className="py-6 text-center text-sm text-stone-500">Memeriksa status keamanan sistem...</div>
          ) : setupStatus.needsClaim ? (
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label htmlFor="claim-name" className="block text-xs font-medium mb-1">Nama Lengkap</label>
                <input
                  id="claim-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="claim-email" className="block text-xs font-medium mb-1">Email Administrator</label>
                <input
                  id="claim-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="claim-pass" className="block text-xs font-medium mb-1">Kata Sandi Baru (Min. 8 Karakter)</label>
                <input
                  id="claim-pass"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="claim-confirm" className="block text-xs font-medium mb-1">Ulangi Kata Sandi</label>
                <input
                  id="claim-confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                <span>{submitting ? 'Mengaktifkan...' : 'Aktifkan Super Administrator'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium mb-1">Email Akun</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="login-pass" className="block text-xs font-medium mb-1">Kata Sandi</label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? 'Memverifikasi...' : 'Masuk ke Panel CMS'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
