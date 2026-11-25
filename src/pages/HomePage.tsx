import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Library,
  MapPin,
  MessageSquareWarning,
  Pause,
  Play,
  Shield,
  Users,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { ResilientImage } from '../components/ResilientImage';
import { formatIDR, formatIndonesianDate, formatNumberLocale, getFocalPointClass, pickLang } from '../utils/portalLogic';
import type {
  Achievement,
  AgendaEvent,
  Department,
  Facility,
  GalleryItem,
  IndustryPartner,
  Post,
  StudentWork,
  TeachingFactoryItem,
  TestimonialItem,
} from '../shared/types';

export const HomePage: React.FC = () => {
  const { settings, sections, banners, announcements, stats, lang } = usePortal();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tefa, setTefa] = useState<TeachingFactoryItem[]>([]);
  const [works, setWorks] = useState<StudentWork[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);

  const [slideIdx, setSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/posts?limit=4').then((r) => r.json()),
      fetch('/api/achievements').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json()),
      fetch('/api/tefa').then((r) => r.json()),
      fetch('/api/student-works').then((r) => r.json()),
      fetch('/api/facilities').then((r) => r.json()),
      fetch('/api/partners').then((r) => r.json()),
      fetch('/api/testimonials').then((r) => r.json()),
      fetch('/api/galleries').then((r) => r.json()),
    ])
      .then(([d, p, a, e, tf, sw, f, pt, ts, gl]) => {
        setDepartments(Array.isArray(d) ? d : []);
        setPosts(Array.isArray(p?.items) ? p.items : []);
        setAchievements(Array.isArray(a) ? a : []);
        setEvents(Array.isArray(e) ? e : []);
        setTefa(Array.isArray(tf) ? tf : []);
        setWorks(Array.isArray(sw) ? sw : []);
        setFacilities(Array.isArray(f) ? f : []);
        setPartners(Array.isArray(pt) ? pt : []);
        setTestimonials(Array.isArray(ts) ? ts : []);
        setGalleries(Array.isArray(gl) ? gl : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((i) => (i + 1) % banners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, banners.length]);

  const primaryColor = settings?.primary_color || '#1E3A8A';

  const quickAccessItems = [
    { label: lang === 'id' ? 'SPMB Murid Baru' : 'SPMB Admissions', sub: lang === 'id' ? 'Info & Daya Tampung' : 'Info & Capacities', href: '/spmb', icon: GraduationCap, external: false },
    { label: 'e-Rapor SMK', sub: lang === 'id' ? 'Penilaian Akademik' : 'Academic Grading', href: settings?.integrations?.erapor_url || '/akademik', icon: BookOpen, external: true },
    { label: lang === 'id' ? 'LMS Sekolah' : 'School LMS', sub: lang === 'id' ? 'Pembelajaran Daring' : 'Online Learning', href: settings?.integrations?.lms_url || '/akademik', icon: FileText, external: true },
    { label: lang === 'id' ? 'Perpustakaan Digital' : 'Digital Library', sub: lang === 'id' ? 'Katalog & Literasi' : 'Catalog & Literacy', href: '/sarana-prasarana', icon: Library, external: false },
    { label: lang === 'id' ? 'Bursa Kerja Khusus' : 'Job Center (BKK)', sub: lang === 'id' ? 'Lowongan & Rekrutmen' : 'Vacancies & Hiring', href: '/humas-bkk', icon: Briefcase, external: false },
    { label: 'Tracer Study', sub: lang === 'id' ? 'Jejak Alumni Vokasi' : 'Alumni Outcomes', href: '/humas-bkk#tracer', icon: Users, external: false },
    { label: lang === 'id' ? 'Layanan Administrasi' : 'Digital Services', sub: lang === 'id' ? 'Surat & Legalisasi' : 'Letters & Legalization', href: '/layanan-digital', icon: ClipboardCheck, external: false },
    { label: lang === 'id' ? 'Pengaduan Masyarakat' : 'Public Complaints', sub: lang === 'id' ? 'Kanal Resmi Terpadu' : 'Official Feedback Desk', href: '/layanan-digital#pengaduan', icon: MessageSquareWarning, external: false },
    { label: lang === 'id' ? 'Informasi Publik (PPID)' : 'Public Info (PPID)', sub: lang === 'id' ? 'UU KIP No. 14/2008' : 'Transparency Portal', href: '/informasi-publik', icon: Shield, external: false },
    { label: lang === 'id' ? 'Survei Kepuasan' : 'Quality Survey', sub: lang === 'id' ? 'Penjaminan Mutu' : 'Quality Assurance', href: '/penjaminan-mutu', icon: Award, external: false },
  ];

  const orderedSections = sections.length > 0
    ? sections.filter((s) => s.is_enabled).sort((a, b) => a.sort_order - b.sort_order)
    : [
        'hero', 'announcements', 'quick_access', 'principal', 'profile_summary',
        'departments', 'news', 'achievements', 'events', 'stats', 'tefa',
        'facilities', 'partners', 'testimonials', 'gallery', 'location',
      ].map((k, idx) => ({ id: idx + 1, section_key: k, title_id: k, title_en: k, is_enabled: true, sort_order: idx + 1 }));

  const activeBanner = banners[slideIdx % Math.max(1, banners.length)];

  const renderSection = (key: string) => {
    switch (key) {
      case 'hero':
        return (
          <section key="hero" aria-label="Sorotan Utama Kampus" className="relative border-b border-stone-200 dark:border-slate-800 bg-stone-900 text-white">
            <div className="relative min-h-[500px] sm:min-h-[540px] lg:min-h-[600px] w-full overflow-hidden flex items-end">
              <ResilientImage
                src={activeBanner?.image_url || '/src/assets/images/hero_campus_smkn3_1795574976594.jpg'}
                alt={activeBanner ? pickLang(lang, activeBanner.title_id, activeBanner.title_en) : 'Kampus SMK Negeri 3 Probolinggo'}
                loading="eager"
                className={`absolute inset-0 w-full h-full object-cover ${getFocalPointClass(activeBanner?.focal_point)}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
              <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-16 pb-10 sm:pt-20 sm:pb-16">
                  <div className="max-w-3xl space-y-4">
                    <div className="text-xs font-medium tracking-widest uppercase text-stone-200">
                      {settings?.school_name || 'SMK Negeri 3 Probolinggo'} · {settings?.city || 'Kota Probolinggo'}
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight tracking-tight text-white text-balance">
                      {activeBanner
                        ? lang === 'id'
                          ? activeBanner.title_id
                          : activeBanner.title_en
                        : 'Pendidikan Vokasi Terintegrasi untuk Generasi Unggul'}
                    </h1>
                    <p className="text-sm sm:text-base text-stone-200 max-w-2xl leading-relaxed">
                      {activeBanner
                        ? lang === 'id'
                          ? activeBanner.subtitle_id
                          : activeBanner.subtitle_en
                        : settings?.slogan_id}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <Link
                        to={activeBanner?.cta_href || '/konsentrasi-keahlian'}
                        style={{ backgroundColor: primaryColor }}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold text-white hover:opacity-95 transition-opacity"
                      >
                        <span>
                          {activeBanner
                            ? lang === 'id'
                              ? activeBanner.cta_label_id
                              : activeBanner.cta_label_en
                            : 'Jelajahi Konsentrasi Keahlian'}
                        </span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                      <Link
                        to="/spmb"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-medium bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors"
                      >
                        {lang === 'id' ? 'Informasi SPMB' : 'Admissions Info'}
                      </Link>
                    </div>
                  </div>

                  {banners.length > 1 && (
                    <div className="mt-6 flex items-center gap-2" role="group" aria-label={lang === 'id' ? 'Kontrol Slide Banner' : 'Hero Banner Controls'}>
                      <button
                        type="button"
                        onClick={() => setSlideIdx((i) => (i - 1 + banners.length) % banners.length)}
                        aria-label={lang === 'id' ? 'Banner sebelumnya' : 'Previous banner'}
                        className="p-2 rounded bg-black/45 hover:bg-black/65 text-white border border-white/20"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPaused((p) => !p)}
                        aria-label={
                          isPaused
                            ? lang === 'id'
                              ? 'Putar pergantian banner'
                              : 'Play banner rotation'
                            : lang === 'id'
                            ? 'Jeda pergantian banner'
                            : 'Pause banner rotation'
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-black/45 hover:bg-black/65 text-white text-xs border border-white/20"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        <span>{isPaused ? (lang === 'id' ? 'Putar' : 'Play') : lang === 'id' ? 'Jeda' : 'Pause'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideIdx((i) => (i + 1) % banners.length)}
                        aria-label={lang === 'id' ? 'Banner berikutnya' : 'Next banner'}
                        className="p-2 rounded bg-black/45 hover:bg-black/65 text-white border border-white/20"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="ml-2 text-xs text-stone-300 font-mono-tabular">
                        {slideIdx + 1} / {banners.length}
                      </span>
                    </div>
                  )}
                </div>
            </div>
          </section>
        );

      case 'announcements':
        if (announcements.length === 0) return null;
        return (
          <section key="announcements" aria-label={lang === 'id' ? 'Pengumuman Penting' : 'Important Announcements'} className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                  {lang === 'id' ? 'Pengumuman Penting' : 'Important Announcements'}
                </h2>
                <Link to="/berita" className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                  {lang === 'id' ? 'Semua Pengumuman' : 'All Announcements'} →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.slice(0, 4).map((ann) => (
                  <article key={ann.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950/60">
                    <div className="text-xs text-stone-500 dark:text-slate-400 mb-1">
                      <span className="uppercase font-semibold text-[#9A3412] dark:text-amber-400">{ann.category}</span>
                      {ann.valid_until && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>
                            {lang === 'id' ? 'Berlaku s.d.' : 'Valid until'} {formatIndonesianDate(ann.valid_until, lang)}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-sans font-semibold text-sm text-stone-900 dark:text-white mb-1">
                      {pickLang(lang, ann.title_id, ann.title_en)}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                      {pickLang(lang, ann.content_id, ann.content_en)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'quick_access':
        return (
          <section key="quick_access" aria-label="Akses Cepat Layanan Digital" className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  Integrated School Digital Portal
                </p>
                <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Akses Cepat Layanan Sekolah' : 'Quick Service Access'}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <div className="h-full p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between gap-3">
                    <Icon className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-semibold text-stone-900 dark:text-white leading-snug">
                        {item.label}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                );
                return item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="block">
                    {inner}
                  </a>
                ) : (
                  <Link key={item.label} to={item.href} className="block">
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        );

      case 'principal':
        return (
          <section key="principal" aria-label="Sambutan Kepala Sekolah" className="border-y border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4">
                <div className="aspect-3/4 max-w-xs mx-auto lg:mx-0 rounded-lg overflow-hidden border border-stone-200 dark:border-slate-800">
                  <ResilientImage
                    src={settings?.principal_photo}
                    alt={settings?.principal_name || 'Kepala SMK Negeri 3 Probolinggo'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="lg:col-span-8 space-y-4">
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Sambutan Kepala Sekolah' : 'Principal’s Welcome'}
                </div>
                <blockquote className="font-display text-2xl sm:text-3xl font-medium text-stone-900 dark:text-white leading-snug">
                  “{lang === 'id' ? settings?.principal_quote_id : settings?.principal_quote_en}”
                </blockquote>
                <div className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed max-w-prose">
                  {showFullMessage
                    ? lang === 'id'
                      ? settings?.principal_message_id
                      : settings?.principal_message_en
                    : `${((lang === 'id' ? settings?.principal_message_id : settings?.principal_message_en) || '').slice(0, 220)}...`}
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">{settings?.principal_name}</div>
                    <div className="text-xs text-stone-500 dark:text-slate-400">{settings?.principal_title}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowFullMessage((s) => !s)}
                      className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline"
                    >
                      {showFullMessage ? (lang === 'id' ? 'Ringkas Sambutan' : 'Collapse') : lang === 'id' ? 'Baca Selengkapnya' : 'Read Full Message'}
                    </button>
                    <Link to="/profil" className="text-sm font-medium text-stone-700 dark:text-slate-300 hover:underline">
                      {lang === 'id' ? 'Profil Sekolah →' : 'School Profile →'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'profile_summary':
        return (
          <section key="profile_summary" aria-label={lang === 'id' ? 'Profil Singkat Sekolah' : 'School Profile Summary'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {settings?.school_type} · {settings?.accreditation}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white text-balance">
                  {lang === 'id' ? `Profil Singkat ${settings?.school_name || ''}` : `Overview of ${settings?.school_name || ''}`}
                </h2>
                <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 leading-relaxed">
                  {pickLang(lang, settings?.vision_id, settings?.vision_en)}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    to="/profil"
                    style={{ backgroundColor: primaryColor }}
                    className="px-4 py-2.5 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    {lang === 'id' ? 'Jelajahi Profil Sekolah' : 'Explore School Profile'}
                  </Link>
                  <Link
                    to="/akademik"
                    className="px-4 py-2.5 rounded-md text-sm font-medium border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {lang === 'id' ? 'Kurikulum & Mutu' : 'Curriculum & Quality'}
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(lang === 'en' && settings?.mission_en?.length ? settings.mission_en : settings?.mission_id)?.map((m, idx) => (
                  <div key={idx} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="text-xs font-mono-tabular font-semibold text-[#1E3A8A] dark:text-blue-400 mb-2">
                      0{idx + 1}. {lang === 'id' ? 'Misi Sekolah' : 'School Mission'}
                    </div>
                    <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'departments':
        return (
          <section key="departments" aria-label={lang === 'id' ? 'Konsentrasi Keahlian' : 'Vocational Concentrations'} className="border-y border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                    {lang === 'id' ? 'Program & Kompetensi Vokasi' : 'Vocational Programs & Competencies'}
                  </div>
                  <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                    {lang === 'id' ? 'Konsentrasi Keahlian' : 'Vocational Concentrations'}
                  </h2>
                </div>
                <Link to="/konsentrasi-keahlian" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                  {lang === 'id' ? 'Lihat Semua Program →' : 'View All Programs →'}
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                  <article key={dept.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950 overflow-hidden flex flex-col">
                    <div className="aspect-4/3 overflow-hidden border-b border-stone-200 dark:border-slate-800">
                      <ResilientImage
                        src={dept.image_url}
                        alt={pickLang(lang, dept.name_id, dept.name_en)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="text-xs text-stone-500 dark:text-slate-400 mb-1">
                          <span>{lang === 'id' ? `Kode ${dept.code}` : `Code ${dept.code}`}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="tabular-nums">
                            {lang === 'id' ? `Daya Tampung ${dept.quota_spmb} siswa` : `Capacity ${dept.quota_spmb} students`}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-white">
                          {pickLang(lang, dept.name_id, dept.name_en)}
                        </h3>
                        <p className="text-sm text-stone-600 dark:text-slate-300 mt-2 leading-relaxed">
                          {pickLang(lang, dept.short_desc_id, dept.short_desc_en)}
                        </p>
                      </div>
                      <Link
                        to={`/konsentrasi-keahlian/${dept.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                      >
                        <span>{lang === 'id' ? 'Detail Konsentrasi' : 'Program Details'}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'news':
        return (
          <section key="news" aria-label={lang === 'id' ? 'Berita Terbaru' : 'Latest News'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Jurnalisme Sekolah 5W+1H' : 'School Newsroom (5W+1H)'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Berita & Publikasi Terbaru' : 'Latest News & Publications'}
                </h2>
              </div>
              <Link to="/berita" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {lang === 'id' ? 'Indeks Berita Lengkap →' : 'Full News Archive →'}
              </Link>
            </div>
            {posts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lead Story */}
                <article className="lg:col-span-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                  <div className="aspect-16/9 overflow-hidden border-b border-stone-200 dark:border-slate-800">
                    <ResilientImage
                      src={posts[0].featured_image}
                      alt={posts[0].image_alt || posts[0].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-stone-500 dark:text-slate-400 mb-2">
                        <span>{posts[0].category_name || (lang === 'id' ? 'Kegiatan Sekolah' : 'School Activity')}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{formatIndonesianDate(posts[0].published_at, lang)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{posts[0].author_name}</span>
                      </div>
                      <h3 className="font-display text-2xl font-semibold text-stone-900 dark:text-white leading-snug">
                        <Link to={`/berita/${posts[0].slug}`} className="hover:underline">
                          {posts[0].title}
                        </Link>
                      </h3>
                      <p className="text-sm text-stone-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {posts[0].summary}
                      </p>
                    </div>
                    <Link to={`/berita/${posts[0].slug}`} className="text-sm font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline">
                      {lang === 'id' ? 'Baca Selengkapnya →' : 'Read Full Story →'}
                    </Link>
                  </div>
                </article>

                {/* Secondary Stories */}
                <div className="lg:col-span-6 space-y-4">
                  {posts.slice(1, 4).map((post) => (
                    <article key={post.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
                      <div className="w-28 sm:w-36 aspect-4/3 rounded overflow-hidden shrink-0 border border-stone-200 dark:border-slate-800">
                        <ResilientImage src={post.featured_image} alt={post.image_alt || post.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-stone-500 dark:text-slate-400 mb-1 truncate">
                          <span>{post.category_name || (lang === 'id' ? 'Berita' : 'News')}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{formatIndonesianDate(post.published_at, lang)}</span>
                        </div>
                        <h3 className="font-display text-base font-semibold text-stone-900 dark:text-white leading-snug">
                          <Link to={`/berita/${post.slug}`} className="hover:underline">
                            {post.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-2">{post.summary}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        );

      case 'achievements':
        return (
          <section key="achievements" aria-label={lang === 'id' ? 'Prestasi Sekolah' : 'School Achievements'} className="border-y border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
              <div className="flex items-end justify-between gap-4 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                    {lang === 'id' ? 'Rekam Jejak Keunggulan' : 'Track Record of Excellence'}
                  </div>
                  <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                    {lang === 'id' ? 'Prestasi Siswa, Guru & Lembaga' : 'Student, Faculty & School Achievements'}
                  </h2>
                </div>
                <Link to="/kesiswaan" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                  {lang === 'id' ? 'Semua Prestasi →' : 'All Achievements →'}
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {achievements.slice(0, 4).map((ach) => (
                  <article key={ach.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950 overflow-hidden">
                    <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                      <ResilientImage src={ach.image_url} alt={ach.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                        {ach.level} · {ach.year} · {ach.recipient_type}
                      </div>
                      <h3 className="font-semibold text-sm text-stone-900 dark:text-white leading-snug">{ach.title}</h3>
                      <div className="text-xs text-stone-600 dark:text-slate-300">{ach.recipient_name}</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'events':
        return (
          <section key="events" aria-label={lang === 'id' ? 'Agenda Kegiatan' : 'School Events'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Kalender Akademik & Sekolah' : 'Academic & School Calendar'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Agenda Kegiatan Mendatang' : 'Upcoming Events & Schedule'}
                </h2>
              </div>
              <Link to="/berita#agenda" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {lang === 'id' ? 'Kalender Lengkap →' : 'Full Calendar →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {events.slice(0, 3).map((ev) => (
                <article key={ev.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#1E3A8A] dark:text-blue-400 font-medium tabular-nums">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{formatIndonesianDate(ev.start_date, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ev.time_range}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-white">{ev.title}</h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{ev.description}</p>
                  <div className="pt-2 text-xs text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{ev.location}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );

      case 'stats':
        return (
          <section key="stats" aria-label={lang === 'id' ? 'Statistik Sekolah' : 'School Statistics'} style={{ backgroundColor: primaryColor }} className="text-white py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
                <h2 className="font-display text-3xl font-semibold">
                  {lang === 'id' ? 'Statistik Kelembagaan' : 'Verified Institutional Statistics'}
                </h2>
                <span className="text-xs text-blue-100">
                  {lang === 'id' ? 'Periode Data:' : 'Data Period:'} {settings?.stats_period || 'Semester Ganjil 2026/2027'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((st) => (
                  <div key={st.id} className="border-t border-white/25 pt-4">
                    <div className="font-mono-tabular text-3xl sm:text-4xl font-semibold">
                      {formatNumberLocale(st.value, lang)}
                    </div>
                    <div className="text-sm text-blue-100 mt-1">
                      {pickLang(lang, st.label_id, st.label_en)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'tefa':
        return (
          <section key="tefa" aria-label={lang === 'id' ? 'Teaching Factory dan Karya Siswa' : 'Teaching Factory & Student Works'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Produksi & Inovasi Vokasi' : 'Vocational Production & Innovation'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Teaching Factory & Karya Unggulan Siswa' : 'Teaching Factory & Student Creations'}
                </h2>
              </div>
              <Link to="/akademik#tefa" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {lang === 'id' ? 'Katalog Lengkap Teaching Factory →' : 'Full Teaching Factory Catalog →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tefa.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                    <ResilientImage src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="text-xs text-stone-500 dark:text-slate-400">
                      <span className="uppercase">{item.item_type}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.department_name || (lang === 'id' ? 'Unit Produksi' : 'Production Unit')}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-white">{item.name}</h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
                    <div className="pt-2 font-mono-tabular text-sm font-semibold text-[#9A3412] dark:text-amber-400">
                      {formatIDR(item.price_idr)} / {item.unit_label}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {works.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {works.slice(0, 3).map((w) => (
                  <div key={w.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/50">
                    <div className="text-xs text-stone-500 dark:text-slate-400">
                      {lang === 'id' ? 'Karya Siswa' : 'Student Project'} · {w.department_name} · {w.year}
                    </div>
                    <div className="font-semibold text-sm text-stone-900 dark:text-white mt-1">{w.title}</div>
                    <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">{w.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case 'facilities':
        return (
          <section key="facilities" aria-label={lang === 'id' ? 'Sarana dan Prasarana' : 'Campus Facilities'} className="border-y border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
              <div className="flex items-end justify-between gap-4 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                    {lang === 'id' ? 'Fasilitas Pembelajaran Standar Industri' : 'Industry-Standard Learning Infrastructure'}
                  </div>
                  <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                    {lang === 'id' ? 'Sarana dan Prasarana Kampus' : 'Campus Facilities & Workshops'}
                  </h2>
                </div>
                <Link to="/sarana-prasarana" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                  {lang === 'id' ? 'Semua Fasilitas →' : 'All Facilities →'}
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {facilities.slice(0, 3).map((fac) => (
                  <article key={fac.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950 overflow-hidden">
                    <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                      <ResilientImage src={fac.image_url} alt={fac.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 space-y-1.5">
                      <div className="text-xs text-stone-500 dark:text-slate-400 uppercase">
                        {fac.category} · {lang === 'id' ? 'Kapasitas' : 'Capacity'} {fac.capacity}
                      </div>
                      <h3 className="font-semibold text-base text-stone-900 dark:text-white">{fac.name}</h3>
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{fac.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'partners':
        return (
          <section key="partners" aria-label={lang === 'id' ? 'Mitra Dunia Usaha dan Industri' : 'Industry Partners'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Link and Match DUDI' : 'Industry Link & Match'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Mitra Dunia Usaha & Dunia Industri' : 'Industry & Business Partners'}
                </h2>
              </div>
              <Link to="/humas-bkk" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {lang === 'id' ? 'Direktori Kemitraan & BKK →' : 'Partners & Job Center →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {partners.map((p) => (
                <div key={p.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono-tabular font-semibold text-[#1E3A8A] dark:text-blue-400">
                      <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{p.logo_text}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-white mt-2">{p.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">{p.cooperation_field}</p>
                  </div>
                  <div className="text-xs text-stone-400">{p.city} · {lang === 'id' ? 'Sejak' : 'Since'} {p.since_year}</div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key="testimonials" aria-label={lang === 'id' ? 'Testimoni Pemangku Kepentingan' : 'Stakeholder Testimonials'} className="border-y border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
              <div className="mb-8">
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Suara Alumni, Orang Tua, Mitra & Siswa' : 'Voices from Alumni, Parents, Partners & Students'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Testimoni Terverifikasi' : 'Verified Testimonials'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {testimonials.map((t) => (
                  <figure key={t.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950 flex flex-col justify-between gap-4">
                    <blockquote className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed italic">
                      “{t.quote}”
                    </blockquote>
                    <figcaption className="border-t border-stone-200 dark:border-slate-800 pt-3">
                      <div className="font-semibold text-sm text-stone-900 dark:text-white">{t.author_name}</div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        {t.author_role} · {t.organization}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section key="gallery" aria-label={lang === 'id' ? 'Galeri Foto dan Video' : 'Photo & Documentation Gallery'} className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Dokumentasi Aktivitas Kampus' : 'Campus Life Documentation'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white mt-1">
                  {lang === 'id' ? 'Galeri Foto & Dokumentasi' : 'Photo & Media Gallery'}
                </h2>
              </div>
              <Link to="/berita#galeri" className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {lang === 'id' ? 'Lihat Galeri Lengkap →' : 'View Full Gallery →'}
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleries.slice(0, 6).map((g) => (
                <figure key={g.id} className="rounded-lg border border-stone-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="aspect-4/3 overflow-hidden">
                    <ResilientImage src={g.media_url} alt={g.title} className="w-full h-full object-cover" />
                  </div>
                  <figcaption className="p-3">
                    <div className="text-xs text-stone-500 dark:text-slate-400">{g.album}</div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-white mt-0.5">{g.title}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );

      case 'location':
        return (
          <section key="location" aria-label={lang === 'id' ? 'Lokasi Sekolah' : 'Campus Location'} className="border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? 'Kampus & Layanan Tata Usaha' : 'Campus & Administration Office'}
                </div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-white">
                  {lang === 'id' ? `Lokasi ${settings?.school_name || ''}` : `${settings?.school_name || ''} Campus Location`}
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                  {settings?.address}
                </p>
                <div className="text-sm space-y-1 text-stone-700 dark:text-slate-300">
                  <div>{lang === 'id' ? 'Telepon:' : 'Phone:'} {settings?.phone}</div>
                  <div>Email: {settings?.email}</div>
                  <div>{lang === 'id' ? 'Jam Pelayanan: Senin–Jumat, 07:00–15:30 WIB' : 'Office Hours: Monday–Friday, 07:00–15:30 WIB'}</div>
                </div>
                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${settings?.map_lat || -7.7569}&mlon=${settings?.map_lng || 113.2156}#map=16/${settings?.map_lat || -7.7569}/${settings?.map_lng || 113.2156}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: primaryColor }}
                    className="px-4 py-2.5 rounded-md text-sm font-medium text-white hover:opacity-90"
                  >
                    {lang === 'id' ? 'Petunjuk Arah Peta' : 'Open Directions'}
                  </a>
                  <Link
                    to="/kontak"
                    className="px-4 py-2.5 rounded-md text-sm font-medium border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                  >
                    {lang === 'id' ? 'Kirim Pesan Resmi' : 'Send Official Message'}
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-7 rounded-lg border border-stone-200 dark:border-slate-800 overflow-hidden bg-stone-100 dark:bg-slate-800">
                <iframe
                  title={lang === 'id' ? 'Peta Lokasi SMK Negeri 3 Probolinggo' : 'Location Map of SMK Negeri 3 Probolinggo'}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=113.2056%2C-7.7649%2C113.2256%2C-7.7489&layer=mapnik&marker=${settings?.map_lat || -7.7569}%2C${settings?.map_lng || 113.2156}`}
                  className="w-full h-72 border-0"
                  loading="lazy"
                />
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return <>{orderedSections.map((s) => renderSection(s.section_key))}</>;
};
