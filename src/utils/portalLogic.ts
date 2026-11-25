import type { PostStatus, ServiceRequestStatus } from '../shared/types';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const POST_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['submitted', 'published', 'archived'],
  submitted: ['review', 'revision', 'approved', 'published', 'draft'],
  review: ['revision', 'approved', 'scheduled', 'published'],
  revision: ['submitted', 'review', 'draft'],
  approved: ['scheduled', 'published', 'archived'],
  scheduled: ['published', 'draft', 'archived'],
  published: ['archived', 'draft'],
  archived: ['draft', 'published'],
};

export function canTransitionPostStatus(from: PostStatus, to: PostStatus): boolean {
  if (from === to) return true;
  return POST_TRANSITIONS[from]?.includes(to) ?? false;
}

const REQUEST_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  diajukan: ['diverifikasi', 'perlu_perbaikan', 'ditolak', 'dibatalkan'],
  diverifikasi: ['diproses', 'perlu_perbaikan', 'ditolak', 'dibatalkan'],
  diproses: ['selesai', 'perlu_perbaikan', 'ditolak'],
  perlu_perbaikan: ['diverifikasi', 'diproses', 'dibatalkan'],
  selesai: [],
  ditolak: [],
  dibatalkan: [],
};

export function canTransitionRequestStatus(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus
): boolean {
  if (from === to) return true;
  return REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(requiredPermission)) return true;
  const [resource] = requiredPermission.split('.');
  if (resource && userPermissions.includes(`${resource}.*`)) return true;
  return false;
}

export interface RawSurveyResponse {
  rating_informasi: number;
  rating_pelayanan: number;
  rating_fasilitas: number;
  rating_transparansi: number;
}

export function computeSurveyAggregates(responses: RawSurveyResponse[]) {
  if (responses.length === 0) {
    return {
      count: 0,
      overallAverage: 0,
      aspects: {
        informasi: 0,
        pelayanan: 0,
        fasilitas: 0,
        transparansi: 0,
      },
    };
  }

  let sumInfo = 0;
  let sumServ = 0;
  let sumFac = 0;
  let sumTrans = 0;

  for (const r of responses) {
    sumInfo += r.rating_informasi;
    sumServ += r.rating_pelayanan;
    sumFac += r.rating_fasilitas;
    sumTrans += r.rating_transparansi;
  }

  const n = responses.length;
  const info = Number((sumInfo / n).toFixed(2));
  const serv = Number((sumServ / n).toFixed(2));
  const fac = Number((sumFac / n).toFixed(2));
  const trans = Number((sumTrans / n).toFixed(2));
  const overall = Number(((info + serv + fac + trans) / 4).toFixed(2));

  return {
    count: n,
    overallAverage: overall,
    aspects: {
      informasi: info,
      pelayanan: serv,
      fasilitas: fac,
      transparansi: trans,
    },
  };
}

export function formatIndonesianDate(isoDate: string | null | undefined, lang: 'id' | 'en' = 'id'): string {
  if (!isoDate) return '-';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(parsed);
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberLocale(value: number, lang: 'id' | 'en' = 'id'): string {
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(value);
}

export function pickLang(
  lang: 'id' | 'en',
  idText: string | null | undefined,
  enText?: string | null
): string {
  if (lang === 'en' && enText && enText.trim().length > 0) {
    return enText;
  }
  return idText || enText || '';
}

export function parseLanguagePreference(search: string, storedValue: string | null | undefined): 'id' | 'en' {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const queryLang = params.get('lang')?.toLowerCase();
  if (queryLang === 'en' || queryLang === 'id') return queryLang;
  if (storedValue === 'en' || storedValue === 'id') return storedValue;
  return 'id';
}

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:';
  } catch {
    return false;
  }
}

export function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getFocalPointClass(focalPoint?: string | null): string {
  switch (focalPoint) {
    case 'top':
      return 'object-top';
    case 'bottom':
      return 'object-bottom';
    case 'left':
      return 'object-left';
    case 'right':
      return 'object-right';
    default:
      return 'object-center';
  }
}

