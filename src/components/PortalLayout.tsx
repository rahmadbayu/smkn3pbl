import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Accessibility,
  ChevronDown,
  Globe,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';

interface SearchResult {
  departments: Array<{ id: number; slug: string; name_id: string; name_en?: string; short_desc_id: string; short_desc_en?: string }>;
  posts: Array<{ id: number; slug: string; title: string; summary: string }>;
  services: Array<{ id: number; slug: string; name_id: string; name_en?: string; estimated_sla: string }>;
  documents: Array<{ id: number; title: string; ppid_group: string; file_url: string }>;
  jobs: Array<{ id: number; title: string; company_name: string; location: string }>;
}

const MEGA_MENU_GROUPS = [
  {
    key: 'profil',
    label_id: 'Profil & Akademik',
    label_en: 'Profile & Academics',
    items: [
      { label_id: 'Profil, Sejarah & Visi Misi', label_en: 'School Profile & Vision', href: '/profil' },
      { label_id: 'Guru & Tenaga Kependidikan', label_en: 'Faculty & Staff', href: '/profil#gtk' },
      { label_id: 'Kurikulum & Kalender Akademik', label_en: 'Curriculum & Calendar', href: '/akademik' },
      { label_id: 'Sarana, Prasarana & Sekolah ASRI', label_en: 'Campus Facilities & ASRI', href: '/sarana-prasarana' },
      { label_id: 'Penjaminan Mutu & Survei', label_en: 'Quality Assurance & Survey', href: '/penjaminan-mutu' },
    ],
  },
  {
    key: 'keahlian',
    label_id: 'Konsentrasi Keahlian',
    label_en: 'Programs',
    items: [
      { label_id: 'Semua Konsentrasi Keahlian', label_en: 'All Vocational Programs', href: '/konsentrasi-keahlian' },
      { label_id: 'Kuliner', label_en: 'Culinary Arts', href: '/konsentrasi-keahlian/kuliner' },
      { label_id: 'Desain dan Produksi Busana', label_en: 'Fashion Design & Production', href: '/konsentrasi-keahlian/desain-dan-produksi-busana' },
      { label_id: 'Perhotelan', label_en: 'Hospitality Management', href: '/konsentrasi-keahlian/perhotelan' },
      { label_id: 'Tata Kecantikan Kulit dan Rambut', label_en: 'Beauty Therapy & Hairdressing', href: '/konsentrasi-keahlian/tata-kecantikan-kulit-dan-rambut' },
      { label_id: 'Desain Komunikasi Visual', label_en: 'Visual Communication Design', href: '/konsentrasi-keahlian/desain-komunikasi-visual' },
    ],
  },
  {
    key: 'kesiswaan',
    label_id: 'SPMB, BKK & Kesiswaan',
    label_en: 'Admissions & Industry',
    items: [
      { label_id: 'Informasi SPMB Murid Baru', label_en: 'SPMB Admissions', href: '/spmb' },
      { label_id: 'Kesiswaan, OSIS & Ekstrakurikuler', label_en: 'Student Affairs & Clubs', href: '/kesiswaan' },
      { label_id: 'Bursa Kerja Khusus & Mitra Industri', label_en: 'Job Center & Industry Partners', href: '/humas-bkk' },
      { label_id: 'Teaching Factory & Karya Siswa', label_en: 'Teaching Factory', href: '/akademik#tefa' },
    ],
  },
  {
    key: 'publik',
    label_id: 'Berita & Keterbukaan Info',
    label_en: 'News & Public Info',
    items: [
      { label_id: 'Berita, Agenda & Galeri', label_en: 'News, Events & Gallery', href: '/berita' },
      { label_id: 'Informasi Publik (PPID)', label_en: 'Public Information (PPID)', href: '/informasi-publik' },
      { label_id: 'Kontak & Lokasi Sekolah', label_en: 'Contact & Map', href: '/kontak' },
      { label_id: 'Peta Situs & Kebijakan Privasi', label_en: 'Sitemap & Privacy Policy', href: '/peta-situs' },
    ],
  },
];

