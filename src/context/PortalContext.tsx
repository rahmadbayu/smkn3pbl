import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { parseLanguagePreference } from '../utils/portalLogic';
import type {
  Announcement,
  Banner,
  Category,
  HomepageSection,
  Language,
  MenuItem,
  SchoolSettings,
  SchoolStat,
} from '../shared/types';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role_slug: string;
  role_name: string;
  department_id: number | null;
  permissions: string[];
}

interface A11yState {
  fontScale: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reduceMotion: boolean;
}

interface PortalContextValue {
  loading: boolean;
  error: string | null;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  a11y: A11yState;
  setA11y: React.Dispatch<React.SetStateAction<A11yState>>;
  resetA11y: () => void;
  settings: SchoolSettings | null;
  sections: HomepageSection[];
  menus: MenuItem[];
  banners: Banner[];
  announcements: Announcement[];
  stats: SchoolStat[];
  categories: Category[];
  refreshBootstrap: () => Promise<void>;
  authToken: string | null;
  authUser: AuthUser | null;
  setAuthSession: (token: string | null, user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

const LANG_STORAGE_KEY = 'smkn3_portal_lang';

function readStoredLang(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Language>(() =>
    parseLanguagePreference(
      typeof window !== 'undefined' ? window.location.search : '',
      readStoredLang()
    )
  );
  const [darkMode, setDarkMode] = useState(false);

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, []);
  const [a11y, setA11y] = useState<A11yState>({
    fontScale: 'normal',
    highContrast: false,
    reduceMotion: false,
  });

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<SchoolStat[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Auth token stored strictly in React memory (never localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const setAuthSession = useCallback((token: string | null, user: AuthUser | null) => {
    setAuthToken(token);
    setAuthUser(user);
  }, []);

  const logout = useCallback(async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    setAuthToken(null);
    setAuthUser(null);
  }, [authToken]);

  const refreshBootstrap = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Gagal memuat konfigurasi portal.');
      const data = await res.json();
      setSettings(data.settings);
      setSections(data.sections || []);
      setMenus(data.menus || []);
      setBanners(data.banners || []);
      setAnnouncements(data.announcements || []);
      setStats(data.stats || []);
      setCategories(data.categories || []);

      if (data.settings?.primary_color) {
        document.documentElement.style.setProperty('--brand-primary', data.settings.primary_color);
      }
      if (data.settings?.secondary_color) {
        document.documentElement.style.setProperty('--brand-secondary', data.settings.secondary_color);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('a11y-large-text', 'a11y-xlarge-text', 'a11y-high-contrast', 'a11y-reduce-motion');
    if (a11y.fontScale === 'large') root.classList.add('a11y-large-text');
    if (a11y.fontScale === 'xlarge') root.classList.add('a11y-xlarge-text');
    if (a11y.highContrast) root.classList.add('a11y-high-contrast');
    if (a11y.reduceMotion) root.classList.add('a11y-reduce-motion');
  }, [a11y]);

  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);
  const resetA11y = useCallback(() => {
    setA11y({ fontScale: 'normal', highContrast: false, reduceMotion: false });
    setDarkMode(false);
  }, []);

  return (
    <PortalContext.Provider
      value={{
        loading,
        error,
        lang,
        setLang,
        darkMode,
        toggleDarkMode,
        a11y,
        setA11y,
        resetA11y,
        settings,
        sections,
        menus,
        banners,
        announcements,
        stats,
        categories,
        refreshBootstrap,
        authToken,
        authUser,
        setAuthSession,
        logout,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider');
  return ctx;
}
