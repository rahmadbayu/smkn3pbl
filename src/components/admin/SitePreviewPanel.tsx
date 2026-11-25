import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Globe,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { ResilientImage } from '../ResilientImage';
import { buildPreviewUrl, formatIndonesianDate } from '../../utils/portalLogic';
import type { Language, PreviewTarget } from '../../shared/types';

interface SitePreviewPanelProps {
  target: PreviewTarget;
  onBackToEditor?: () => void;
  previousTabLabel?: string;
}

const PREVIEW_ROUTES = [
  { path: '/', label: 'Beranda Utama' },
  { path: '/berita', label: 'Berita, Agenda & Galeri' },
  { path: '/konsentrasi-keahlian', label: 'Konsentrasi Keahlian' },
  { path: '/profil', label: 'Profil & GTK Sekolah' },
  { path: '/spmb', label: 'Informasi SPMB' },
  { path: '/humas-bkk', label: 'BKK & Mitra Industri' },
  { path: '/akademik', label: 'Kurikulum & Teaching Factory' },
  { path: '/layanan-digital', label: 'Layanan Administrasi Digital' },
  { path: '/informasi-publik', label: 'Informasi Publik (PPID)' },
  { path: '/kontak', label: 'Kontak & Lokasi' },
];

export const SitePreviewPanel: React.FC<SitePreviewPanelProps> = ({
  target,
  onBackToEditor,
  previousTabLabel,
}) => {
  const [previewPath, setPreviewPath] = useState(target.path || '/');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLang, setPreviewLang] = useState<Language>('id');
  const [refreshKey, setRefreshKey] = useState(1);
  const [showDraftView, setShowDraftView] = useState(Boolean(target.draftPost));

  useEffect(() => {
    setPreviewPath(target.path || '/');
    setShowDraftView(Boolean(target.draftPost));
    setRefreshKey((k) => k + 1);
  }, [target]);

  const iframeSrc = buildPreviewUrl(previewPath, previewLang, refreshKey);

  const frameWidthClass =
    viewport === 'mobile'
      ? 'w-[390px] max-w-full'
      : viewport === 'tablet'
      ? 'w-[768px] max-w-full'
      : 'w-full';

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {onBackToEditor && (
            <button
              type="button"
              onClick={onBackToEditor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kembali ke {previousTabLabel || 'Editor'}</span>
            </button>
          )}

          <select
            aria-label="Pilih halaman portal untuk pratinjau"
            value={PREVIEW_ROUTES.some((r) => r.path === previewPath) ? previewPath : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') {
                setShowDraftView(false);
                setPreviewPath(e.target.value);
                setRefreshKey((k) => k + 1);
              }
            }}
            className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent font-medium"
          >
            {!PREVIEW_ROUTES.some((r) => r.path === previewPath) && (
              <option value="__custom__" className="dark:bg-slate-900">
                {target.label || previewPath}
              </option>
            )}
            {PREVIEW_ROUTES.map((r) => (
              <option key={r.path} value={r.path} className="dark:bg-slate-900">
                {r.label} ({r.path})
              </option>
            ))}
          </select>

          {target.draftPost && (
            <div className="inline-flex rounded border border-stone-300 dark:border-slate-700 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setShowDraftView(true)}
                className={`px-2.5 py-1 rounded font-medium ${
                  showDraftView ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
                }`}
              >
                Pratinjau Draft Artikel
              </button>
              <button
                type="button"
                onClick={() => setShowDraftView(false)}
                className={`px-2.5 py-1 rounded font-medium ${
                  !showDraftView ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
                }`}
              >
                Portal Langsung
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switch for Preview */}
          <div className="inline-flex items-center rounded border border-stone-300 dark:border-slate-700 p-0.5 text-xs">
            <Globe className="w-3.5 h-3.5 text-stone-500 mx-1.5" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setPreviewLang('id');
                setRefreshKey((k) => k + 1);
              }}
              aria-label="Pratinjau Bahasa Indonesia"
              className={`px-2 py-1 rounded font-semibold ${
                previewLang === 'id' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewLang('en');
                setRefreshKey((k) => k + 1);
              }}
              aria-label="Pratinjau Bahasa Inggris"
              className={`px-2 py-1 rounded font-semibold ${
                previewLang === 'en' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
              }`}
            >
              EN
            </button>
          </div>

          {/* Viewport Switcher */}
          <div className="inline-flex items-center rounded border border-stone-300 dark:border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              aria-label="Tampilan Desktop"
              aria-pressed={viewport === 'desktop'}
              className={`p-1.5 rounded ${
                viewport === 'desktop' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              aria-label="Tampilan Tablet"
              aria-pressed={viewport === 'tablet'}
              className={`p-1.5 rounded ${
                viewport === 'tablet' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              aria-label="Tampilan Mobile"
              aria-pressed={viewport === 'mobile'}
              className={`p-1.5 rounded ${
                viewport === 'mobile' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Muat ulang pratinjau"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Preview Canvas */}
      <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-200/70 dark:bg-slate-900/70 p-3 sm:p-4 flex justify-center overflow-x-auto">
        {showDraftView && target.draftPost ? (
          <div className={`${frameWidthClass} transition-all bg-[#FBF9F5] dark:bg-slate-950 rounded-lg border border-stone-300 dark:border-slate-700 shadow-sm overflow-hidden`}>
            <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                Mode Pratinjau Artikel CMS · Status: {target.draftPost.status.toUpperCase()}
              </span>
              <span>Belum dipublikasikan ke halaman publik</span>
            </div>
            <article className="max-w-3xl mx-auto px-6 py-10 space-y-6">
              <header className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {target.draftPost.category_name || 'Berita Sekolah'} ·{' '}
                  {formatIndonesianDate(target.draftPost.created_at, previewLang)}
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-white leading-tight">
                  {target.draftPost.title}
                </h1>
                {target.draftPost.summary && (
                  <p className="text-base text-stone-600 dark:text-slate-300 leading-relaxed">
                    {target.draftPost.summary}
                  </p>
                )}
              </header>
              {target.draftPost.featured_image && (
                <figure className="rounded-lg overflow-hidden border border-stone-200 dark:border-slate-800">
                  <ResilientImage
                    src={target.draftPost.featured_image}
                    alt={target.draftPost.image_alt || target.draftPost.title}
                    className="w-full max-h-80 object-cover"
                  />
                </figure>
              )}
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-stone-800 dark:text-slate-200">
                {target.draftPost.content.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <div className={`${frameWidthClass} transition-all bg-white dark:bg-slate-950 rounded-lg border border-stone-300 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col`}>
            <div className="px-3 py-1.5 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-[11px] font-mono-tabular text-stone-500 flex items-center justify-between gap-2">
              <span className="truncate">{iframeSrc}</span>
              <span className="shrink-0 uppercase">{viewport}</span>
            </div>
            <iframe
              key={`${iframeSrc}-${refreshKey}`}
              src={iframeSrc}
              title="Pratinjau Situs SMK Negeri 3 Probolinggo"
              className="w-full h-[72vh] min-h-[540px] bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