export const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    settings,
    lang,
    setLang,
    darkMode,
    toggleDarkMode,
    a11y,
    setA11y,
    resetA11y,
  } = usePortal();
  const location = useLocation();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Optional AI Info Assistant state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [settings?.logo_url]);

  useEffect(() => {
    setActiveDropdown(null);
    setMobileOpen(false);
    setA11yOpen(false);
    // Privacy-preserving visit counter
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname }),
    }).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.ok
            ? data.answer
            : data.error ||
              (lang === 'id'
                ? 'Asisten AI belum tersedia. Silakan hubungi kontak resmi sekolah.'
                : 'AI assistant is currently unavailable. Please contact the school administration directly.'),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            lang === 'id'
              ? 'Gagal terhubung ke layanan asisten informasi.'
              : 'Failed to connect to the school information assistant.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const schoolName = settings?.school_name || 'SMK Negeri 3 Probolinggo';

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#1E3A8A] focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        {lang === 'id' ? 'Lewati ke konten utama' : 'Skip to main content'}
      </a>

      {/* Slim Institutional Utility Strip */}
      <div className="border-b border-stone-200 dark:border-slate-800 bg-stone-100/80 dark:bg-slate-900 text-xs text-stone-600 dark:text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-3 truncate">
            <span className="truncate">{settings?.phone || '(0335) 421123'}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{settings?.email || 'info@smkn3probolinggo.sch.id'}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={lang === 'id' ? 'Buka pencarian portal' : 'Open portal search'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden md:inline">{lang === 'id' ? 'Cari' : 'Search'}</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setA11yOpen((o) => !o)}
                aria-expanded={a11yOpen}
                aria-label={lang === 'id' ? 'Pengaturan aksesibilitas' : 'Accessibility settings'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">{lang === 'id' ? 'Aksesibilitas' : 'Accessibility'}</span>
              </button>
              {a11yOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-4 z-50 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 dark:text-slate-100">
                      {lang === 'id' ? 'Aksesibilitas WCAG' : 'Accessibility'}
                    </span>
                    <button
                      type="button"
                      onClick={resetA11y}
                      className="text-xs underline text-stone-600 dark:text-slate-400 hover:text-stone-900"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-stone-500 dark:text-slate-400">
                      {lang === 'id' ? 'Ukuran Teks' : 'Text Size'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['normal', 'large', 'xlarge'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setA11y((s) => ({ ...s, fontScale: sz }))}
                          className={`py-1 rounded border text-xs font-medium ${
                            a11y.fontScale === sz
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                              : 'border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {sz === 'normal' ? '100%' : sz === 'large' ? '115%' : '125%'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>{lang === 'id' ? 'Kontras Tinggi' : 'High Contrast'}</span>
                    <input
                      type="checkbox"
                      checked={a11y.highContrast}
                      onChange={(e) => setA11y((s) => ({ ...s, highContrast: e.target.checked }))}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>{lang === 'id' ? 'Kurangi Animasi' : 'Reduce Motion'}</span>
                    <input
                      type="checkbox"
                      checked={a11y.reduceMotion}
                      onChange={(e) => setA11y((s) => ({ ...s, reduceMotion: e.target.checked }))}
                    />
                  </label>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={
                darkMode
                  ? lang === 'id'
                    ? 'Aktifkan mode terang'
                    : 'Switch to light mode'
                  : lang === 'id'
                  ? 'Aktifkan mode gelap'
                  : 'Switch to dark mode'
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <div
              role="group"
              aria-label={lang === 'id' ? 'Pilih Bahasa Portal' : 'Select Portal Language'}
              className="inline-flex items-center rounded border border-stone-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-0.5 whitespace-nowrap shrink-0"
            >
              <Globe className="w-3 h-3 text-stone-500 dark:text-slate-400 mx-1.5" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setLang('id')}
                aria-pressed={lang === 'id'}
                aria-label="Bahasa Indonesia"
                title="Bahasa Indonesia"
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  lang === 'id'
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                aria-label="English"
                title="English"
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  lang === 'en'
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-800 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>CMS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main 3-Zone Header Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-stone-200 dark:border-slate-800 bg-[#FBF9F5]/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: School Crest + Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-stone-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            {settings?.logo_url && !logoFailed ? (
              <img
                src={settings.logo_url}
                alt={`Logo ${schoolName}`}
                onError={() => setLogoFailed(true)}
                className="w-8 h-8 rounded object-cover shrink-0 border border-stone-200 dark:border-slate-700 bg-white"
              />
            ) : (
              <span
                className="w-8 h-8 rounded flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
                style={{ backgroundColor: settings?.primary_color || '#1E3A8A' }}
                aria-hidden="true"
              >
                S3
              </span>
            )}
            <span className="font-display font-semibold text-base sm:text-lg tracking-tight">
              {schoolName}
            </span>
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links with Mega Menu Dropdowns */}
          <nav aria-label="Navigasi Utama" className="hidden lg:flex items-center gap-5 text-sm font-medium">
            <Link
              to="/"
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                location.pathname === '/'
                  ? 'border-[#1E3A8A] text-stone-900 dark:text-white dark:border-blue-400'
                  : 'border-transparent text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {lang === 'id' ? 'Beranda' : 'Home'}
            </Link>

            {MEGA_MENU_GROUPS.map((group) => (
              <div
                key={group.key}
                className="relative"
                onMouseEnter={() => setActiveDropdown(group.key)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  type="button"
                  aria-expanded={activeDropdown === group.key}
                  onClick={() => setActiveDropdown((cur) => (cur === group.key ? null : group.key))}
                  className="inline-flex items-center gap-1 py-1 text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>{lang === 'id' ? group.label_id : group.label_en}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
                </button>
                {activeDropdown === group.key && (
                  <div className="absolute left-0 top-full pt-2 w-72 z-50">
                    <div className="rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="block px-4 py-2 text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-stone-900 dark:hover:text-white transition-colors"
                        >
                          {lang === 'id' ? item.label_id : item.label_en}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/layanan-digital"
              style={{ backgroundColor: settings?.primary_color || '#1E3A8A' }}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              {lang === 'id' ? 'Layanan Digital' : 'Digital Services'}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={lang === 'id' ? 'Buka menu navigasi' : 'Toggle navigation menu'}
              className="lg:hidden p-2 rounded-md border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[75vh] overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-stone-100 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                {lang === 'id' ? 'Bahasa / Language' : 'Language / Bahasa'}
              </span>
              <div className="inline-flex rounded border border-stone-300 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setLang('id')}
                  aria-pressed={lang === 'id'}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    lang === 'id' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
                  }`}
                >
                  Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    lang === 'en' ? 'bg-[#1E3A8A] text-white' : 'text-stone-600 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
            <Link to="/" className="block font-medium text-stone-900 dark:text-slate-100 py-1">
              {lang === 'id' ? 'Beranda' : 'Home'}
            </Link>
            {MEGA_MENU_GROUPS.map((group) => (
              <div key={group.key} className="space-y-1.5 border-t border-stone-100 dark:border-slate-800 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                  {lang === 'id' ? group.label_id : group.label_en}
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="block py-1.5 text-sm text-stone-700 dark:text-slate-200"
                  >
                    {lang === 'id' ? item.label_id : item.label_en}
                  </Link>
                ))}
              </div>
            ))}
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex gap-2">
              <Link
                to="/layanan-digital"
                style={{ backgroundColor: settings?.primary_color || '#1E3A8A' }}
                className="flex-1 text-center py-2.5 text-sm font-medium text-white rounded-md"
              >
                {lang === 'id' ? 'Layanan Digital' : 'Digital Services'}
              </Link>
              <Link
                to="/admin"
                className="px-4 py-2.5 text-sm font-medium border border-stone-300 dark:border-slate-700 rounded-md"
              >
                CMS
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-900 text-stone-700 dark:text-slate-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="font-display font-semibold text-lg text-stone-900 dark:text-white">
              {schoolName}
            </div>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-slate-400">
              {settings?.address || 'Jl. Pahlawan No. 26A, Kota Probolinggo, Jawa Timur 67211'}
            </p>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {settings?.phone} · {settings?.email}
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white font-sans">
              {lang === 'id' ? 'Tautan Akademik & Vokasi' : 'Academic & Vocational Links'}
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/konsentrasi-keahlian" className="hover:underline">{lang === 'id' ? 'Konsentrasi Keahlian' : 'Vocational Programs'}</Link></li>
              <li><Link to="/spmb" className="hover:underline">{lang === 'id' ? 'Informasi SPMB' : 'SPMB Admissions'}</Link></li>
              <li><Link to="/akademik" className="hover:underline">{lang === 'id' ? 'Kurikulum & Teaching Factory' : 'Curriculum & Teaching Factory'}</Link></li>
              <li><Link to="/humas-bkk" className="hover:underline">{lang === 'id' ? 'Bursa Kerja Khusus & Mitra' : 'Job Center & Industry Partners'}</Link></li>
              <li><Link to="/penjaminan-mutu" className="hover:underline">{lang === 'id' ? 'Penjaminan Mutu & Survei' : 'Quality Assurance & Survey'}</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white font-sans">
              {lang === 'id' ? 'Tata Kelola & Layanan Publik' : 'Governance & Public Services'}
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/layanan-digital" className="hover:underline">{lang === 'id' ? 'Layanan Administrasi Digital' : 'Digital Administration Services'}</Link></li>
              <li><Link to="/informasi-publik" className="hover:underline">{lang === 'id' ? 'Keterbukaan Informasi Publik (PPID)' : 'Public Information Disclosure (PPID)'}</Link></li>
              <li><Link to="/layanan-digital#pengaduan" className="hover:underline">{lang === 'id' ? 'Kanal Pengaduan Masyarakat' : 'Public Complaints Channel'}</Link></li>
              <li><Link to="/peta-situs" className="hover:underline">{lang === 'id' ? 'Peta Situs & Kebijakan Privasi' : 'Sitemap & Privacy Policy'}</Link></li>
              <li><Link to="/peta-situs#aksesibilitas" className="hover:underline">{lang === 'id' ? 'Pernyataan Aksesibilitas' : 'Accessibility Statement'}</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white font-sans">
              {lang === 'id' ? 'Integrasi & Media Resmi' : 'Integrations & Official Channels'}
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href={settings?.integrations?.erapor_url || '#'} target="_blank" rel="noreferrer" className="hover:underline">
                  {lang === 'id' ? 'Portal e-Rapor SMK' : 'e-Rapor SMK Portal'}
                </a>
              </li>
              <li>
                <a href={settings?.integrations?.dapodik_url || '#'} target="_blank" rel="noreferrer" className="hover:underline">
                  {lang === 'id' ? 'Data Pokok Pendidikan (Dapodik)' : 'National Education Data (Dapodik)'}
                </a>
              </li>
              <li><a href="/api/sitemap.xml" target="_blank" rel="noreferrer" className="hover:underline">XML Sitemap</a></li>
              <li><Link to="/kontak" className="hover:underline">{lang === 'id' ? 'Hubungi Tata Usaha' : 'Contact Administration'}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-200 dark:border-slate-800 py-5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-slate-400">
            <span>
              © {new Date().getFullYear()} {schoolName}. {lang === 'id' ? 'Portal Digital Sekolah Terintegrasi.' : 'Integrated School Digital Portal.'}
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/peta-situs#privasi" className="hover:underline">{lang === 'id' ? 'Kebijakan Privasi (UU PDP)' : 'Privacy Policy'}</Link>
              <Link to="/peta-situs#penggunaan" className="hover:underline">{lang === 'id' ? 'Kebijakan Penggunaan' : 'Terms of Use'}</Link>
              <Link to="/peta-situs#srs" className="hover:underline">{lang === 'id' ? 'Arsitektur & Dokumentasi' : 'Architecture & Docs'}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'id' ? 'Pencarian Portal Sekolah' : 'School Portal Search'}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
        >
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 dark:border-slate-800">
              <Search className="w-5 h-5 text-stone-400" aria-hidden="true" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'id' ? 'Cari berita, jurusan, layanan, lowongan, atau dokumen PPID...' : 'Search news, programs, services, jobs, or public documents...'}
                className="flex-1 bg-transparent text-sm outline-none text-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label={lang === 'id' ? 'Tutup pencarian' : 'Close search'}
                className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {searching && <p className="text-sm text-stone-500">{lang === 'id' ? 'Mencari di seluruh portal...' : 'Searching across the portal...'}</p>}
              {!searching && searchQuery.trim().length < 2 && (
                <p className="text-sm text-stone-500">
                  {lang === 'id' ? 'Ketik minimal 2 huruf untuk memulai pencarian.' : 'Type at least 2 characters to search.'}
                </p>
              )}
              {!searching && searchResults && (
                <div className="space-y-4 text-sm">
                  {searchResults.departments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                        {lang === 'id' ? 'Konsentrasi Keahlian' : 'Vocational Programs'}
                      </h4>
                      {searchResults.departments.map((d) => (
                        <Link key={d.id} to={`/konsentrasi-keahlian/${d.slug}`} onClick={() => setSearchOpen(false)} className="block py-1.5 hover:underline font-medium">
                          {lang === 'en' && d.name_en ? d.name_en : d.name_id}
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.posts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                        {lang === 'id' ? 'Berita & Publikasi' : 'News & Publications'}
                      </h4>
                      {searchResults.posts.map((p) => (
                        <Link key={p.id} to={`/berita/${p.slug}`} onClick={() => setSearchOpen(false)} className="block py-1.5 hover:underline">
                          {p.title}
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.services.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                        {lang === 'id' ? 'Layanan Digital' : 'Digital Services'}
                      </h4>
                      {searchResults.services.map((s) => (
                        <Link key={s.id} to="/layanan-digital" onClick={() => setSearchOpen(false)} className="block py-1.5 hover:underline">
                          {lang === 'en' && s.name_en ? s.name_en : s.name_id} · {s.estimated_sla}
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.documents.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                        {lang === 'id' ? 'Informasi Publik' : 'Public Documents'}
                      </h4>
                      {searchResults.documents.map((doc) => (
                        <Link key={doc.id} to="/informasi-publik" onClick={() => setSearchOpen(false)} className="block py-1.5 hover:underline">
                          {doc.title}
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.departments.length === 0 &&
                    searchResults.posts.length === 0 &&
                    searchResults.services.length === 0 &&
                    searchResults.documents.length === 0 && (
                      <p className="text-stone-500">
                        {lang === 'id'
                          ? `Tidak ada hasil yang cocok untuk "${searchQuery}".`
                          : `No matching results found for "${searchQuery}".`}
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optional Public Information AI Assistant Button & Drawer */}
      {settings?.ai_enabled && (
        <div className="fixed bottom-4 right-4 z-40">
          {!chatOpen ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              aria-label={lang === 'id' ? 'Buka Asisten Informasi Sekolah' : 'Open School Info Assistant'}
              style={{ backgroundColor: settings?.primary_color || '#1E3A8A' }}
              className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-medium shadow-lg hover:opacity-95 transition-opacity"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Asisten Info Sekolah' : 'School Info Assistant'}</span>
              <span className="sm:hidden">{lang === 'id' ? 'Tanya Info' : 'Ask Info'}</span>
            </button>
          ) : (
            <div className="w-80 sm:w-96 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
              <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-white">
                    {lang === 'id' ? 'Asisten Informasi Publik' : 'Public Information Assistant'}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    {lang === 'id' ? 'Berbasis data publik terverifikasi sekolah' : 'Grounded in verified public school data'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label={lang === 'id' ? 'Tutup asisten' : 'Close assistant'}
                  className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {chatMessages.length === 0 && (
                  <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'id'
                      ? `Tanyakan informasi umum mengenai konsentrasi keahlian, layanan administrasi, atau pengumuman resmi ${schoolName}.`
                      : `Ask general questions about vocational programs, administrative services, or official announcements at ${schoolName}.`}
                  </p>
                )}
                {chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-stone-100 dark:bg-slate-800 ml-6 text-stone-900 dark:text-white'
                        : 'border border-stone-200 dark:border-slate-700 mr-4 text-stone-800 dark:text-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-stone-500">
                    {lang === 'id' ? 'Menyusun jawaban...' : 'Preparing answer...'}
                  </div>
                )}
              </div>
              <form onSubmit={handleChatSend} className="p-3 border-t border-stone-200 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={lang === 'id' ? 'Tulis pertanyaan...' : 'Type your question...'}
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-stone-200 dark:border-slate-700 bg-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  aria-label={lang === 'id' ? 'Kirim pertanyaan' : 'Send question'}
                  style={{ backgroundColor: settings?.primary_color || '#1E3A8A' }}
                  className="px-3 py-2 rounded-md text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
