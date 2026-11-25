import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Eye, Image as ImageIcon, Plus, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { formatIDR, formatIndonesianDate, getFocalPointClass } from '../../utils/portalLogic';
import type {
  Announcement,
  Banner,
  Department,
  HomepageSection,
  IndustryPartner,
  JobVacancy,
  MenuItem,
  Post,
  PostStatus,
  PreviewTarget,
  TeachingFactoryItem,
} from '../../shared/types';

interface AdminFetchHelper {
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  notify: (msg: string, isErr?: boolean, previewTarget?: PreviewTarget) => void;
  onOpenPreview?: (target: PreviewTarget) => void;
}

export const AdminPostsPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify, onOpenPreview }) => {
  const { categories, settings } = usePortal();
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tagsStr, setTagsStr] = useState('');
  const [status, setStatus] = useState<PostStatus>('published');
  const [seoDesc, setSeoDesc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const load = () => {
    apiFetch<Post[]>('/api/admin/posts').then(setPosts).catch((e) => notify(e.message, true));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<{ id: number; slug: string; status: PostStatus }>('/api/admin/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          summary,
          content,
          category_id: categoryId,
          tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
          status,
          seo_description: seoDesc,
          image_alt: imageAlt,
        }),
      });
      const catName = categories.find((c) => c.id === categoryId)?.name || 'Berita';
      const draftSnapshot: Post = {
        id: created.id,
        title: title.trim(),
        slug: created.slug,
        summary: (summary || content.slice(0, 180)).trim(),
        content: content.trim(),
        featured_image: '/src/assets/images/hero_campus_smkn3_1795574976594.jpg',
        image_alt: imageAlt || title.trim(),
        category_id: categoryId,
        category_name: catName,
        tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
        author_id: null,
        author_name: 'Redaksi CMS',
        editor_name: '',
        status: created.status,
        is_featured: false,
        event_date: null,
        published_at: created.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: null,
        seo_title: title.trim(),
        seo_description: seoDesc,
        views_count: 0,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTitle('');
      setSummary('');
      setContent('');
      setTagsStr('');
      setSeoDesc('');
      setImageAlt('');
      notify(
        created.status === 'published'
          ? 'Berita berhasil disimpan dan dipublikasikan.'
          : 'Berita berhasil disimpan sebagai draft/pengajuan.',
        false,
        created.status === 'published'
          ? { path: `/berita/${created.slug}`, label: `Artikel: ${draftSnapshot.title}` }
          : { path: '/berita', label: `Draft: ${draftSnapshot.title}`, draftPost: draftSnapshot }
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan berita.', true);
    }
  };

  const handleTransition = async (post: Post, nextStatus: PostStatus) => {
    try {
      await apiFetch(`/api/admin/posts/${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      notify(
        `Status berita diubah menjadi ${nextStatus}.`,
        false,
        nextStatus === 'published'
          ? { path: `/berita/${post.slug}`, label: `Artikel: ${post.title}` }
          : { path: '/berita', label: 'Daftar Berita' }
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengubah status.', true);
    }
  };

  const handleSoftDelete = async (id: number) => {
    try {
      await apiFetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      notify('Berita dipindahkan ke tempat sampah.');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menghapus.', true);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiFetch(`/api/admin/posts/${id}/restore`, { method: 'POST' });
      notify('Berita berhasil dipulihkan.');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memulihkan.', true);
    }
  };

  const handleAiAssist = async () => {
    if (!title.trim()) {
      notify('Isi judul atau topik awal terlebih dahulu untuk asisten AI.', true);
      return;
    }
    setAiBusy(true);
    try {
      const res = await apiFetch<{
        recommended_title?: string;
        summary?: string;
        seo_description?: string;
        image_alt?: string;
        suggested_tags?: string[];
      }>('/api/admin/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ topic: title, draftContent: content }),
      });
      if (res.recommended_title) setTitle(res.recommended_title);
      if (res.summary) setSummary(res.summary);
      if (res.seo_description) setSeoDesc(res.seo_description);
      if (res.image_alt) setImageAlt(res.image_alt);
      if (Array.isArray(res.suggested_tags)) setTagsStr(res.suggested_tags.join(', '));
      notify('Saran redaksi AI diterapkan. Silakan tinjau sebelum publikasi.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Asisten AI tidak tersedia.', true);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Tulis & Ajukan Berita (Prinsip 5W+1H)</h2>
          {settings?.ai_enabled && (
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={aiBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" aria-hidden="true" />
              <span>{aiBusy ? 'Memproses AI...' : 'Asisten Redaksi AI'}</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Judul Berita</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Kategori</label>
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Ringkasan Berita</label>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ringkasan singkat berita..." className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Konten Artikel Lengkap</label>
          <textarea required rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tuliskan uraian berita 5W+1H..." className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Tag (pisahkan koma)</label>
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="Vokasi, LKS, Teaching Factory" className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Meta Description SEO</label>
            <input value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status Workflow Awal</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
              <option value="draft" className="dark:bg-slate-900">Draft</option>
              <option value="submitted" className="dark:bg-slate-900">Ajukan Review</option>
              <option value="published" className="dark:bg-slate-900">Publikasikan Langsung</option>
            </select>
          </div>
        </div>
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Simpan Berita</span>
        </button>
      </form>

      <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 dark:border-slate-800 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Judul & Penulis</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Dibaca</th>
              <th className="px-4 py-3">Aksi Workflow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
            {posts.map((p) => (
              <tr key={p.id} className={p.deleted_at ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-stone-500">{p.author_name} · {formatIndonesianDate(p.created_at, 'id')}</div>
                </td>
                <td className="px-4 py-3 text-xs">{p.category_name}</td>
                <td className="px-4 py-3 text-xs font-semibold uppercase">{p.deleted_at ? 'Terhapus' : p.status}</td>
                <td className="px-4 py-3 text-right font-mono-tabular text-xs">{p.views_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {!p.deleted_at ? (
                      <>
                        {onOpenPreview && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPreview(
                                p.status === 'published'
                                  ? { path: `/berita/${p.slug}`, label: `Artikel: ${p.title}` }
                                  : { path: '/berita', label: `Draft: ${p.title}`, draftPost: p }
                              )
                            }
                            aria-label={`Preview ${p.title}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            <span>Preview</span>
                          </button>
                        )}
                        {p.status !== 'published' && (
                          <button type="button" onClick={() => handleTransition(p, 'published')} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white">
                            Publikasikan
                          </button>
                        )}
                        {p.status === 'published' && (
                          <button type="button" onClick={() => handleTransition(p, 'archived')} className="px-2 py-1 text-xs rounded border border-stone-300 dark:border-slate-700">
                            Arsipkan
                          </button>
                        )}
                        <button type="button" onClick={() => handleSoftDelete(p.id)} aria-label={`Hapus ${p.title}`} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => handleRestore(p.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-stone-300">
                        <RotateCcw className="w-3 h-3" /> Pulihkan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface MediaLibraryItem {
  id: number;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

export const AdminLayoutSectionsPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify }) => {
  const { refreshBootstrap } = usePortal();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [media, setMedia] = useState<MediaLibraryItem[]>([]);
  const [newMenuLabel, setNewMenuLabel] = useState('');
  const [newMenuHref, setNewMenuHref] = useState('');
  const [uploadingBannerId, setUploadingBannerId] = useState<number | 'new' | null>(null);

  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerTitleEn, setNewBannerTitleEn] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerSubtitleEn, setNewBannerSubtitleEn] = useState('');
  const [newBannerCtaLabel, setNewBannerCtaLabel] = useState('Jelajahi Keahlian');
  const [newBannerCtaHref, setNewBannerCtaHref] = useState('/konsentrasi-keahlian');
  const [newBannerImage, setNewBannerImage] = useState('/src/assets/images/hero_campus_smkn3_1795574976594.jpg');
  const [newBannerFocal, setNewBannerFocal] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>('center');

  const load = () => {
    apiFetch<HomepageSection[]>('/api/admin/homepage-sections').then(setSections).catch(() => {});
    apiFetch<MenuItem[]>('/api/admin/menus').then(setMenus).catch(() => {});
    apiFetch<Banner[]>('/api/admin/banners').then(setBanners).catch(() => {});
    apiFetch<MediaLibraryItem[]>('/api/admin/media').then(setMedia).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const uploadBannerImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'banner-header');
    const res = await apiFetch<{ url: string }>('/api/admin/media/upload', {
      method: 'POST',
      body: fd,
    });
    return res.url;
  };

  const handleReplaceBannerImage = async (banner: Banner, file: File | null) => {
    if (!file) return;
    setUploadingBannerId(banner.id);
    try {
      const url = await uploadBannerImage(file);
      const updated = { ...banner, image_url: url };
      await apiFetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      await refreshBootstrap();
      load();
      notify(`Gambar banner "${banner.title_id}" berhasil diganti dan diterapkan.`, false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengganti gambar banner.', true);
    } finally {
      setUploadingBannerId(null);
    }
  };

  const handleSaveBanner = async (banner: Banner) => {
    try {
      await apiFetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify(banner),
      });
      await refreshBootstrap();
      load();
      notify(`Banner "${banner.title_id}" diperbarui.`, false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan banner.', true);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify({
          title_id: newBannerTitle,
          title_en: newBannerTitleEn || newBannerTitle,
          subtitle_id: newBannerSubtitle,
          subtitle_en: newBannerSubtitleEn || newBannerSubtitle,
          cta_label_id: newBannerCtaLabel,
          cta_label_en: newBannerCtaLabel,
          cta_href: newBannerCtaHref,
          image_url: newBannerImage,
          focal_point: newBannerFocal,
          sort_order: banners.length + 1,
        }),
      });
      setNewBannerTitle('');
      setNewBannerTitleEn('');
      setNewBannerSubtitle('');
      setNewBannerSubtitleEn('');
      await refreshBootstrap();
      load();
      notify('Banner header baru ditambahkan ke beranda.', false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah banner header.', true);
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    try {
      await apiFetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE' });
      await refreshBootstrap();
      load();
      notify(`Banner "${banner.title_id}" dihapus.`, false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menghapus banner.', true);
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((s, idx) => ({ ...s, sort_order: idx + 1 })));
  };

  const toggleSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, is_enabled: !s.is_enabled } : s))
    );
  };

  const saveSections = async () => {
    try {
      await apiFetch('/api/admin/homepage-sections', {
        method: 'PUT',
        body: JSON.stringify({ sections }),
      });
      await refreshBootstrap();
      notify('Susunan dan visibilitas beranda berhasil disimpan.', false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan section.', true);
    }
  };

  const addMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/menus', {
        method: 'POST',
        body: JSON.stringify({ label_id: newMenuLabel, href: newMenuHref }),
      });
      setNewMenuLabel('');
      setNewMenuHref('');
      await refreshBootstrap();
      load();
      notify('Item menu ditambahkan.', false, { path: '/', label: 'Beranda Utama' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah menu.', true);
    }
  };

  const deleteMenu = async (id: number) => {
    await apiFetch(`/api/admin/menus/${id}`, { method: 'DELETE' });
    await refreshBootstrap();
    load();
  };

  const imageMedia = media.filter((m) => m.mime_type.startsWith('image/'));

  return (
    <div className="space-y-6">
      {/* Hero Banner Header Management */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
              <span>Gambar Banner Header (Hero Beranda)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              Unggah gambar baru untuk mengganti foto utama di bagian atas halaman beranda, atur posisi fokus gambar, atau kelola slide banner aktif.
            </p>
          </div>
          <span className="text-xs font-mono-tabular px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700">
            {banners.filter((b) => b.is_active).length} aktif / {banners.length} total
          </span>
        </div>

        <div className="space-y-4">
          {banners.map((b) => (
            <div key={b.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4 space-y-2">
                <div className="aspect-[16/9] rounded-md overflow-hidden border border-stone-200 dark:border-slate-700 bg-stone-200 dark:bg-slate-800">
                  <img
                    src={b.image_url}
                    alt={b.title_id}
                    className={`w-full h-full object-cover ${getFocalPointClass(b.focal_point)}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-medium cursor-pointer hover:opacity-95">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{uploadingBannerId === b.id ? 'Mengunggah...' : 'Unggah & Ganti Gambar'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif"
                      disabled={uploadingBannerId === b.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        e.target.value = '';
                        void handleReplaceBannerImage(b, file);
                      }}
                      className="sr-only"
                    />
                  </label>
                  {imageMedia.length > 0 && (
                    <select
                      aria-label={`Pilih dari Media Library untuk ${b.title_id}`}
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setBanners((prev) =>
                          prev.map((item) => (item.id === b.id ? { ...item, image_url: e.target.value } : item))
                        );
                      }}
                      className="px-2 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-[170px]"
                    >
                      <option value="">Pilih Media Library...</option>
                      {imageMedia.map((m) => (
                        <option key={m.id} value={m.url}>
                          {m.original_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Judul Banner (ID)</label>
                    <input
                      value={b.title_id}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, title_id: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Judul Banner (EN)</label>
                    <input
                      value={b.title_en}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, title_en: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Subjudul (ID)</label>
                    <input
                      value={b.subtitle_id}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, subtitle_id: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Subjudul (EN)</label>
                    <input
                      value={b.subtitle_en}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, subtitle_en: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1">URL Gambar Banner</label>
                    <input
                      value={b.image_url}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, image_url: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Fokus Gambar</label>
                    <select
                      value={b.focal_point || 'center'}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, focal_point: e.target.value } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="center">Tengah (Center)</option>
                      <option value="top">Atas (Top)</option>
                      <option value="bottom">Bawah (Bottom)</option>
                      <option value="left">Kiri (Left)</option>
                      <option value="right">Kanan (Right)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Urutan</label>
                    <input
                      type="number"
                      min={1}
                      value={b.sort_order}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, sort_order: Number(e.target.value) || 1 } : item)))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={b.is_active}
                      onChange={(e) =>
                        setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, is_active: e.target.checked } : item)))
                      }
                    />
                    <span>Tampilkan di Header Beranda</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBanner(b)}
                      className="px-3 py-1.5 rounded bg-[#1E3A8A] text-white font-medium hover:opacity-95"
                    >
                      Simpan Perubahan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b)}
                      aria-label={`Hapus banner ${b.title_id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Banner Form */}
        <form onSubmit={handleCreateBanner} className="p-4 rounded-lg border border-dashed border-stone-300 dark:border-slate-700 space-y-3 text-xs">
          <div className="font-semibold text-sm">Tambah Slide Banner Header Baru</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              value={newBannerTitle}
              onChange={(e) => setNewBannerTitle(e.target.value)}
              placeholder="Judul utama banner (Bahasa Indonesia)"
              className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
            <input
              value={newBannerTitleEn}
              onChange={(e) => setNewBannerTitleEn(e.target.value)}
              placeholder="Banner headline (English - opsional)"
              className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
            <input
              value={newBannerSubtitle}
              onChange={(e) => setNewBannerSubtitle(e.target.value)}
              placeholder="Subjudul deskripsi singkat (Bahasa Indonesia)"
              className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
            <input
              value={newBannerSubtitleEn}
              onChange={(e) => setNewBannerSubtitleEn(e.target.value)}
              placeholder="Banner subtitle (English - opsional)"
              className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                required
                value={newBannerImage}
                onChange={(e) => setNewBannerImage(e.target.value)}
                placeholder="URL gambar (/uploads/public/... atau https://...)"
                className="flex-1 px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
              />
              <label className="inline-flex items-center gap-1 px-3 py-2 rounded border border-stone-300 dark:border-slate-700 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{uploadingBannerId === 'new' ? 'Mengunggah...' : 'Unggah Foto'}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  disabled={uploadingBannerId === 'new'}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploadingBannerId('new');
                    try {
                      const url = await uploadBannerImage(file);
                      setNewBannerImage(url);
                      load();
                      notify('Gambar diunggah dan siap dipakai untuk banner baru.');
                    } catch (err) {
                      notify(err instanceof Error ? err.message : 'Gagal mengunggah gambar.', true);
                    } finally {
                      setUploadingBannerId(null);
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            <input
              value={newBannerCtaLabel}
              onChange={(e) => setNewBannerCtaLabel(e.target.value)}
              placeholder="Teks tombol CTA"
              className="px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
            <div className="flex gap-2">
              <input
                value={newBannerCtaHref}
                onChange={(e) => setNewBannerCtaHref(e.target.value)}
                placeholder="Tautan CTA (/spmb)"
                className="flex-1 min-w-0 px-3 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
              />
              <select
                aria-label="Posisi fokus banner baru"
                value={newBannerFocal}
                onChange={(e) => setNewBannerFocal(e.target.value as 'center' | 'top' | 'bottom' | 'left' | 'right')}
                className="px-2 py-2 rounded border border-stone-300 dark:border-slate-700 bg-transparent"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1E3A8A] text-white font-medium">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah Banner Header</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Susunan & Aktivasi Bagian Beranda</h2>
            <button type="button" onClick={saveSections} className="px-3.5 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-medium">
              Simpan Susunan
            </button>
          </div>
          <div className="space-y-2">
            {sections.map((s, idx) => (
              <div key={s.id} className="p-3 rounded border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={s.is_enabled} onChange={() => toggleSection(idx)} />
                  <span className="font-medium">{s.title_id}</span>
                </label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSection(idx, -1)} aria-label={`Naikkan ${s.title_id}`} className="p-1 rounded border border-stone-200 dark:border-slate-700">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(idx, 1)} aria-label={`Turunkan ${s.title_id}`} className="p-1 rounded border border-stone-200 dark:border-slate-700">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="font-display text-xl font-semibold">Manajemen Menu Navigasi</h2>
          <form onSubmit={addMenu} className="flex gap-2">
            <input required value={newMenuLabel} onChange={(e) => setNewMenuLabel(e.target.value)} placeholder="Label menu" className="flex-1 px-3 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            <input required value={newMenuHref} onChange={(e) => setNewMenuHref(e.target.value)} placeholder="/path atau https://..." className="flex-1 px-3 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            <button type="submit" className="px-3 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-medium">Tambah</button>
          </form>
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
            {menus.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{m.label_id}</span>
                  <span className="text-xs text-stone-500 ml-2 font-mono-tabular">{m.href}</span>
                </div>
                <button type="button" onClick={() => deleteMenu(m.id)} aria-label={`Hapus menu ${m.label_id}`} className="p-1 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminProgramsAndMediaPanel: React.FC<AdminFetchHelper> = ({ apiFetch, notify }) => {
  const { refreshBootstrap } = usePortal();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tefa, setTefa] = useState<TeachingFactoryItem[]>([]);
  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [media, setMedia] = useState<Array<{ id: number; original_name: string; url: string; mime_type: string; size_bytes: number }>>([]);

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCat, setAnnCat] = useState<'umum' | 'spmb' | 'akademik' | 'darurat'>('umum');

  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobDeadline, setJobDeadline] = useState('2027-06-30');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<number, string>>({});

  const loadAll = () => {
    apiFetch<Department[]>('/api/admin/departments')
      .then((list) => {
        setDepartments(list);
        const nextDrafts: Record<number, string> = {};
        for (const d of list) {
          nextDrafts[d.id] = String(d.quota_spmb);
        }
        setQuotaDrafts(nextDrafts);
      })
      .catch(() => {});
    apiFetch<Announcement[]>('/api/admin/announcements').then(setAnnouncements).catch(() => {});
    apiFetch<TeachingFactoryItem[]>('/api/admin/tefa').then(setTefa).catch(() => {});
    apiFetch<JobVacancy[]>('/api/admin/jobs').then(setJobs).catch(() => {});
    apiFetch<IndustryPartner[]>('/api/admin/partners').then(setPartners).catch(() => {});
    apiFetch<Array<{ id: number; original_name: string; url: string; mime_type: string; size_bytes: number }>>('/api/admin/media').then(setMedia).catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title_id: annTitle, content_id: annContent, category: annCat }),
      });
      setAnnTitle('');
      setAnnContent('');
      await refreshBootstrap();
      loadAll();
      notify('Pengumuman dipublikasikan.', false, { path: '/', label: 'Pengumuman Beranda' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah pengumuman.', true);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/jobs', {
        method: 'POST',
        body: JSON.stringify({ title: jobTitle, company_name: jobCompany, deadline: jobDeadline }),
      });
      setJobTitle('');
      setJobCompany('');
      loadAll();
      notify('Lowongan BKK ditambahkan.', false, { path: '/humas-bkk', label: 'BKK & Mitra Industri' });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah lowongan.', true);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await apiFetch<{ duplicate?: boolean; url: string; message?: string }>('/api/admin/media/upload', {
        method: 'POST',
        body: fd,
      });
      setUploadFile(null);
      loadAll();
      notify(res.duplicate ? res.message || 'File duplikat terdeteksi.' : `File diunggah ke ${res.url}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengunggah media.', true);
    }
  };

  const updateDeptQuota = async (dept: Department, quota: number) => {
    const cleanQuota = Math.max(0, Math.round(Number.isFinite(quota) ? quota : dept.quota_spmb));
    try {
      await apiFetch(`/api/admin/departments/${dept.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quota_spmb: cleanQuota }),
      });
      notify(`Daya tampung SPMB ${dept.name_id} diperbarui menjadi ${cleanQuota} siswa.`, false, {
        path: '/spmb',
        label: 'Daya Tampung SPMB',
      });
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui kuota.', true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Departments */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Konsentrasi Keahlian & Daya Tampung SPMB</h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            Ubah angka kuota siswa per jurusan lalu klik Simpan. Perubahan otomatis tampil di halaman SPMB dan Konsentrasi Keahlian.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => {
            const valStr = quotaDrafts[d.id] ?? String(d.quota_spmb);
            const numericVal = Number(valStr);
            const isDirty = Number.isFinite(numericVal) && numericVal !== d.quota_spmb;
            return (
              <form
                key={d.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  void updateDeptQuota(d, numericVal);
                }}
                className="p-4 rounded border border-stone-200 dark:border-slate-800 space-y-2 text-sm"
              >
                <div className="font-semibold">{d.name_id} ({d.code})</div>
                <div className="text-xs text-stone-500">Kepala: {d.head_name}</div>
                <div className="flex items-center gap-2 pt-1">
                  <label htmlFor={`quota-${d.id}`} className="text-xs shrink-0">Daya Tampung:</label>
                  <input
                    id={`quota-${d.id}`}
                    type="number"
                    min={0}
                    value={valStr}
                    onChange={(e) => setQuotaDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    className="w-20 px-2 py-1 text-xs rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
                  />
                  <button
                    type="submit"
                    disabled={!isDirty}
                    className="px-2.5 py-1 rounded bg-[#1E3A8A] text-white text-xs font-medium disabled:opacity-40"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </div>

      {/* Announcements & BKK Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="font-display text-xl font-semibold">Pengumuman Resmi ({announcements.length})</h2>
          <form onSubmit={handleAddAnnouncement} className="space-y-3">
            <input required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Judul pengumuman" className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            <textarea required rows={2} value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Isi pengumuman" className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            <div className="flex gap-2">
              <select value={annCat} onChange={(e) => setAnnCat(e.target.value as 'umum' | 'spmb' | 'akademik' | 'darurat')} className="px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
                <option value="umum" className="dark:bg-slate-900">Umum</option>
                <option value="spmb" className="dark:bg-slate-900">SPMB</option>
                <option value="akademik" className="dark:bg-slate-900">Akademik</option>
                <option value="darurat" className="dark:bg-slate-900">Darurat</option>
              </select>
              <button type="submit" className="px-4 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium">Terbitkan</button>
            </div>
          </form>
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {announcements.map((a) => (
              <div key={a.id} className="py-2 flex items-center justify-between">
                <span>[{a.category.toUpperCase()}] {a.title_id}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
                    await refreshBootstrap();
                    loadAll();
                  }}
                  aria-label={`Hapus ${a.title_id}`}
                  className="text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="font-display text-xl font-semibold">BKK Lowongan ({jobs.length}), Mitra ({partners.length}) & TeFa ({tefa.length})</h2>
          <form onSubmit={handleAddJob} className="space-y-3">
            <input required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Posisi lowongan kerja" className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            <div className="flex gap-2">
              <input required value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} placeholder="Nama perusahaan mitra" className="flex-1 px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
              <input type="date" value={jobDeadline} onChange={(e) => setJobDeadline(e.target.value)} className="px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
              <button type="submit" className="px-4 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium">Tambah</button>
            </div>
          </form>
          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {jobs.map((j) => (
              <div key={j.id} className="py-2 flex items-center justify-between">
                <span>{j.title} — {j.company_name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/jobs/${j.id}`, { method: 'DELETE' });
                    loadAll();
                  }}
                  aria-label={`Hapus lowongan ${j.title}`}
                  className="text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-500">
            Unit Teaching Factory aktif: {tefa.map((t) => `${t.name} (${formatIDR(t.price_idr)})`).slice(0, 2).join(' · ')}
          </div>
        </div>
      </div>

      {/* Media Library */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-xl font-semibold">Media Library Terpusat</h2>
        <form onSubmit={handleUploadMedia} className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="text-xs" />
          <button type="submit" disabled={!uploadFile} className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1E3A8A] text-white text-xs font-medium disabled:opacity-40">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unggah Berkas Aman</span>
          </button>
        </form>
        {media.length === 0 ? (
          <p className="text-xs text-stone-500">Belum ada media tambahan yang diunggah. Aset gambar bawaan tersedia di /src/assets/images/.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {media.map((m) => (
              <div key={m.id} className="p-3 rounded border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3">
                {m.mime_type.startsWith('image/') && (
                  <img src={m.url} alt={m.original_name} className="w-12 h-12 rounded object-cover shrink-0 border border-stone-200 dark:border-slate-700" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.original_name}</div>
                  <div className="text-stone-500 font-mono-tabular truncate">{m.url}</div>
                  <div className="text-stone-400 font-mono-tabular">{Math.round(m.size_bytes / 1024)} KB</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(m.url);
                      setCopiedId(m.id);
                      setTimeout(() => setCopiedId(null), 1500);
                      notify(`URL disalin: ${m.url}`);
                    }}
                    aria-label={`Salin URL ${m.original_name}`}
                    className="p-1.5 rounded border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/media/${m.id}`, { method: 'DELETE' });
                      loadAll();
                    }}
                    aria-label={`Hapus media ${m.original_name}`}
                    className="text-red-600 p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
