import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, MapPin, Search, Share2 } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { usePortal } from '../context/PortalContext';
import { formatIndonesianDate, formatNumberLocale, pickLang } from '../utils/portalLogic';
import type { AgendaEvent, DocumentItem, GalleryItem, Post } from '../shared/types';

export const NewsArchivePage: React.FC = () => {
  const { categories, announcements, lang } = usePortal();
  const [activeTab, setActiveTab] = useState<'berita' | 'agenda' | 'galeri' | 'unduhan'>('berita');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [postsData, setPostsData] = useState<{ items: Post[]; total: number; totalPages: number }>({
    items: [],
    total: 0,
    totalPages: 1,
  });
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '6' });
    if (search.trim()) params.set('q', search.trim());
    if (categoryFilter !== 'all') params.set('category', categoryFilter);

    fetch(`/api/posts?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setPostsData({ items: d.items || [], total: d.total || 0, totalPages: d.totalPages || 1 }));
  }, [search, categoryFilter, page]);

  useEffect(() => {
    fetch('/api/events').then((r) => r.json()).then((d) => setEvents(Array.isArray(d) ? d : []));
    fetch('/api/galleries').then((r) => r.json()).then((d) => setGalleries(Array.isArray(d) ? d : []));
    fetch('/api/documents').then((r) => r.json()).then((d) => setDocuments(Array.isArray(d) ? d : []));
  }, []);

  const isEn = lang === 'en';
  const copy = {
    eyebrow: isEn ? 'School Publication & Documentation Center' : 'Pusat Publikasi & Dokumentasi Sekolah',
    title: isEn ? 'News, Announcements, Events & Gallery' : 'Berita, Pengumuman, Agenda & Galeri',
    tabs: [
      ['berita', isEn ? 'News & Articles' : 'Berita & Artikel'],
      ['agenda', isEn ? 'Events & Announcements' : 'Agenda & Pengumuman'],
      ['galeri', isEn ? 'Photo Gallery' : 'Galeri Dokumentasi'],
      ['unduhan', isEn ? 'Documents' : 'Unduhan Dokumen'],
    ] as const,
    searchPlaceholder: isEn ? 'Search news titles or keywords...' : 'Cari judul atau kata kunci berita...',
    categoryLabel: isEn ? 'Filter news category' : 'Filter kategori berita',
    allCategories: isEn ? 'All Categories' : 'Semua Kategori',
    noPosts: isEn ? 'No news articles match your search filter.' : 'Belum ada berita yang cocok dengan filter pencarian.',
    fallbackCategory: isEn ? 'News' : 'Berita',
    readMore: isEn ? 'Read More →' : 'Baca Selengkapnya →',
    prev: isEn ? 'Previous' : 'Sebelumnya',
    next: isEn ? 'Next' : 'Berikutnya',
    pageOf: isEn ? `Page ${page} of ${postsData.totalPages}` : `Halaman ${page} dari ${postsData.totalPages}`,
    eventsHeading: isEn ? 'School Events Calendar' : 'Agenda Kegiatan Sekolah',
    announcementsHeading: isEn ? 'Official Announcements' : 'Pengumuman Resmi',
    priority: isEn ? 'Priority' : 'Prioritas',
    version: isEn ? 'Version' : 'Versi',
    download: isEn ? 'Download' : 'Unduh',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 space-y-4">
        <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
          {copy.eyebrow}
        </div>
        <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-white">
          {copy.title}
        </h1>
        <div className="flex flex-wrap gap-1 p-1 bg-stone-100 dark:bg-slate-900 rounded-lg w-fit">
          {copy.tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === key
                  ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'berita' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={copy.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <select
              aria-label={copy.categoryLabel}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">{copy.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {postsData.items.length === 0 ? (
            <div className="p-10 text-center rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-stone-500">
              {copy.noPosts}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsData.items.map((post) => (
                <article key={post.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                  <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                    <ResilientImage src={post.featured_image} alt={post.image_alt || post.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        <span>{post.category_name || copy.fallbackCategory}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{formatIndonesianDate(post.published_at, lang)}</span>
                      </div>
                      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white mt-1.5 leading-snug">
                        <Link to={`/berita/${post.slug}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h2>
                      <p className="text-xs text-stone-600 dark:text-slate-300 mt-2 leading-relaxed">{post.summary}</p>
                    </div>
                    <Link to={`/berita/${post.slug}`} className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline">
                      {copy.readMore}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {postsData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 disabled:opacity-40"
              >
                {copy.prev}
              </button>
              <span className="text-xs font-mono-tabular text-stone-600 dark:text-slate-400">
                {copy.pageOf}
              </span>
              <button
                type="button"
                disabled={page >= postsData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 disabled:opacity-40"
              >
                {copy.next}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'agenda' && (
        <div id="agenda" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">{copy.eventsHeading}</h2>
            {events.map((ev) => (
              <div key={ev.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="text-xs text-[#1E3A8A] dark:text-blue-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{formatIndonesianDate(ev.start_date, lang)} · {ev.time_range}</span>
                </div>
                <h3 className="font-semibold text-base">{ev.title}</h3>
                <p className="text-sm text-stone-600 dark:text-slate-300">{ev.description}</p>
                <div className="text-xs text-stone-500 flex items-center gap-1 pt-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ev.location}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">{copy.announcementsHeading}</h2>
            {announcements.map((a) => (
              <div key={a.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="text-xs uppercase text-[#9A3412] dark:text-amber-400 font-semibold">
                  {a.category} · {copy.priority} {a.priority}
                </div>
                <h3 className="font-semibold text-base">{pickLang(lang, a.title_id, a.title_en)}</h3>
                <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{pickLang(lang, a.content_id, a.content_en)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'galeri' && (
        <div id="galeri" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((g) => (
            <figure key={g.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="aspect-4/3 overflow-hidden border-b border-stone-200 dark:border-slate-800">
                <ResilientImage src={g.media_url} alt={g.title} className="w-full h-full object-cover" />
              </div>
              <figcaption className="p-4 space-y-1">
                <div className="text-xs text-stone-500">{g.album} · {formatIndonesianDate(g.taken_at, lang)}</div>
                <div className="font-semibold text-sm">{g.title}</div>
                <p className="text-xs text-stone-600 dark:text-slate-300">{g.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {activeTab === 'unduhan' && (
        <div className="space-y-3">
          {copiedMsg && <div className="text-xs text-emerald-700 dark:text-emerald-400">{copiedMsg}</div>}
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-stone-500">{doc.category} · {copy.version} {doc.version} · {formatIndonesianDate(doc.published_at, lang)}</div>
                <div className="font-semibold text-sm mt-0.5">{doc.title}</div>
              </div>
              <a
                href={doc.file_url}
                download
                onClick={() => setCopiedMsg(isEn ? `Downloading ${doc.title}...` : `Mengunduh ${doc.title}...`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1E3A8A] text-white text-xs font-medium shrink-0 w-fit"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copy.download} ({doc.file_size_kb} KB)</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NewsDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = usePortal();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/posts/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPost(d.post);
          setRelated(d.related || []);
        } else {
          setPost(null);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 space-y-4">
        <div className="h-8 bg-stone-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-72 bg-stone-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  const isEn = lang === 'en';

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold">
          {isEn ? 'Article Not Found' : 'Artikel Tidak Ditemukan'}
        </h1>
        <Link to="/berita" className="inline-block px-4 py-2 rounded-md bg-[#1E3A8A] text-white text-sm">
          {isEn ? 'Back to News Index' : 'Kembali ke Indeks Berita'}
        </Link>
      </div>
    );
  }

  const handleCopyShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link to="/berita" className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-slate-400 hover:underline">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{isEn ? 'Back to News & Publications' : 'Kembali ke Berita & Publikasi'}</span>
        </Link>
      </div>

      <header className="space-y-4">
        <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
          {post.category_name || (isEn ? 'School News' : 'Berita Sekolah')} · {formatIndonesianDate(post.published_at, lang)} · {formatNumberLocale(post.views_count, lang)} {isEn ? 'views' : 'pembacaan'}
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-stone-900 dark:text-white leading-tight text-balance">
          {post.title}
        </h1>
        <p className="text-base sm:text-lg text-stone-600 dark:text-slate-300 leading-relaxed">
          {post.summary}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400">
          <div>
            {isEn ? 'Author' : 'Penulis'}: <span className="font-semibold text-stone-800 dark:text-slate-200">{post.author_name}</span>
            {post.editor_name && (
              <>
                <span aria-hidden="true"> · </span>
                <span>Editor: {post.editor_name}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{copied ? (isEn ? 'Link Copied' : 'Tautan Disalin') : (isEn ? 'Share Link' : 'Bagikan Tautan')}</span>
          </button>
        </div>
      </header>

      <figure className="rounded-lg overflow-hidden border border-stone-200 dark:border-slate-800">
        <ResilientImage src={post.featured_image} alt={post.image_alt || post.title} className="w-full max-h-[460px] object-cover" loading="eager" />
        {post.image_alt && (
          <figcaption className="px-4 py-2.5 text-xs italic text-stone-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-t border-stone-200 dark:border-slate-800">
            {post.image_alt}
          </figcaption>
        )}
      </figure>

      <div className="max-w-prose mx-auto space-y-5 text-base leading-relaxed text-stone-800 dark:text-slate-200">
        {post.content.split('\n\n').map((para, idx) => (
          <p key={idx} className={idx === 0 ? 'first-letter:text-5xl first-letter:font-display first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1' : ''}>
            {para}
          </p>
        ))}
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="max-w-prose mx-auto pt-4 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-500">
          {isEn ? 'Related topics' : 'Topik terkait'}: {post.tags.join(' · ')}
        </div>
      )}

      {related.length > 0 && (
        <section className="pt-8 border-t border-stone-200 dark:border-slate-800 space-y-4">
          <h2 className="font-display text-2xl font-semibold">{isEn ? 'Related Articles' : 'Artikel Terkait'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.id} to={`/berita/${r.slug}`} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400">
                <div className="text-xs text-stone-500">{formatIndonesianDate(r.published_at, lang)}</div>
                <div className="font-semibold text-sm mt-1">{r.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
