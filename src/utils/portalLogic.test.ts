import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  canTransitionPostStatus,
  canTransitionRequestStatus,
  hasPermission,
  computeSurveyAggregates,
  formatIndonesianDate,
  formatIDR,
  isSafeHref,
  isSafeImageSrc,
  getFocalPointClass,
  buildPreviewUrl,
  getPreviewPresetForTab,
  generateTicketNumber,
  pickLang,
  parseLanguagePreference,
  classifyAuditAction,
  filterAuditLogs,
  summarizeAuditLogs,
} from './portalLogic';

test('slugify normalizes Indonesian titles into clean URL slugs', () => {
  assert.equal(
    slugify('Lomba Kompetensi Siswa (LKS) Jawa Timur 2026!'),
    'lomba-kompetensi-siswa-lks-jawa-timur-2026'
  );
  assert.equal(slugify('  Tata Kecantikan Kulit & Rambut  '), 'tata-kecantikan-kulit-rambut');
});

test('news editorial workflow validates permitted state transitions', () => {
  assert.equal(canTransitionPostStatus('draft', 'submitted'), true);
  assert.equal(canTransitionPostStatus('submitted', 'review'), true);
  assert.equal(canTransitionPostStatus('review', 'approved'), true);
  assert.equal(canTransitionPostStatus('approved', 'published'), true);
  assert.equal(canTransitionPostStatus('archived', 'submitted'), false);
});

test('service request workflow enforces valid administrative transitions', () => {
  assert.equal(canTransitionRequestStatus('diajukan', 'diverifikasi'), true);
  assert.equal(canTransitionRequestStatus('diverifikasi', 'diproses'), true);
  assert.equal(canTransitionRequestStatus('diproses', 'selesai'), true);
  assert.equal(canTransitionRequestStatus('selesai', 'diajukan'), false);
  assert.equal(canTransitionRequestStatus('ditolak', 'diproses'), false);
});

test('RBAC hasPermission evaluates wildcard, resource wildcard, and exact permissions', () => {
  assert.equal(hasPermission(['*'], 'users.delete'), true);
  assert.equal(hasPermission(['posts.*'], 'posts.publish'), true);
  assert.equal(hasPermission(['posts.create', 'posts.edit_own'], 'posts.publish'), false);
  assert.equal(hasPermission(['services.process'], 'services.process'), true);
});

test('computeSurveyAggregates returns zeroed stats when empty and accurate averages otherwise', () => {
  const empty = computeSurveyAggregates([]);
  assert.equal(empty.count, 0);
  assert.equal(empty.overallAverage, 0);

  const filled = computeSurveyAggregates([
    { rating_informasi: 5, rating_pelayanan: 4, rating_fasilitas: 5, rating_transparansi: 4 },
    { rating_informasi: 4, rating_pelayanan: 4, rating_fasilitas: 3, rating_transparansi: 5 },
  ]);
  assert.equal(filled.count, 2);
  assert.equal(filled.aspects.informasi, 4.5);
  assert.equal(filled.aspects.pelayanan, 4);
  assert.equal(filled.aspects.fasilitas, 4);
  assert.equal(filled.aspects.transparansi, 4.5);
  assert.equal(filled.overallAverage, 4.25);
});

test('formatIndonesianDate formats DD MMMM YYYY in Asia/Jakarta and formatIDR formats Rupiah', () => {
  const formatted = formatIndonesianDate('2026-08-17T03:00:00Z', 'id');
  assert.match(formatted, /17 Agustus 2026/);
  const idr = formatIDR(150000);
  assert.match(idr, /150\.000/);
});

test('isSafeHref blocks javascript: and data: URIs while allowing relative and https links', () => {
  assert.equal(isSafeHref('/konsentrasi-keahlian/kuliner'), true);
  assert.equal(isSafeHref('https://dapo.kemdikbud.go.id'), true);
  assert.equal(isSafeHref('javascript:alert(1)'), false);
  assert.equal(isSafeHref('data:text/html,<script>alert(1)</script>'), false);
});

test('generateTicketNumber builds deterministic date-based ticket format', () => {
  const ticket = generateTicketNumber('REQ', new Date('2026-11-24T00:00:00Z'), 'A1B2');
  assert.equal(ticket, 'REQ-20261124-A1B2');
});

test('pickLang and parseLanguagePreference resolve ID/EN consistently with safe fallback', () => {
  assert.equal(pickLang('en', 'Kuliner', 'Culinary Arts'), 'Culinary Arts');
  assert.equal(pickLang('en', 'Kuliner', ''), 'Kuliner');
  assert.equal(pickLang('id', 'Kuliner', 'Culinary Arts'), 'Kuliner');
  assert.equal(parseLanguagePreference('?lang=en', 'id'), 'en');
  assert.equal(parseLanguagePreference('', 'en'), 'en');
  assert.equal(parseLanguagePreference('?lang=fr', 'invalid'), 'id');
});