export function generateTicketNumber(prefix: 'REQ' | 'ADU', date = new Date(), sequenceSuffix?: string): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const suffix = sequenceSuffix ?? Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yyyy}${mm}${dd}-${suffix}`;
}

export function buildPreviewUrl(path: string, lang: 'id' | 'en', refreshKey = 0): string {
  const trimmed = path.trim();
  const safePath = trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed : '/';
  const [withoutHash, hash] = safePath.split('#');
  const [pathname, existingQuery] = withoutHash.split('?');
  const params = new URLSearchParams(existingQuery || '');
  params.set('lang', lang);
  if (refreshKey > 0) {
    params.set('_pv', String(refreshKey));
  }
  const queryStr = params.toString();
  return `${pathname || '/'}${queryStr ? `?${queryStr}` : ''}${hash ? `#${hash}` : ''}`;
}

export function getPreviewPresetForTab(tab: string): string {
  switch (tab) {
    case 'posts':
      return '/berita';
    case 'programs':
      return '/konsentrasi-keahlian';
    case 'services':
      return '/informasi-publik';
    case 'layout':
    case 'settings':
    default:
      return '/';
  }
}

export type AuditCategory = 'auth' | 'content' | 'settings' | 'governance';

const AUTH_ACTIONS = new Set([
  'LOGIN',
  'LOGIN_FAILED',
  'LOGIN_RATE_LIMITED',
  'LOGOUT',
  'REVOKE_SESSION',
  'CLAIM_SUPER_ADMIN',
]);

const SETTINGS_ACTIONS = new Set([
  'UPDATE_SETTINGS',
  'UPDATE_STATS',
  'UPDATE_HOMEPAGE_SECTIONS',
  'CREATE_MENU',
  'UPDATE_MENU',
  'DELETE_MENU',
]);

const CONTENT_ACTIONS = new Set([
  'CREATE_POST',
  'UPDATE_POST',
  'SOFT_DELETE_POST',
  'RESTORE_POST',
  'CREATE_ANNOUNCEMENT',
  'DELETE_ANNOUNCEMENT',
  'CREATE_EVENT',
  'DELETE_EVENT',
  'CREATE_BANNER',
  'UPDATE_BANNER',
  'DELETE_BANNER',
  'CREATE_DEPARTMENT',
  'UPDATE_DEPARTMENT',
  'CREATE_ACHIEVEMENT',
  'DELETE_ACHIEVEMENT',
  'CREATE_TEACHER',
  'DELETE_TEACHER',
  'CREATE_PARTNER',
  'DELETE_PARTNER',
  'CREATE_JOB',
  'DELETE_JOB',
  'CREATE_TEFA',
  'DELETE_TEFA',
  'UPLOAD_MEDIA',
  'DELETE_MEDIA',
  'CREATE_DOCUMENT',
  'DELETE_DOCUMENT',
]);

export function classifyAuditAction(action: string): AuditCategory {
  const normalized = String(action || '').trim().toUpperCase();
  if (AUTH_ACTIONS.has(normalized) || normalized.startsWith('LOGIN') || normalized.includes('SESSION')) {
    return 'auth';
  }
  if (SETTINGS_ACTIONS.has(normalized) || normalized.includes('SETTING') || normalized.includes('MENU')) {
    return 'settings';
  }
  if (
    CONTENT_ACTIONS.has(normalized) ||
    normalized.includes('POST') ||
    normalized.includes('BANNER') ||
    normalized.includes('ANNOUNCEMENT') ||
    normalized.includes('EVENT') ||
    normalized.includes('DEPARTMENT') ||
    normalized.includes('ACHIEVEMENT') ||
    normalized.includes('TEACHER') ||
    normalized.includes('PARTNER') ||
    normalized.includes('JOB') ||
    normalized.includes('TEFA') ||
    normalized.includes('MEDIA') ||
    normalized.includes('DOCUMENT')
  ) {
    return 'content';
  }
  return 'governance';
}

export function getAuditCategoryLabel(category: AuditCategory): string {
  switch (category) {
    case 'auth':
      return 'Login & Sesi';
    case 'content':
      return 'Pembaruan Konten';
    case 'settings':
      return 'Pengaturan';
    case 'governance':
      return 'Tata Kelola & Layanan';
  }
}

export interface AuditLogFilterOptions {
  category?: AuditCategory | 'all';
  query?: string;
}

export interface AuditableRecord {
  user_name?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
}

export function filterAuditLogs<T extends AuditableRecord>(
  logs: T[],
  options: AuditLogFilterOptions = {}
): T[] {
  const category = options.category ?? 'all';
  const q = (options.query ?? '').trim().toLowerCase();

  return logs.filter((entry) => {
    if (category !== 'all' && classifyAuditAction(entry.action) !== category) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      entry.user_name,
      entry.action,
      entry.entity_type,
      entry.entity_id,
      entry.details,
      entry.ip_address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function summarizeAuditLogs<T extends { action: string }>(logs: T[]) {
  const counts = {
    total: logs.length,
    auth: 0,
    content: 0,
    settings: 0,
    governance: 0,
  };
  for (const log of logs) {
    counts[classifyAuditAction(log.action)] += 1;
  }
  return counts;
}