test('isSafeImageSrc allows local uploads and https URLs while blocking unsafe protocols', () => {
  assert.equal(isSafeImageSrc('/uploads/public/banner.jpg'), true);
  assert.equal(isSafeImageSrc('/src/assets/images/hero_campus_smkn3_1795574976594.jpg'), true);
  assert.equal(isSafeImageSrc('https://smkn3probolinggo.sch.id/banner.webp'), true);
  assert.equal(isSafeImageSrc('//evil.example/a.png'), false);
  assert.equal(isSafeImageSrc('javascript:alert(1)'), false);
  assert.equal(isSafeImageSrc('data:image/svg+xml,<svg/>'), false);
  assert.equal(isSafeImageSrc(''), false);
});

test('getFocalPointClass maps focal points to Tailwind object-position classes', () => {
  assert.equal(getFocalPointClass('top'), 'object-top');
  assert.equal(getFocalPointClass('bottom'), 'object-bottom');
  assert.equal(getFocalPointClass('left'), 'object-left');
  assert.equal(getFocalPointClass('right'), 'object-right');
  assert.equal(getFocalPointClass('center'), 'object-center');
  assert.equal(getFocalPointClass(undefined), 'object-center');
});

test('buildPreviewUrl normalizes paths, preserves hashes, and blocks external/protocol-relative URLs', () => {
  assert.equal(buildPreviewUrl('/berita/judul-artikel', 'id', 1), '/berita/judul-artikel?lang=id&_pv=1');
  assert.equal(buildPreviewUrl('/#statistik', 'en', 2), '/?lang=en&_pv=2#statistik');
  assert.equal(buildPreviewUrl('https://evil.example', 'id', 0), '/?lang=id');
  assert.equal(buildPreviewUrl('//evil.example/x', 'en', 0), '/?lang=en');
});

test('getPreviewPresetForTab maps CMS sections to corresponding portal routes', () => {
  assert.equal(getPreviewPresetForTab('posts'), '/berita');
  assert.equal(getPreviewPresetForTab('programs'), '/konsentrasi-keahlian');
  assert.equal(getPreviewPresetForTab('services'), '/informasi-publik');
  assert.equal(getPreviewPresetForTab('layout'), '/');
  assert.equal(getPreviewPresetForTab('settings'), '/');
});

test('classifyAuditAction groups login attempts, content updates, setting changes, and governance', () => {
  assert.equal(classifyAuditAction('LOGIN'), 'auth');
  assert.equal(classifyAuditAction('LOGIN_FAILED'), 'auth');
  assert.equal(classifyAuditAction('LOGIN_RATE_LIMITED'), 'auth');
  assert.equal(classifyAuditAction('CREATE_POST'), 'content');
  assert.equal(classifyAuditAction('UPDATE_DEPARTMENT'), 'content');
  assert.equal(classifyAuditAction('DELETE_ANNOUNCEMENT'), 'content');
  assert.equal(classifyAuditAction('UPDATE_SETTINGS'), 'settings');
  assert.equal(classifyAuditAction('UPDATE_HOMEPAGE_SECTIONS'), 'settings');
  assert.equal(classifyAuditAction('CREATE_USER'), 'governance');
});

test('filterAuditLogs and summarizeAuditLogs filter by category and query safely', () => {
  const sampleLogs = [
    { id: 1, user_name: 'Super Admin', action: 'LOGIN', entity_type: 'user', entity_id: '1', details: 'Masuk CMS', ip_address: '127.0.0.1' },
    { id: 2, user_name: 'Publik/Sistem', action: 'LOGIN_FAILED', entity_type: 'auth', entity_id: 'bad@example.com', details: 'Percobaan masuk gagal (kata sandi salah)', ip_address: '10.0.0.5' },
    { id: 3, user_name: 'Editor Humas', action: 'UPDATE_POST', entity_type: 'post', entity_id: '12', details: 'Memperbarui berita LKS', ip_address: '127.0.0.1' },
    { id: 4, user_name: 'Super Admin', action: 'UPDATE_SETTINGS', entity_type: 'school_settings', entity_id: '1', details: 'Memperbarui logo header', ip_address: '127.0.0.1' },
  ];

  const summary = summarizeAuditLogs(sampleLogs);
  assert.deepEqual(summary, { total: 4, auth: 2, content: 1, settings: 1, governance: 0 });

  assert.equal(filterAuditLogs(sampleLogs, { category: 'auth' }).length, 2);
  assert.equal(filterAuditLogs(sampleLogs, { category: 'content' }).length, 1);
  assert.equal(filterAuditLogs(sampleLogs, { category: 'all', query: '10.0.0.5' }).length, 1);
  assert.equal(filterAuditLogs(sampleLogs, { category: 'settings', query: 'logo' }).length, 1);
  assert.equal(filterAuditLogs(sampleLogs, { category: 'content', query: 'logo' }).length, 0);
});
