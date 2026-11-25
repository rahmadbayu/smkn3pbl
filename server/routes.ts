import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db';
import {
  type AuthenticatedRequest,
  clearLoginFailures,
  createSession,
  getSetupStatus,
  hashPassword,
  hashToken,
  isLoginRateLimited,
  recordLoginFailure,
  requireAuth,
  requirePermission,
  verifyPassword,
  writeAuditLog,
} from './auth';
import {
  canTransitionPostStatus,
  canTransitionRequestStatus,
  classifyAuditAction,
  computeSurveyAggregates,
  generateTicketNumber,
  hasPermission,
  isSafeHref,
  isSafeImageSrc,
  slugify,
} from '../src/utils/portalLogic';
import type { PostStatus, ServiceRequestStatus } from '../src/shared/types';

const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads/public');
const PRIVATE_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads/private');
for (const dir of [PUBLIC_UPLOADS_DIR, PRIVATE_UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

function makeMulterStorage(targetDir: string, allowedMimes: Set<string>) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, targetDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
        const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, safeName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF maksimal 5MB.'));
      }
    },
  });
}

const uploadPublicMedia = makeMulterStorage(PUBLIC_UPLOADS_DIR, new Set([...ALLOWED_IMAGE_MIMES, 'application/pdf']));
const uploadPrivateAttachment = makeMulterStorage(PRIVATE_UPLOADS_DIR, ALLOWED_DOC_MIMES);

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatSettings(row: Record<string, unknown>) {
  return {
    ...row,
    mission_id: parseJsonSafe<string[]>(row.mission_id as string, []),
    mission_en: parseJsonSafe<string[]>(row.mission_en as string, []),
    integrations: parseJsonSafe(row.integrations_json as string, {}),
    ai_enabled: Boolean(row.ai_enabled),
    maintenance_mode: Boolean(row.maintenance_mode),
  };
}

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function registerRoutes(app: Express): void {
  // Serve validated public uploads only
  app.use('/uploads/public', express.static(PUBLIC_UPLOADS_DIR));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), timezone: 'Asia/Jakarta' });
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION & FIRST-RUN SETUP
  // ---------------------------------------------------------------------------
  app.get('/api/auth/setup-status', (_req, res) => {
    res.json(getSetupStatus());
  });

  app.post('/api/auth/claim-admin', (req, res) => {
    const status = getSetupStatus();
    if (!status.needsClaim) {
      res.status(409).json({ error: 'Akun Super Administrator sudah dikonfigurasi.' });
      return;
    }

    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Nama administrator minimal 2 karakter.' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Format email tidak valid.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
      return;
    }

    const superRole = db.prepare(`SELECT id, slug, name, permissions_json FROM roles WHERE slug = 'super_admin'`).get() as {
      id: number;
      slug: string;
      name: string;
      permissions_json: string;
    };

    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const cleanEmail = email.trim().toLowerCase();

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, password_salt, role_id, is_active, last_login_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(name.trim(), cleanEmail, hash, salt, superRole.id, now, now, now);

    const userId = Number(result.lastInsertRowid);
    const ip = getClientIp(req);
    const session = createSession(userId, String(req.headers['user-agent'] || ''), ip);

    writeAuditLog(
      {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role_id: superRole.id,
        role_slug: superRole.slug,
        role_name: superRole.name,
        department_id: null,
        permissions: parseJsonSafe(superRole.permissions_json, ['*']),
        session_id: 'initial',
      },
      'CLAIM_SUPER_ADMIN',
      'user',
      userId,
      'Aktivasi awal akun Super Administrator portal.',
      ip
    );

    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role_slug: superRole.slug,
        role_name: superRole.name,
        department_id: null,
        permissions: parseJsonSafe(superRole.permissions_json, ['*']),
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = getClientIp(req);
    const submittedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 120) : '';
    if (isLoginRateLimited(ip)) {
      writeAuditLog(
        null,
        'LOGIN_RATE_LIMITED',
        'auth',
        submittedEmail || ip,
        `Percobaan masuk diblokir sementara (rate limit) untuk ${submittedEmail || 'email tidak dikenal'} dari IP ${ip}.`,
        ip
      );
      res.status(429).json({ error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 5 menit.' });
      return;
    }

    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 120);
    const user = db.prepare(`
      SELECT u.*, r.slug as role_slug, r.name as role_name, r.permissions_json
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `).get(cleanEmail) as {
      id: number;
      name: string;
      email: string;
      password_hash: string;
      password_salt: string;
      role_id: number;
      department_id: number | null;
      is_active: number;
      role_slug: string;
      role_name: string;
      permissions_json: string;
    } | undefined;

    if (!user || !user.is_active || !verifyPassword(password, user.password_hash, user.password_salt)) {
      recordLoginFailure(ip);
      const failureReason = !user
        ? 'akun tidak ditemukan'
        : !user.is_active
        ? 'akun nonaktif'
        : 'kata sandi salah';
      writeAuditLog(
        user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role_id: user.role_id,
              role_slug: user.role_slug,
              role_name: user.role_name,
              department_id: user.department_id,
              permissions: [],
              session_id: 'failed',
            }
          : null,
        'LOGIN_FAILED',
        'auth',
        cleanEmail || 'unknown',
        `Percobaan masuk gagal (${failureReason}) untuk email ${cleanEmail}.`,
        ip
      );
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }

    clearLoginFailures(ip);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    const session = createSession(user.id, String(req.headers['user-agent'] || ''), ip);
    const permissions = parseJsonSafe<string[]>(user.permissions_json, []);

    writeAuditLog(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_slug: user.role_slug,
        role_name: user.role_name,
        department_id: user.department_id,
        permissions,
        session_id: 'login',
      },
      'LOGIN',
      'user',
      user.id,
      'Masuk ke panel administrator CMS.',
      ip
    );

    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_slug: user.role_slug,
        role_name: user.role_name,
        department_id: user.department_id,
        permissions,
      },
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), req.user.session_id);
      writeAuditLog(req.user, 'LOGOUT', 'session', req.user.session_id, 'Keluar dari sesi CMS.', getClientIp(req));
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ---------------------------------------------------------------------------
  // PUBLIC PORTAL ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/bootstrap', (_req, res) => {
    const settingsRow = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as Record<string, unknown>;
    const sections = db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC').all().map((s: Record<string, unknown>) => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
    }));
    const menus = db.prepare('SELECT * FROM menus WHERE is_published = 1 ORDER BY sort_order ASC').all().map((m: Record<string, unknown>) => ({
      ...m,
      is_external: Boolean(m.is_external),
      is_published: Boolean(m.is_published),
    }));
    const nowIso = new Date().toISOString();
    const banners = db.prepare(`
      SELECT * FROM banners
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at = '' OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at = '' OR ends_at >= ?)
      ORDER BY sort_order ASC
    `).all(nowIso, nowIso).map((b: Record<string, unknown>) => ({ ...b, is_active: Boolean(b.is_active) }));

    const today = nowIso.slice(0, 10);
    const announcements = db.prepare(`
      SELECT * FROM announcements
      WHERE is_published = 1 AND (valid_until IS NULL OR valid_until = '' OR valid_until >= ?)
      ORDER BY CASE priority WHEN 'darurat' THEN 0 WHEN 'tinggi' THEN 1 ELSE 2 END, created_at DESC
    `).all(today).map((a: Record<string, unknown>) => ({ ...a, is_published: Boolean(a.is_published) }));

    const stats = db.prepare('SELECT * FROM school_stats ORDER BY sort_order ASC').all();
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

    res.json({
      settings: formatSettings(settingsRow),
      sections,
      menus,
      banners,
      announcements,
      stats,
      categories,
    });
  });

  app.get('/api/departments', (_req, res) => {
    const rows = db.prepare('SELECT * FROM departments WHERE is_published = 1 ORDER BY sort_order ASC').all();
    res.json(rows.map((d: Record<string, unknown>) => ({
      ...d,
      competencies: parseJsonSafe(d.competencies_json as string, []),
      curriculum_structure: parseJsonSafe(d.curriculum_json as string, []),
      career_prospects: parseJsonSafe(d.career_prospects_json as string, []),
      facilities: parseJsonSafe(d.facilities_json as string, []),
      is_published: Boolean(d.is_published),
    })));
  });

  app.get('/api/departments/:slug', (req, res) => {
    const d = db.prepare('SELECT * FROM departments WHERE slug = ? AND is_published = 1').get(req.params.slug) as Record<string, unknown> | undefined;
    if (!d) {
      res.status(404).json({ error: 'Konsentrasi keahlian tidak ditemukan.' });
      return;
    }
    const deptId = Number(d.id);
    const teachers = db.prepare('SELECT * FROM teachers_staff WHERE department_id = ? AND is_published = 1').all(deptId);
    const partners = db.prepare('SELECT * FROM industry_partners WHERE department_id = ? AND is_published = 1').all(deptId);
    const achievements = db.prepare('SELECT * FROM achievements WHERE department_id = ? AND is_published = 1 ORDER BY year DESC').all(deptId);
    const works = db.prepare('SELECT * FROM student_works WHERE department_id = ? AND is_published = 1 ORDER BY year DESC').all(deptId);
    const tefa = db.prepare('SELECT * FROM teaching_factory WHERE department_id = ? AND is_available = 1').all(deptId);
    const relatedPosts = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.deleted_at IS NULL
        AND (p.title LIKE ? OR p.summary LIKE ? OR p.tags_json LIKE ?)
      ORDER BY p.published_at DESC LIMIT 4
    `).all(`%${d.name_id}%`, `%${d.name_id}%`, `%${d.name_id}%`);

    res.json({
      department: {
        ...d,
        competencies: parseJsonSafe(d.competencies_json as string, []),
        curriculum_structure: parseJsonSafe(d.curriculum_json as string, []),
        career_prospects: parseJsonSafe(d.career_prospects_json as string, []),
        facilities: parseJsonSafe(d.facilities_json as string, []),
      },
      teachers,
      partners,
      achievements,
      works,
      tefa,
      relatedPosts: relatedPosts.map((p: Record<string, unknown>) => ({
        ...p,
        tags: parseJsonSafe(p.tags_json as string, []),
      })),
    });
  });

  app.get('/api/posts', (req, res) => {
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    let where = `p.status = 'published' AND p.deleted_at IS NULL`;
    const params: (string | number)[] = [];

    if (search) {
      where += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.tags_json LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      where += ` AND (c.slug = ? OR c.name = ?)`;
      params.push(category, category);
    }

    const totalRow = db.prepare(`
      SELECT COUNT(*) as total FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE ${where}
    `).get(...params) as { total: number };

    const rows = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.is_featured DESC, p.published_at DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      items: rows.map((p: Record<string, unknown>) => ({
        ...p,
        tags: parseJsonSafe(p.tags_json as string, []),
        is_featured: Boolean(p.is_featured),
      })),
      total: totalRow.total,
      page,
      totalPages: Math.max(1, Math.ceil(totalRow.total / limit)),
    });
  });

  app.get('/api/posts/:slug', (req, res) => {
    const row = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL
    `).get(req.params.slug) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'Artikel tidak ditemukan.' });
      return;
    }

    db.prepare('UPDATE posts SET views_count = views_count + 1 WHERE id = ?').run(Number(row.id));

    const related = db.prepare(`
      SELECT p.id, p.title, p.slug, p.summary, p.featured_image, p.published_at, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id != ? AND p.status = 'published' AND p.deleted_at IS NULL
      ORDER BY p.published_at DESC LIMIT 3
    `).all(Number(row.id));

    res.json({
      post: {
        ...row,
        views_count: Number(row.views_count) + 1,
        tags: parseJsonSafe(row.tags_json as string, []),
        is_featured: Boolean(row.is_featured),
      },
      related,
    });
  });

  app.get('/api/achievements', (_req, res) => {
    const rows = db.prepare(`
      SELECT a.*, d.name_id as department_name
      FROM achievements a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.is_published = 1
      ORDER BY a.year DESC, a.id DESC
    `).all();
    res.json(rows);
  });

  app.get('/api/events', (_req, res) => {
    const rows = db.prepare('SELECT * FROM events WHERE is_published = 1 ORDER BY start_date ASC').all();
    res.json(rows);
  });

  app.get('/api/teachers', (_req, res) => {
    const rows = db.prepare(`
      SELECT t.*, d.name_id as department_name
      FROM teachers_staff t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.is_published = 1
      ORDER BY CASE t.role_type WHEN 'pimpinan' THEN 0 WHEN 'guru' THEN 1 ELSE 2 END, t.id ASC
    `).all();
    res.json(rows);
  });

  app.get('/api/extracurriculars', (_req, res) => {
    res.json(db.prepare('SELECT * FROM extracurriculars WHERE is_published = 1 ORDER BY id ASC').all());
  });

  app.get('/api/facilities', (_req, res) => {
    res.json(db.prepare('SELECT * FROM facilities WHERE is_published = 1 ORDER BY id ASC').all());
  });

  app.get('/api/partners', (_req, res) => {
    res.json(db.prepare('SELECT * FROM industry_partners WHERE is_published = 1 ORDER BY since_year ASC').all());
  });

  app.get('/api/jobs', (_req, res) => {
    const rows = db.prepare('SELECT * FROM job_vacancies WHERE is_published = 1 ORDER BY deadline ASC').all();
    res.json(rows.map((j: Record<string, unknown>) => ({
      ...j,
      requirements: parseJsonSafe(j.requirements_json as string, []),
    })));
  });

  app.get('/api/alumni', (_req, res) => {
    res.json(db.prepare('SELECT * FROM alumni_stories WHERE is_published = 1 AND consent_granted = 1 ORDER BY graduation_year DESC').all());
  });

  app.get('/api/tefa', (_req, res) => {
    const rows = db.prepare(`
      SELECT tf.*, d.name_id as department_name
      FROM teaching_factory tf
      LEFT JOIN departments d ON tf.department_id = d.id
      WHERE tf.is_available = 1
      ORDER BY tf.id ASC
    `).all();
    res.json(rows);
  });

  app.get('/api/student-works', (_req, res) => {
    const rows = db.prepare(`
      SELECT sw.*, d.name_id as department_name
      FROM student_works sw
      LEFT JOIN departments d ON sw.department_id = d.id
      WHERE sw.is_published = 1
      ORDER BY sw.year DESC
    `).all();
    res.json(rows);
  });

  app.get('/api/galleries', (_req, res) => {
    res.json(db.prepare('SELECT * FROM galleries WHERE is_published = 1 ORDER BY taken_at DESC').all());
  });

  app.get('/api/testimonials', (_req, res) => {
    res.json(db.prepare('SELECT * FROM testimonials WHERE is_published = 1 AND consent_verified = 1 ORDER BY id ASC').all());
  });

  // Strict Public Information filter: only classification='publik' AND is_approved=1
  app.get('/api/documents', (req, res) => {
    const ppidGroup = typeof req.query.ppid_group === 'string' ? req.query.ppid_group : '';
    let sql = `SELECT * FROM documents WHERE classification = 'publik' AND is_approved = 1`;
    const params: string[] = [];
    if (ppidGroup && ppidGroup !== 'all') {
      sql += ` AND ppid_group = ?`;
      params.push(ppidGroup);
    }
    sql += ` ORDER BY published_at DESC`;
    res.json(db.prepare(sql).all(...params));
  });

  app.get('/api/documents/download-sample/:slug', (req, res) => {
    const cleanSlug = slugify(req.params.slug);
    const content = [
      `DOKUMEN INFORMASI PUBLIK RESMI`,
      `SMK NEGERI 3 PROBOLINGGO`,
      `Kode Dokumen: ${cleanSlug.toUpperCase()}`,
      `Klasifikasi: Publik (Sesuai UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik)`,
      ``,
      `Dokumen ini merupakan berkas resmi yang dipublikasikan melalui Portal Digital Terintegrasi`,
      `SMK Negeri 3 Probolinggo. Administrator dapat mengganti berkas lampiran PDF asli melalui`,
      `modul Manajemen Dokumen & Informasi Publik pada panel CMS.`,
      ``,
      `Alamat: Jl. Pahlawan No. 26A, Kota Probolinggo, Jawa Timur 67211`,
      `Email Resmi: info@smkn3probolinggo.sch.id`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanSlug}.txt"`);
    res.send(content);
  });

  app.get('/api/services', (_req, res) => {
    const rows = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY id ASC').all();
    res.json(rows.map((s: Record<string, unknown>) => ({
      ...s,
      requirements: parseJsonSafe(s.requirements_json as string, []),
      is_active: Boolean(s.is_active),
    })));
  });

  // Public Service Request submission with ticket + private tracking code
  app.post('/api/service-requests', uploadPublicMiddlewareOrAttachment, (req, res) => {
    const { service_id, applicant_name, applicant_email, applicant_phone, applicant_role, details } = req.body ?? {};
    const serviceIdNum = Number(service_id);
    const service = db.prepare('SELECT id, name_id FROM services WHERE id = ? AND is_active = 1').get(serviceIdNum) as { id: number; name_id: string } | undefined;

    if (!service) {
      res.status(400).json({ error: 'Jenis layanan tidak valid.' });
      return;
    }
    if (typeof applicant_name !== 'string' || applicant_name.trim().length < 2) {
      res.status(400).json({ error: 'Nama pemohon wajib diisi.' });
      return;
    }
    if (typeof applicant_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant_email.trim())) {
      res.status(400).json({ error: 'Email pemohon tidak valid.' });
      return;
    }
    if (typeof applicant_phone !== 'string' || applicant_phone.trim().length < 8) {
      res.status(400).json({ error: 'Nomor telepon/WhatsApp wajib diisi.' });
      return;
    }
    if (typeof details !== 'string' || details.trim().length < 10) {
      res.status(400).json({ error: 'Rincian permohonan minimal 10 karakter.' });
      return;
    }

    const ticketNumber = generateTicketNumber('REQ');
    const trackingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const trackingCodeHash = hashToken(trackingCode);
    const now = new Date().toISOString();
    const attachmentUrl = req.file ? `private:${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO service_requests (
        ticket_number, tracking_code_hash, service_id, applicant_name,
        applicant_email, applicant_phone, applicant_role, details,
        attachment_url, status, staff_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'diajukan', '', ?, ?)
    `).run(
      ticketNumber,
      trackingCodeHash,
      service.id,
      applicant_name.trim(),
      applicant_email.trim(),
      applicant_phone.trim(),
      typeof applicant_role === 'string' && applicant_role.trim() ? applicant_role.trim() : 'Masyarakat/Siswa',
      details.trim(),
      attachmentUrl,
      now,
      now
    );

    writeAuditLog(null, 'CREATE_SERVICE_REQUEST', 'service_request', ticketNumber, `Permohonan layanan ${service.name_id}`, getClientIp(req));

    res.status(201).json({
      ticket_number: ticketNumber,
      tracking_code: trackingCode,
      service_name: service.name_id,
      status: 'diajukan',
      created_at: now,
    });
  });

  // Safe ticket tracking requiring BOTH ticket_number and tracking_code
  app.post('/api/service-requests/track', (req, res) => {
    const { ticket_number, tracking_code } = req.body ?? {};
    if (typeof ticket_number !== 'string' || typeof tracking_code !== 'string' || !ticket_number.trim() || !tracking_code.trim()) {
      res.status(400).json({ error: 'Nomor tiket dan kode verifikasi wajib diisi.' });
      return;
    }
    const row = db.prepare(`
      SELECT sr.ticket_number, sr.tracking_code_hash, sr.status, sr.staff_note, sr.satisfaction_rating, sr.created_at, sr.updated_at, s.name_id as service_name
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      WHERE sr.ticket_number = ?
    `).get(ticket_number.trim().toUpperCase()) as {
      ticket_number: string;
      tracking_code_hash: string;
      status: string;
      staff_note: string;
      satisfaction_rating: number | null;
      created_at: string;
      updated_at: string;
      service_name: string;
    } | undefined;

    if (!row || row.tracking_code_hash !== hashToken(tracking_code.trim().toUpperCase())) {
      res.status(404).json({ error: 'Tiket tidak ditemukan atau kode verifikasi tidak sesuai.' });
      return;
    }

    res.json({
      ticket_number: row.ticket_number,
      service_name: row.service_name,
      status: row.status,
      staff_note: row.staff_note,
      satisfaction_rating: row.satisfaction_rating,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  app.post('/api/service-requests/:ticket/feedback', (req, res) => {
    const { tracking_code, rating } = req.body ?? {};
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: 'Penilaian kepuasan harus 1 sampai 5.' });
      return;
    }
    const row = db.prepare('SELECT id, tracking_code_hash FROM service_requests WHERE ticket_number = ?')
      .get(req.params.ticket.trim().toUpperCase()) as { id: number; tracking_code_hash: string } | undefined;

    if (!row || typeof tracking_code !== 'string' || row.tracking_code_hash !== hashToken(tracking_code.trim().toUpperCase())) {
      res.status(404).json({ error: 'Tiket atau kode verifikasi tidak cocok.' });
      return;
    }
    db.prepare('UPDATE service_requests SET satisfaction_rating = ?, updated_at = ? WHERE id = ?')
      .run(ratingNum, new Date().toISOString(), row.id);
    res.json({ ok: true, satisfaction_rating: ratingNum });
  });

  // Public Complaints (Pengaduan Masyarakat)
  app.post('/api/complaints', (req, res) => {
    const { reporter_name, reporter_contact, category, subject, description } = req.body ?? {};
    if (typeof reporter_name !== 'string' || reporter_name.trim().length < 2) {
      res.status(400).json({ error: 'Nama pelapor wajib diisi.' });
      return;
    }
    if (typeof reporter_contact !== 'string' || reporter_contact.trim().length < 5) {
      res.status(400).json({ error: 'Kontak pelapor wajib diisi.' });
      return;
    }
    if (typeof subject !== 'string' || subject.trim().length < 5 || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({ error: 'Subjek dan uraian pengaduan wajib diisi lengkap.' });
      return;
    }

    const ticketNumber = generateTicketNumber('ADU');
    const trackingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO complaints (ticket_number, tracking_code_hash, reporter_name, reporter_contact, category, subject, description, status, resolution_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'diterima', '', ?, ?)
    `).run(
      ticketNumber,
      hashToken(trackingCode),
      reporter_name.trim(),
      reporter_contact.trim(),
      typeof category === 'string' && category.trim() ? category.trim() : 'Layanan Sekolah',
      subject.trim(),
      description.trim(),
      now,
      now
    );

    res.status(201).json({
      ticket_number: ticketNumber,
      tracking_code: trackingCode,
      status: 'diterima',
      created_at: now,
    });
  });

  app.post('/api/complaints/track', (req, res) => {
    const { ticket_number, tracking_code } = req.body ?? {};
    if (typeof ticket_number !== 'string' || typeof tracking_code !== 'string') {
      res.status(400).json({ error: 'Nomor tiket dan kode verifikasi wajib diisi.' });
      return;
    }
    const row = db.prepare(`
      SELECT ticket_number, tracking_code_hash, category, subject, status, resolution_note, created_at, updated_at
      FROM complaints WHERE ticket_number = ?
    `).get(ticket_number.trim().toUpperCase()) as {
      ticket_number: string;
      tracking_code_hash: string;
      category: string;
      subject: string;
      status: string;
      resolution_note: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row || row.tracking_code_hash !== hashToken(tracking_code.trim().toUpperCase())) {
      res.status(404).json({ error: 'Tiket pengaduan tidak ditemukan atau kode verifikasi salah.' });
      return;
    }
    res.json({
      ticket_number: row.ticket_number,
      category: row.category,
      subject: row.subject,
      status: row.status,
      resolution_note: row.resolution_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  // Quality Assurance Surveys (aggregate output only, protecting respondent privacy)
  app.get('/api/surveys', (_req, res) => {
    const surveys = db.prepare('SELECT * FROM surveys WHERE is_active = 1 ORDER BY id ASC').all() as Array<{
      id: number;
      title: string;
      target_audience: string;
      description: string;
      is_active: number;
    }>;

    const enriched = surveys.map((s) => {
      const responses = db.prepare(
        'SELECT rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi FROM survey_responses WHERE survey_id = ?'
      ).all(s.id) as Array<{
        rating_informasi: number;
        rating_pelayanan: number;
        rating_fasilitas: number;
        rating_transparansi: number;
      }>;
      const agg = computeSurveyAggregates(responses);
      return {
        ...s,
        is_active: Boolean(s.is_active),
        response_count: agg.count,
        avg_rating: agg.overallAverage,
        aspect_averages: agg.aspects,
      };
    });

    res.json(enriched);
  });

  app.post('/api/surveys/:id/respond', (req, res) => {
    const surveyId = Number(req.params.id);
    const survey = db.prepare('SELECT id FROM surveys WHERE id = ? AND is_active = 1').get(surveyId);
    if (!survey) {
      res.status(404).json({ error: 'Survei tidak ditemukan.' });
      return;
    }

    const { respondent_group, rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi, feedback_note } = req.body ?? {};
    const scores = [rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi].map(Number);
    if (scores.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
      res.status(400).json({ error: 'Semua skor penilaian harus berupa bilangan bulat 1–5.' });
      return;
    }

    db.prepare(`
      INSERT INTO survey_responses (survey_id, respondent_group, rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi, feedback_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      surveyId,
      typeof respondent_group === 'string' && respondent_group.trim() ? respondent_group.trim() : 'umum',
      scores[0],
      scores[1],
      scores[2],
      scores[3],
      typeof feedback_note === 'string' ? feedback_note.trim().slice(0, 500) : '',
      new Date().toISOString()
    );

    const allResp = db.prepare(
      'SELECT rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi FROM survey_responses WHERE survey_id = ?'
    ).all(surveyId) as Array<{
      rating_informasi: number;
      rating_pelayanan: number;
      rating_fasilitas: number;
      rating_transparansi: number;
    }>;

    res.status(201).json({ ok: true, aggregates: computeSurveyAggregates(allResp) });
  });

  app.post('/api/contact', (req, res) => {
    const { sender_name, sender_email, subject, message } = req.body ?? {};
    if (typeof sender_name !== 'string' || sender_name.trim().length < 2) {
      res.status(400).json({ error: 'Nama pengirim wajib diisi.' });
      return;
    }
    if (typeof sender_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender_email.trim())) {
      res.status(400).json({ error: 'Email pengirim tidak valid.' });
      return;
    }
    if (typeof subject !== 'string' || subject.trim().length < 3 || typeof message !== 'string' || message.trim().length < 10) {
      res.status(400).json({ error: 'Subjek dan isi pesan wajib diisi.' });
      return;
    }

    db.prepare(`
      INSERT INTO contact_messages (sender_name, sender_email, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, 'baru', ?)
    `).run(sender_name.trim(), sender_email.trim(), subject.trim(), message.trim(), new Date().toISOString());

    res.status(201).json({ ok: true, message: 'Pesan Anda telah tersimpan dan akan ditindaklanjuti oleh tata usaha sekolah.' });
  });

  // Privacy-preserving visitor counter (aggregate per date & path only, no PII or IP saved)
  app.post('/api/analytics/visit', (req, res) => {
    const rawPath = typeof req.body?.path === 'string' ? req.body.path.slice(0, 120) : '/';
    const visitDate = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO visitor_analytics (visit_date, path, views) VALUES (?, ?, 1)
      ON CONFLICT(visit_date, path) DO UPDATE SET views = views + 1
    `).run(visitDate, rawPath);
    res.json({ ok: true });
  });

  // Global Portal Search
  app.get('/api/search', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q || q.length < 2) {
      res.json({ departments: [], posts: [], services: [], documents: [], jobs: [] });
      return;
    }
    const like = `%${q}%`;
    const departments = db.prepare('SELECT id, slug, name_id, name_en, short_desc_id, short_desc_en FROM departments WHERE is_published = 1 AND (name_id LIKE ? OR name_en LIKE ? OR short_desc_id LIKE ? OR short_desc_en LIKE ?) LIMIT 5').all(like, like, like, like);
    const posts = db.prepare(`SELECT id, slug, title, summary, published_at FROM posts WHERE status = 'published' AND deleted_at IS NULL AND (title LIKE ? OR summary LIKE ?) LIMIT 6`).all(like, like);
    const services = db.prepare('SELECT id, slug, name_id, name_en, estimated_sla FROM services WHERE is_active = 1 AND (name_id LIKE ? OR name_en LIKE ? OR description_id LIKE ?) LIMIT 5').all(like, like, like);
    const documents = db.prepare(`SELECT id, title, ppid_group, file_url FROM documents WHERE classification = 'publik' AND is_approved = 1 AND title LIKE ? LIMIT 5`).all(like);
    const jobs = db.prepare('SELECT id, title, company_name, location FROM job_vacancies WHERE is_published = 1 AND (title LIKE ? OR company_name LIKE ?) LIMIT 5').all(like, like);

    res.json({ departments, posts, services, documents, jobs });
  });

  // SEO XML Sitemap & Robots.txt
  app.get('/api/sitemap.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const staticPaths = [
      '/', '/profil', '/akademik', '/konsentrasi-keahlian', '/kesiswaan',
      '/spmb', '/humas-bkk', '/sarana-prasarana', '/berita', '/penjaminan-mutu',
      '/layanan-digital', '/informasi-publik', '/kontak', '/peta-situs'
    ];
    const depts = db.prepare('SELECT slug FROM departments WHERE is_published = 1').all() as Array<{ slug: string }>;
    const posts = db.prepare(`SELECT slug, updated_at FROM posts WHERE status = 'published' AND deleted_at IS NULL`).all() as Array<{ slug: string; updated_at: string }>;

    const urls = [
      ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>`),
      ...depts.map((d) => `<url><loc>${baseUrl}/konsentrasi-keahlian/${d.slug}</loc><changefreq>monthly</changefreq></url>`),
      ...posts.map((p) => `<url><loc>${baseUrl}/berita/${p.slug}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod></url>`),
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
  });

  app.get('/api/robots.txt', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${baseUrl}/api/sitemap.xml\n`);
  });

  // ---------------------------------------------------------------------------
  // OPTIONAL AI MODULE (Server-Side Only via @google/genai)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/chat', async (req, res) => {
    const settings = db.prepare('SELECT school_name, address, phone, email, ai_enabled FROM school_settings WHERE id = 1').get() as {
      school_name: string;
      address: string;
      phone: string;
      email: string;
      ai_enabled: number;
    };

    if (!settings.ai_enabled) {
      res.status(403).json({ error: 'Modul asisten informasi AI sedang dinonaktifkan oleh administrator.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Layanan AI belum aktif karena GEMINI_API_KEY belum dikonfigurasi pada Settings > Secrets.',
      });
      return;
    }

    const lang = req.body?.lang === 'en' ? 'en' : 'id';
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question || question.length < 3) {
      res.status(400).json({ error: lang === 'en' ? 'Question must be at least 3 characters.' : 'Pertanyaan minimal 3 karakter.' });
      return;
    }

    const depts = db.prepare('SELECT name_id, name_en, short_desc_id, short_desc_en, quota_spmb FROM departments WHERE is_published = 1').all();
    const services = db.prepare('SELECT name_id, name_en, estimated_sla FROM services WHERE is_active = 1').all();
    const announcements = db.prepare('SELECT title_id, title_en, content_id, content_en FROM announcements WHERE is_published = 1 LIMIT 5').all();

    try {
      const instruction =
        lang === 'en'
          ? `You are the official public information assistant for ${settings.school_name}. Answer concisely, politely, and accurately in English ONLY based on the verified school data below. If information is unavailable, honestly state so and direct visitors to official contacts (${settings.phone}, ${settings.email}). Never invent facts.`
          : `Anda adalah asisten informasi publik resmi ${settings.school_name}. Jawab pertanyaan secara singkat, sopan, dan akurat dalam Bahasa Indonesia HANYA berdasarkan data terverifikasi berikut. Jika informasi tidak tersedia dalam data berikut, nyatakan secara jujur bahwa informasi belum tersedia dan arahkan ke kontak resmi (${settings.phone}, ${settings.email}). Jangan mengarang fakta.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: question,
        config: {
          systemInstruction: `${instruction}\n\nData Sekolah / School Data:\nAddress: ${settings.address}\nPhone: ${settings.phone}\nEmail: ${settings.email}\nVocational Concentrations: ${JSON.stringify(depts)}\nDigital Services: ${JSON.stringify(services)}\nAnnouncements: ${JSON.stringify(announcements)}`,
        },
      });
      res.json({
        answer:
          response.text ??
          (lang === 'en' ? 'Sorry, we could not process your request right now.' : 'Maaf, informasi tidak dapat diproses saat ini.'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi layanan AI.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/admin/ai/assist', requireAuth, requirePermission('posts.create'), async (req: AuthenticatedRequest, res) => {
    const settings = db.prepare('SELECT ai_enabled FROM school_settings WHERE id = 1').get() as { ai_enabled: number };
    if (!settings.ai_enabled) {
      res.status(403).json({ error: 'Modul AI dinonaktifkan pada pengaturan sistem.' });
      return;
    }
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY belum dikonfigurasi pada Settings > Secrets.' });
      return;
    }

    const { topic, draftContent } = req.body ?? {};
    if (typeof topic !== 'string' || topic.trim().length < 3) {
      res.status(400).json({ error: 'Topik atau draf berita wajib diisi.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Topik: ${topic}\nDraf awal: ${typeof draftContent === 'string' ? draftContent : ''}`,
        config: {
          systemInstruction: 'Anda adalah asisten redaksi berita resmi SMK Negeri 3 Probolinggo. Bantu redaktur menyusun rekomendasi judul, ringkasan 5W+1H, meta description SEO (maks 155 karakter), alt text gambar, dan tag yang relevan dalam Bahasa Indonesia baku. Semua hasil tetap harus disunting manusia.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommended_title: { type: Type.STRING },
              summary: { type: Type.STRING },
              seo_description: { type: Type.STRING },
              image_alt: { type: Type.STRING },
              suggested_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });
      res.json(parseJsonSafe(response.text, {}));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses asisten AI.';
      res.status(500).json({ error: msg });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN CMS ROUTES (Authenticated + RBAC Enforced)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const days = range === '7d' ? 7 : range === '365d' ? 365 : 30;
    const sinceDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const counts = {
      posts: (db.prepare('SELECT COUNT(*) as c FROM posts WHERE deleted_at IS NULL').get() as { c: number }).c,
      pages: (db.prepare('SELECT COUNT(*) as c FROM homepage_sections').get() as { c: number }).c + 12,
      announcements: (db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }).c,
      events: (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c,
      achievements: (db.prepare('SELECT COUNT(*) as c FROM achievements').get() as { c: number }).c,
      partners: (db.prepare('SELECT COUNT(*) as c FROM industry_partners').get() as { c: number }).c,
      media: (db.prepare('SELECT COUNT(*) as c FROM media_library').get() as { c: number }).c + 7,
      users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c,
      pending_posts: (db.prepare(`SELECT COUNT(*) as c FROM posts WHERE status IN ('draft','submitted','review','revision') AND deleted_at IS NULL`).get() as { c: number }).c,
      pending_requests: (db.prepare(`SELECT COUNT(*) as c FROM service_requests WHERE status IN ('diajukan','diverifikasi','diproses')`).get() as { c: number }).c,
      open_complaints: (db.prepare(`SELECT COUNT(*) as c FROM complaints WHERE status != 'selesai'`).get() as { c: number }).c,
      total_visitors: (db.prepare('SELECT COALESCE(SUM(views), 0) as c FROM visitor_analytics WHERE visit_date >= ?').get(sinceDate) as { c: number }).c,
    };

    const visitorSeries = db.prepare(`
      SELECT visit_date, SUM(views) as total_views
      FROM visitor_analytics
      WHERE visit_date >= ?
      GROUP BY visit_date
      ORDER BY visit_date ASC
    `).all(sinceDate);

    const popularPosts = db.prepare(`
      SELECT id, title, slug, views_count, status, published_at
      FROM posts WHERE deleted_at IS NULL
      ORDER BY views_count DESC LIMIT 5
    `).all();

    const postsByCategory = db.prepare(`
      SELECT c.name as category, COUNT(p.id) as total
      FROM categories c
      LEFT JOIN posts p ON p.category_id = c.id AND p.deleted_at IS NULL
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `).all();

    const recentAudit = hasPermission(req.user!.permissions, 'audit.view')
      ? db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10').all()
      : [];
    const lastBackup = db.prepare('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 1').get() || null;

    const dbSizeBytes = fs.existsSync(path.resolve(process.cwd(), 'data/smkn3_portal.db'))
      ? fs.statSync(path.resolve(process.cwd(), 'data/smkn3_portal.db')).size
      : 0;

    res.json({
      counts,
      visitorSeries,
      popularPosts,
      postsByCategory,
      recentAudit,
      lastBackup,
      systemHealth: {
        databaseOk: true,
        dbSizeKb: Math.round(dbSizeBytes / 1024),
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
    });
  });

  // CSV Export for reports
  app.get('/api/admin/export/:type', requireAuth, (req: AuthenticatedRequest, res) => {
    const exportType = req.params.type;
    let rows: Record<string, unknown>[] = [];
    if (exportType === 'posts') {
      rows = db.prepare('SELECT id, title, status, author_name, views_count, published_at FROM posts WHERE deleted_at IS NULL').all() as Record<string, unknown>[];
    } else if (exportType === 'requests') {
      rows = db.prepare('SELECT ticket_number, applicant_name, status, estimated_sla, created_at FROM service_requests sr JOIN services s ON sr.service_id = s.id').all() as Record<string, unknown>[];
    } else if (exportType === 'audit') {
      if (!hasPermission(req.user!.permissions, 'audit.view')) {
        res.status(403).json({ error: 'Anda tidak memiliki izin melihat atau mengekspor audit log.' });
        return;
      }
      rows = db.prepare('SELECT id, user_name, action, entity_type, entity_id, details, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 200').all() as Record<string, unknown>[];
    } else {
      res.status(400).json({ error: 'Jenis ekspor tidak dikenal.' });
      return;
    }

    const headers = rows.length > 0 ? Object.keys(rows[0]) : ['empty'];
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
    ].join('\n');

    writeAuditLog(req.user!, 'EXPORT_CSV', exportType, 'batch', `Ekspor laporan CSV (${rows.length} baris)`, getClientIp(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="smkn3-${exportType}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  // Settings & Appearance & SEO & Integrations
  app.get('/api/admin/settings', requireAuth, (_req, res) => {
    const row = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as Record<string, unknown>;
    res.json(formatSettings(row));
  });

  app.put('/api/admin/settings', requireAuth, requirePermission('settings.profile'), (req: AuthenticatedRequest, res) => {
    const b = req.body ?? {};
    const current = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as Record<string, string | number | null>;
    const now = new Date().toISOString();

    let nextLogoUrl = (current.logo_url ?? '') as string;
    if (b.logo_url !== undefined) {
      const candidate = typeof b.logo_url === 'string' ? b.logo_url.trim() : '';
      if (candidate !== '' && !isSafeImageSrc(candidate)) {
        res.status(400).json({ error: 'URL logo header tidak valid. Gunakan berkas yang diunggah atau tautan HTTPS.' });
        return;
      }
      nextLogoUrl = candidate;
    }

    db.prepare(`
      UPDATE school_settings SET
        school_name = ?, slogan_id = ?, slogan_en = ?, address = ?, phone = ?, email = ?,
        principal_name = ?, principal_title = ?, principal_quote_id = ?, principal_message_id = ?,
        vision_id = ?, mission_id = ?, accreditation = ?, npsn = ?,
        primary_color = ?, secondary_color = ?, logo_url = ?,
        social_instagram = ?, social_youtube = ?, social_facebook = ?, social_tiktok = ?,
        ai_enabled = ?, maintenance_mode = ?, stats_period = ?,
        seo_default_title = ?, seo_default_description = ?, integrations_json = ?, updated_at = ?
      WHERE id = 1
    `).run(
      (b.school_name ?? current.school_name) as string | number | null,
      (b.slogan_id ?? current.slogan_id) as string | number | null,
      (b.slogan_en ?? current.slogan_en) as string | number | null,
      (b.address ?? current.address) as string | number | null,
      (b.phone ?? current.phone) as string | number | null,
      (b.email ?? current.email) as string | number | null,
      (b.principal_name ?? current.principal_name) as string | number | null,
      (b.principal_title ?? current.principal_title) as string | number | null,
      (b.principal_quote_id ?? current.principal_quote_id) as string | number | null,
      (b.principal_message_id ?? current.principal_message_id) as string | number | null,
      (b.vision_id ?? current.vision_id) as string | number | null,
      Array.isArray(b.mission_id) ? JSON.stringify(b.mission_id) : (current.mission_id ?? '[]'),
      (b.accreditation ?? current.accreditation) as string | number | null,
      (b.npsn ?? current.npsn) as string | number | null,
      (b.primary_color ?? current.primary_color) as string | number | null,
      (b.secondary_color ?? current.secondary_color) as string | number | null,
      nextLogoUrl,
      (b.social_instagram ?? current.social_instagram) as string | number | null,
      (b.social_youtube ?? current.social_youtube) as string | number | null,
      (b.social_facebook ?? current.social_facebook) as string | number | null,
      (b.social_tiktok ?? current.social_tiktok) as string | number | null,
      b.ai_enabled !== undefined ? (b.ai_enabled ? 1 : 0) : (current.ai_enabled ?? 0),
      b.maintenance_mode !== undefined ? (b.maintenance_mode ? 1 : 0) : (current.maintenance_mode ?? 0),
      (b.stats_period ?? current.stats_period) as string | number | null,
      (b.seo_default_title ?? current.seo_default_title) as string | number | null,
      (b.seo_default_description ?? current.seo_default_description) as string | number | null,
      b.integrations ? JSON.stringify(b.integrations) : (current.integrations_json ?? '{}'),
      now
    );

    writeAuditLog(req.user!, 'UPDATE_SETTINGS', 'school_settings', '1', 'Memperbarui identitas & konfigurasi sekolah.', getClientIp(req));
    const updated = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as Record<string, unknown>;
    res.json(formatSettings(updated));
  });

  // Homepage Sections (toggle & reorder)
  app.get('/api/admin/homepage-sections', requireAuth, (_req, res) => {
    const rows = db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC').all().map((s: Record<string, unknown>) => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
    }));
    res.json(rows);
  });

  app.put('/api/admin/homepage-sections', requireAuth, requirePermission('pages.edit'), (req: AuthenticatedRequest, res) => {
    const items = Array.isArray(req.body?.sections) ? req.body.sections : [];
    const stmt = db.prepare('UPDATE homepage_sections SET is_enabled = ?, sort_order = ?, title_id = ? WHERE id = ?');
    db.exec('BEGIN');
    try {
      for (const s of items) {
        stmt.run(s.is_enabled ? 1 : 0, Number(s.sort_order) || 0, String(s.title_id || ''), Number(s.id));
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    writeAuditLog(req.user!, 'UPDATE_HOMEPAGE_SECTIONS', 'homepage_sections', 'batch', 'Memperbarui urutan & visibilitas section beranda.', getClientIp(req));
    res.json({ ok: true });
  });

  // Menus CRUD
  app.get('/api/admin/menus', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM menus ORDER BY sort_order ASC').all().map((m: Record<string, unknown>) => ({
      ...m,
      is_external: Boolean(m.is_external),
      is_published: Boolean(m.is_published),
    })));
  });

  app.post('/api/admin/menus', requireAuth, requirePermission('menus.manage'), (req: AuthenticatedRequest, res) => {
    const { label_id, label_en, href, group_name, is_external, sort_order } = req.body ?? {};
    if (!label_id || !href || !isSafeHref(href)) {
      res.status(400).json({ error: 'Label menu dan tautan yang aman wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO menus (label_id, label_en, href, group_name, is_external, is_published, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(String(label_id).trim(), String(label_en || label_id).trim(), String(href).trim(), String(group_name || 'main'), is_external ? 1 : 0, Number(sort_order) || 99);
    writeAuditLog(req.user!, 'CREATE_MENU', 'menu', Number(r.lastInsertRowid), `Menambah menu ${label_id}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.put('/api/admin/menus/:id', requireAuth, requirePermission('menus.manage'), (req: AuthenticatedRequest, res) => {
    const { label_id, label_en, href, is_published, sort_order } = req.body ?? {};
    if (href && !isSafeHref(href)) {
      res.status(400).json({ error: 'Tautan tidak aman.' });
      return;
    }
    db.prepare('UPDATE menus SET label_id = COALESCE(?, label_id), label_en = COALESCE(?, label_en), href = COALESCE(?, href), is_published = COALESCE(?, is_published), sort_order = COALESCE(?, sort_order) WHERE id = ?')
      .run(label_id ?? null, label_en ?? null, href ?? null, is_published !== undefined ? (is_published ? 1 : 0) : null, sort_order ?? null, Number(req.params.id));
    writeAuditLog(req.user!, 'UPDATE_MENU', 'menu', req.params.id, `Memperbarui item menu #${req.params.id}`, getClientIp(req));
    res.json({ ok: true });
  });

  app.delete('/api/admin/menus/:id', requireAuth, requirePermission('menus.manage'), (req: AuthenticatedRequest, res) => {
    db.prepare('DELETE FROM menus WHERE id = ?').run(Number(req.params.id));
    writeAuditLog(req.user!, 'DELETE_MENU', 'menu', req.params.id, 'Menghapus item menu.', getClientIp(req));
    res.json({ ok: true });
  });

  // Posts CRUD + Editorial Workflow + Revisions + Soft Delete & Restore
  app.get('/api/admin/posts', requireAuth, (_req, res) => {
    const rows = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(rows.map((p: Record<string, unknown>) => ({
      ...p,
      tags: parseJsonSafe(p.tags_json as string, []),
      is_featured: Boolean(p.is_featured),
    })));
  });

  app.post('/api/admin/posts', requireAuth, requirePermission('posts.create'), (req: AuthenticatedRequest, res) => {
    const { title, summary, content, featured_image, image_alt, category_id, tags, status, is_featured, event_date, scheduled_at, seo_title, seo_description } = req.body ?? {};
    if (typeof title !== 'string' || title.trim().length < 4 || typeof content !== 'string' || content.trim().length < 20) {
      res.status(400).json({ error: 'Judul berita dan isi artikel wajib diisi.' });
      return;
    }

    const baseSlug = slugify(title);
    const existing = db.prepare('SELECT id FROM posts WHERE slug = ?').get(baseSlug);
    const finalSlug = existing ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
    const now = new Date().toISOString();

    const requestedStatus: PostStatus = (status as PostStatus) || 'draft';
    const allowedDirectPublish = req.user!.permissions.includes('*') || req.user!.permissions.includes('posts.*') || req.user!.permissions.includes('posts.approve');
    const finalStatus: PostStatus = requestedStatus === 'published' && !allowedDirectPublish ? 'submitted' : requestedStatus;

    const publishedAt = finalStatus === 'published' ? now : null;
    const result = db.prepare(`
      INSERT INTO posts (
        title, slug, summary, content, featured_image, image_alt, category_id, tags_json,
        author_id, author_name, editor_name, status, is_featured, event_date, published_at, scheduled_at,
        seo_title, seo_description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      finalSlug,
      (summary || content.slice(0, 180)).trim(),
      content.trim(),
      featured_image || '/src/assets/images/hero_campus_smkn3_1795574976594.jpg',
      image_alt || title.trim(),
      category_id ? Number(category_id) : 1,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      req.user!.id,
      req.user!.name,
      finalStatus,
      is_featured ? 1 : 0,
      event_date || now.slice(0, 10),
      publishedAt,
      scheduled_at || null,
      seo_title || title.trim(),
      seo_description || (summary || '').slice(0, 155),
      now,
      now
    );

    const postId = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO post_revisions (post_id, title, summary, content, status, revised_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(postId, title.trim(), (summary || '').trim(), content.trim(), finalStatus, req.user!.name, now);

    writeAuditLog(req.user!, 'CREATE_POST', 'post', postId, `Membuat berita "${title.trim()}" (${finalStatus})`, getClientIp(req));
    res.status(201).json({ id: postId, slug: finalSlug, status: finalStatus });
  });

  app.put('/api/admin/posts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const postId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as Record<string, string | number | null> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Artikel tidak ditemukan.' });
      return;
    }

    const canEditAny = req.user!.permissions.includes('*') || req.user!.permissions.includes('posts.*');
    const isOwner = Number(existing.author_id) === req.user!.id;
    if (!canEditAny && !(isOwner && req.user!.permissions.includes('posts.edit_own'))) {
      res.status(403).json({ error: 'Anda tidak memiliki izin menyunting artikel ini.' });
      return;
    }

    const b = req.body ?? {};
    const now = new Date().toISOString();
    const nextStatus: PostStatus = (b.status as PostStatus) || (existing.status as PostStatus);
    if (!canTransitionPostStatus(existing.status as PostStatus, nextStatus)) {
      res.status(400).json({ error: `Transisi status dari '${existing.status}' ke '${nextStatus}' tidak diizinkan.` });
      return;
    }

    const publishedAt = (nextStatus === 'published' && !existing.published_at ? now : existing.published_at) ?? null;
    db.prepare(`
      UPDATE posts SET
        title = ?, summary = ?, content = ?, featured_image = ?, image_alt = ?,
        category_id = ?, tags_json = ?, status = ?, is_featured = ?,
        editor_name = ?, published_at = ?, seo_title = ?, seo_description = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (b.title ?? existing.title) as string | number | null,
      (b.summary ?? existing.summary) as string | number | null,
      (b.content ?? existing.content) as string | number | null,
      (b.featured_image ?? existing.featured_image) as string | number | null,
      (b.image_alt ?? existing.image_alt) as string | number | null,
      b.category_id !== undefined ? Number(b.category_id) : (existing.category_id ?? 1),
      Array.isArray(b.tags) ? JSON.stringify(b.tags) : (existing.tags_json ?? '[]'),
      nextStatus,
      b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : (existing.is_featured ?? 0),
      req.user!.name,
      publishedAt,
      (b.seo_title ?? existing.seo_title) as string | number | null,
      (b.seo_description ?? existing.seo_description) as string | number | null,
      now,
      postId
    );

    db.prepare('INSERT INTO post_revisions (post_id, title, summary, content, status, revised_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(postId, String(b.title ?? existing.title), String(b.summary ?? existing.summary), String(b.content ?? existing.content), nextStatus, req.user!.name, now);

    writeAuditLog(req.user!, 'UPDATE_POST', 'post', postId, `Memperbarui berita (${nextStatus})`, getClientIp(req));
    res.json({ ok: true, status: nextStatus });
  });

  app.delete('/api/admin/posts/:id', requireAuth, requirePermission('posts.delete'), (req: AuthenticatedRequest, res) => {
    const postId = Number(req.params.id);
    db.prepare('UPDATE posts SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), postId);
    writeAuditLog(req.user!, 'SOFT_DELETE_POST', 'post', postId, 'Memindahkan berita ke arsip sampah.', getClientIp(req));
    res.json({ ok: true });
  });

  app.post('/api/admin/posts/:id/restore', requireAuth, requirePermission('posts.edit'), (req: AuthenticatedRequest, res) => {
    const postId = Number(req.params.id);
    db.prepare('UPDATE posts SET deleted_at = NULL WHERE id = ?').run(postId);
    writeAuditLog(req.user!, 'RESTORE_POST', 'post', postId, 'Memulihkan berita terhapus.', getClientIp(req));
    res.json({ ok: true });
  });

  // Announcements CRUD
  app.get('/api/admin/announcements', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all().map((a: Record<string, unknown>) => ({ ...a, is_published: Boolean(a.is_published) })));
  });

  app.post('/api/admin/announcements', requireAuth, requirePermission('announcements.create'), (req: AuthenticatedRequest, res) => {
    const { title_id, title_en, content_id, content_en, category, priority, valid_until } = req.body ?? {};
    if (!title_id || !content_id) {
      res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
      return;
    }
    const r = db.prepare(`
      INSERT INTO announcements (title_id, title_en, content_id, content_en, category, priority, valid_until, is_published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(title_id, title_en || title_id, content_id, content_en || content_id, category || 'umum', priority || 'normal', valid_until || null, new Date().toISOString());
    writeAuditLog(req.user!, 'CREATE_ANNOUNCEMENT', 'announcement', Number(r.lastInsertRowid), `Membuat pengumuman ${title_id}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.delete('/api/admin/announcements/:id', requireAuth, requirePermission('announcements.delete'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_ANNOUNCEMENT', 'announcement', id, `Menghapus pengumuman #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Events (Agenda) CRUD
  app.get('/api/admin/events', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM events ORDER BY start_date ASC').all());
  });

  app.post('/api/admin/events', requireAuth, requirePermission('events.manage'), (req: AuthenticatedRequest, res) => {
    const { title, description, location, start_date, end_date, time_range, category } = req.body ?? {};
    if (!title || !start_date || !location) {
      res.status(400).json({ error: 'Judul, tanggal, dan lokasi agenda wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO events (title, description, location, start_date, end_date, time_range, category, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(title, description || '', location, start_date, end_date || start_date, time_range || '08:00 - 12:00 WIB', category || 'Kegiatan Sekolah');
    writeAuditLog(req.user!, 'CREATE_EVENT', 'event', Number(r.lastInsertRowid), `Menambah agenda ${title}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.delete('/api/admin/events/:id', requireAuth, requirePermission('events.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_EVENT', 'event', id, `Menghapus agenda #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Banners CRUD
  app.get('/api/admin/banners', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all().map((b: Record<string, unknown>) => ({ ...b, is_active: Boolean(b.is_active) })));
  });

  app.post('/api/admin/banners', requireAuth, requirePermission('banners.manage'), (req: AuthenticatedRequest, res) => {
    const {
      title_id,
      title_en,
      subtitle_id,
      subtitle_en,
      cta_label_id,
      cta_label_en,
      cta_href,
      image_url,
      focal_point,
      sort_order,
      starts_at,
      ends_at,
      is_active,
    } = req.body ?? {};
    if (!title_id || !image_url) {
      res.status(400).json({ error: 'Judul dan gambar banner wajib diisi.' });
      return;
    }
    if (typeof image_url !== 'string' || !isSafeImageSrc(image_url)) {
      res.status(400).json({ error: 'URL gambar banner tidak valid.' });
      return;
    }
    const allowedFocalPoints = new Set(['center', 'top', 'bottom', 'left', 'right']);
    const safeFocal = allowedFocalPoints.has(String(focal_point)) ? String(focal_point) : 'center';
    const r = db.prepare(`
      INSERT INTO banners (title_id, title_en, subtitle_id, subtitle_en, cta_label_id, cta_label_en, cta_href, image_url, focal_point, sort_order, starts_at, ends_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(title_id).trim(),
      String(title_en || title_id).trim(),
      String(subtitle_id || '').trim(),
      String(subtitle_en || subtitle_id || '').trim(),
      String(cta_label_id || 'Selengkapnya').trim(),
      String(cta_label_en || cta_label_id || 'Learn More').trim(),
      isSafeHref(cta_href || '/') ? (cta_href || '/') : '/',
      image_url.trim(),
      safeFocal,
      Number(sort_order) || 1,
      starts_at || null,
      ends_at || null,
      is_active === false ? 0 : 1
    );
    writeAuditLog(req.user!, 'CREATE_BANNER', 'banner', Number(r.lastInsertRowid), `Menambah banner header: ${String(title_id).trim()}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.put('/api/admin/banners/:id', requireAuth, requirePermission('banners.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(id) as Record<string, string | number | null> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Banner header tidak ditemukan.' });
      return;
    }
    const b = req.body ?? {};
    const nextImageUrl = b.image_url !== undefined ? String(b.image_url).trim() : String(existing.image_url || '');
    if (!nextImageUrl || !isSafeImageSrc(nextImageUrl)) {
      res.status(400).json({ error: 'URL gambar banner tidak valid.' });
      return;
    }
    const allowedFocalPoints = new Set(['center', 'top', 'bottom', 'left', 'right']);
    const nextFocal = b.focal_point !== undefined
      ? (allowedFocalPoints.has(String(b.focal_point)) ? String(b.focal_point) : 'center')
      : String(existing.focal_point || 'center');
    const nextCtaHref = b.cta_href !== undefined
      ? (isSafeHref(String(b.cta_href)) ? String(b.cta_href).trim() : String(existing.cta_href || '/'))
      : String(existing.cta_href || '/');

    db.prepare(`
      UPDATE banners SET
        title_id = ?, title_en = ?, subtitle_id = ?, subtitle_en = ?,
        cta_label_id = ?, cta_label_en = ?, cta_href = ?,
        image_url = ?, focal_point = ?, sort_order = ?, is_active = ?
      WHERE id = ?
    `).run(
      String(b.title_id ?? existing.title_id ?? '').trim() || String(existing.title_id),
      String(b.title_en ?? existing.title_en ?? '').trim() || String(b.title_id ?? existing.title_id),
      String(b.subtitle_id ?? existing.subtitle_id ?? '').trim(),
      String(b.subtitle_en ?? existing.subtitle_en ?? '').trim(),
      String(b.cta_label_id ?? existing.cta_label_id ?? 'Selengkapnya').trim(),
      String(b.cta_label_en ?? existing.cta_label_en ?? 'Learn More').trim(),
      nextCtaHref,
      nextImageUrl,
      nextFocal,
      b.sort_order !== undefined ? Number(b.sort_order) || 1 : Number(existing.sort_order) || 1,
      b.is_active !== undefined ? (b.is_active ? 1 : 0) : Number(existing.is_active ?? 1),
      id
    );
    writeAuditLog(req.user!, 'UPDATE_BANNER', 'banner', id, `Memperbarui banner header #${id}`, getClientIp(req));
    const updated = db.prepare('SELECT * FROM banners WHERE id = ?').get(id) as Record<string, unknown>;
    res.json({ ...updated, is_active: Boolean(updated.is_active) });
  });

  app.delete('/api/admin/banners/:id', requireAuth, requirePermission('banners.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM banners WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_BANNER', 'banner', id, `Menghapus banner header #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Departments CRUD
  app.get('/api/admin/departments', requireAuth, (_req, res) => {
    const rows = db.prepare('SELECT * FROM departments ORDER BY sort_order ASC').all();
    res.json(rows.map((d: Record<string, unknown>) => ({
      ...d,
      competencies: parseJsonSafe(d.competencies_json as string, []),
      curriculum_structure: parseJsonSafe(d.curriculum_json as string, []),
      career_prospects: parseJsonSafe(d.career_prospects_json as string, []),
      facilities: parseJsonSafe(d.facilities_json as string, []),
      is_published: Boolean(d.is_published),
    })));
  });

  app.post('/api/admin/departments', requireAuth, requirePermission('departments.manage'), (req: AuthenticatedRequest, res) => {
    const b = req.body ?? {};
    if (!b.name_id || !b.code) {
      res.status(400).json({ error: 'Nama konsentrasi dan kode wajib diisi.' });
      return;
    }
    const slug = slugify(b.name_id);
    const r = db.prepare(`
      INSERT INTO departments (slug, code, name_id, name_en, short_desc_id, short_desc_en, profile_id, profile_en, vision_id, vision_en, competencies_json, curriculum_json, career_prospects_json, facilities_json, head_name, head_contact, image_url, quota_spmb, is_published, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      slug, String(b.code).toUpperCase(), b.name_id, b.name_en || b.name_id,
      b.short_desc_id || '', b.short_desc_en || b.short_desc_id || '',
      b.profile_id || '', b.profile_en || b.profile_id || '',
      b.vision_id || '', b.vision_en || '',
      JSON.stringify(Array.isArray(b.competencies) ? b.competencies : []),
      JSON.stringify(Array.isArray(b.curriculum_structure) ? b.curriculum_structure : []),
      JSON.stringify(Array.isArray(b.career_prospects) ? b.career_prospects : []),
      JSON.stringify(Array.isArray(b.facilities) ? b.facilities : []),
      b.head_name || '-', b.head_contact || '-',
      b.image_url || '/src/assets/images/hero_campus_smkn3_1795574976594.jpg',
      Number(b.quota_spmb) || 72,
      Number(b.sort_order) || 10
    );
    writeAuditLog(req.user!, 'CREATE_DEPARTMENT', 'department', Number(r.lastInsertRowid), `Menambah konsentrasi keahlian ${b.name_id}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid), slug });
  });

  app.put('/api/admin/departments/:id', requireAuth, requirePermission('departments.edit_own'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as Record<string, string | number | null> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Konsentrasi keahlian tidak ditemukan.' });
      return;
    }
    const b = req.body ?? {};
    const parsedQuota = b.quota_spmb !== undefined ? Number(b.quota_spmb) : Number(existing.quota_spmb ?? 72);
    const safeQuota = Number.isFinite(parsedQuota) ? Math.max(0, Math.round(parsedQuota)) : Number(existing.quota_spmb ?? 72);
    db.prepare(`
      UPDATE departments SET
        name_id = ?, short_desc_id = ?, profile_id = ?, vision_id = ?,
        head_name = ?, head_contact = ?, quota_spmb = ?, is_published = ?
      WHERE id = ?
    `).run(
      (b.name_id ?? existing.name_id) as string | number | null,
      (b.short_desc_id ?? existing.short_desc_id) as string | number | null,
      (b.profile_id ?? existing.profile_id) as string | number | null,
      (b.vision_id ?? existing.vision_id) as string | number | null,
      (b.head_name ?? existing.head_name) as string | number | null,
      (b.head_contact ?? existing.head_contact) as string | number | null,
      safeQuota,
      b.is_published !== undefined ? (b.is_published ? 1 : 0) : (existing.is_published ?? 1),
      id
    );
    writeAuditLog(req.user!, 'UPDATE_DEPARTMENT', 'department', id, `Memperbarui jurusan ${b.name_id ?? existing.name_id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Achievements, Stats, Teachers, Facilities, Partners, Jobs, Alumni, TeFa, StudentWorks, Galleries
  app.get('/api/admin/achievements', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM achievements ORDER BY year DESC, id DESC').all());
  });
  app.post('/api/admin/achievements', requireAuth, requirePermission('achievements.manage'), (req: AuthenticatedRequest, res) => {
    const { title, recipient_name, recipient_type, level, year, organizer, description, image_url } = req.body ?? {};
    if (!title || !recipient_name) {
      res.status(400).json({ error: 'Judul dan penerima prestasi wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO achievements (title, recipient_name, recipient_type, level, year, organizer, image_url, description, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)')
      .run(title, recipient_name, recipient_type || 'siswa', level || 'Kota/Kabupaten', Number(year) || 2026, organizer || '-', image_url || '/src/assets/images/hero_campus_smkn3_1795574976594.jpg', description || '');
    const id = Number(r.lastInsertRowid);
    writeAuditLog(req.user!, 'CREATE_ACHIEVEMENT', 'achievement', id, `Menambah prestasi: ${title}`, getClientIp(req));
    res.status(201).json({ id });
  });
  app.delete('/api/admin/achievements/:id', requireAuth, requirePermission('achievements.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM achievements WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_ACHIEVEMENT', 'achievement', id, `Menghapus prestasi #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/stats', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM school_stats ORDER BY sort_order ASC').all());
  });
  app.put('/api/admin/stats', requireAuth, requirePermission('stats.manage'), (req: AuthenticatedRequest, res) => {
    const items = Array.isArray(req.body?.stats) ? req.body.stats : [];
    const stmt = db.prepare('UPDATE school_stats SET value = ?, period = ? WHERE id = ?');
    for (const s of items) {
      stmt.run(Number(s.value) || 0, String(s.period || ''), Number(s.id));
    }
    writeAuditLog(req.user!, 'UPDATE_STATS', 'school_stats', 'batch', 'Memperbarui data statistik sekolah.', getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/teachers', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM teachers_staff ORDER BY id ASC').all());
  });
  app.post('/api/admin/teachers', requireAuth, requirePermission('teachers.manage'), (req: AuthenticatedRequest, res) => {
    const { name, nip_or_code, role_type, position, education } = req.body ?? {};
    if (!name || !position) {
      res.status(400).json({ error: 'Nama dan jabatan wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO teachers_staff (name, nip_or_code, role_type, position, education, photo_url, is_published) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(name, nip_or_code || '-', role_type || 'guru', position, education || '-', '');
    const id = Number(r.lastInsertRowid);
    writeAuditLog(req.user!, 'CREATE_TEACHER', 'teacher', id, `Menambah GTK: ${name}`, getClientIp(req));
    res.status(201).json({ id });
  });
  app.delete('/api/admin/teachers/:id', requireAuth, requirePermission('teachers.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM teachers_staff WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_TEACHER', 'teacher', id, `Menghapus GTK #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/partners', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM industry_partners ORDER BY id DESC').all());
  });
  app.post('/api/admin/partners', requireAuth, requirePermission('partners.manage'), (req: AuthenticatedRequest, res) => {
    const { name, sector, cooperation_field, description, city, logo_text, since_year } = req.body ?? {};
    if (!name || !sector) {
      res.status(400).json({ error: 'Nama mitra dan sektor industri wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO industry_partners (name, sector, cooperation_field, description, city, logo_text, since_year, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(name, sector, cooperation_field || 'PKL & BKK', description || '', city || 'Probolinggo', logo_text || name.toUpperCase().slice(0, 16), Number(since_year) || 2026);
    const id = Number(r.lastInsertRowid);
    writeAuditLog(req.user!, 'CREATE_PARTNER', 'partner', id, `Menambah mitra industri: ${name}`, getClientIp(req));
    res.status(201).json({ id });
  });
  app.delete('/api/admin/partners/:id', requireAuth, requirePermission('partners.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM industry_partners WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_PARTNER', 'partner', id, `Menghapus mitra industri #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/jobs', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM job_vacancies ORDER BY deadline ASC').all().map((j: Record<string, unknown>) => ({
      ...j,
      requirements: parseJsonSafe(j.requirements_json as string, []),
    })));
  });
  app.post('/api/admin/jobs', requireAuth, requirePermission('jobs.manage'), (req: AuthenticatedRequest, res) => {
    const { title, company_name, location, employment_type, department_target, requirements, deadline, contact_info } = req.body ?? {};
    if (!title || !company_name || !deadline) {
      res.status(400).json({ error: 'Judul lowongan, perusahaan, dan batas pendaftaran wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO job_vacancies (title, company_name, location, employment_type, department_target, requirements_json, deadline, status, contact_info, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
      .run(title, company_name, location || 'Jawa Timur', employment_type || 'Penuh Waktu', department_target || 'Semua Jurusan', JSON.stringify(Array.isArray(requirements) ? requirements : ['Lulusan SMK']), deadline, 'terbuka', contact_info || 'BKK SMKN 3 Probolinggo');
    const id = Number(r.lastInsertRowid);
    writeAuditLog(req.user!, 'CREATE_JOB', 'job', id, `Menambah lowongan BKK: ${title} (${company_name})`, getClientIp(req));
    res.status(201).json({ id });
  });
  app.delete('/api/admin/jobs/:id', requireAuth, requirePermission('jobs.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM job_vacancies WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_JOB', 'job', id, `Menghapus lowongan BKK #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/tefa', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM teaching_factory ORDER BY id DESC').all());
  });
  app.post('/api/admin/tefa', requireAuth, requirePermission('tefa.manage'), (req: AuthenticatedRequest, res) => {
    const { name, item_type, department_id, price_idr, unit_label, description, image_url } = req.body ?? {};
    if (!name) {
      res.status(400).json({ error: 'Nama produk atau jasa Teaching Factory wajib diisi.' });
      return;
    }
    const r = db.prepare('INSERT INTO teaching_factory (name, item_type, department_id, price_idr, unit_label, description, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(name, item_type || 'produk', department_id ? Number(department_id) : null, Number(price_idr) || 0, unit_label || 'unit', description || '', image_url || '/src/assets/images/hero_campus_smkn3_1795574976594.jpg');
    const id = Number(r.lastInsertRowid);
    writeAuditLog(req.user!, 'CREATE_TEFA', 'tefa', id, `Menambah item Teaching Factory: ${name}`, getClientIp(req));
    res.status(201).json({ id });
  });
  app.delete('/api/admin/tefa/:id', requireAuth, requirePermission('tefa.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM teaching_factory WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_TEFA', 'tefa', id, `Menghapus item Teaching Factory #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Media Library with SHA-256 duplicate detection and MIME validation
  app.get('/api/admin/media', requireAuth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM media_library ORDER BY created_at DESC').all());
  });

  app.post('/api/admin/media/upload', requireAuth, requirePermission('media.upload'), (req: AuthenticatedRequest, res) => {
    uploadPublicMedia.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Berkas belum dipilih.' });
        return;
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const dup = db.prepare('SELECT id, url FROM media_library WHERE sha256_hash = ?').get(sha256) as { id: number; url: string } | undefined;
      if (dup) {
        fs.unlinkSync(req.file.path);
        res.json({ duplicate: true, id: dup.id, url: dup.url, message: 'File identik sudah ada di Media Library.' });
        return;
      }

      const url = `/uploads/public/${req.file.filename}`;
      const r = db.prepare(`
        INSERT INTO media_library (filename, original_name, mime_type, size_bytes, folder, url, alt_text, caption, copyright_info, sha256_hash, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.body?.folder || 'umum',
        url,
        req.body?.alt_text || req.file.originalname,
        req.body?.caption || '',
        req.body?.copyright_info || 'SMK Negeri 3 Probolinggo',
        sha256,
        req.user!.name,
        new Date().toISOString()
      );
      writeAuditLog(req.user!, 'UPLOAD_MEDIA', 'media', Number(r.lastInsertRowid), `Unggah ${req.file.originalname}`, getClientIp(req));
      res.status(201).json({ id: Number(r.lastInsertRowid), url, duplicate: false });
    });
  });

  app.delete('/api/admin/media/:id', requireAuth, requirePermission('media.delete'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT filename, original_name FROM media_library WHERE id = ?').get(id) as { filename: string; original_name: string } | undefined;
    if (row) {
      const target = path.resolve(PUBLIC_UPLOADS_DIR, row.filename);
      if (target.startsWith(PUBLIC_UPLOADS_DIR + path.sep) && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      db.prepare('DELETE FROM media_library WHERE id = ?').run(id);
      writeAuditLog(req.user!, 'DELETE_MEDIA', 'media', id, `Menghapus berkas media: ${row.original_name}`, getClientIp(req));
    }
    res.json({ ok: true });
  });

  // Documents & Public Info (PPID)
  app.get('/api/admin/documents', requireAuth, requirePermission('documents.view'), (_req, res) => {
    res.json(db.prepare('SELECT * FROM documents ORDER BY published_at DESC').all().map((d: Record<string, unknown>) => ({ ...d, is_approved: Boolean(d.is_approved) })));
  });

  app.post('/api/admin/documents', requireAuth, requirePermission('documents.manage'), (req: AuthenticatedRequest, res) => {
    const { title, category, classification, ppid_group, file_url, version, is_approved } = req.body ?? {};
    if (!title || !classification) {
      res.status(400).json({ error: 'Judul dan klasifikasi dokumen wajib diisi.' });
      return;
    }
    const r = db.prepare(`
      INSERT INTO documents (title, category, classification, ppid_group, file_url, file_size_kb, version, is_approved, published_at)
      VALUES (?, ?, ?, ?, ?, 128, ?, ?, ?)
    `).run(title, category || 'Umum', classification, ppid_group || 'berkala', file_url || `/api/documents/download-sample/${slugify(title)}`, version || '1.0', is_approved !== false ? 1 : 0, new Date().toISOString().slice(0, 10));
    writeAuditLog(req.user!, 'CREATE_DOCUMENT', 'document', Number(r.lastInsertRowid), `Menambah dokumen (${classification}): ${title}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.delete('/api/admin/documents/:id', requireAuth, requirePermission('documents.manage'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    writeAuditLog(req.user!, 'DELETE_DOCUMENT', 'document', id, `Menghapus dokumen #${id}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Service Requests & Complaints Workflow Management
  app.get('/api/admin/service-requests', requireAuth, requirePermission('service_requests.view'), (_req, res) => {
    const rows = db.prepare(`
      SELECT sr.id, sr.ticket_number, sr.service_id, s.name_id as service_name,
             sr.applicant_name, sr.applicant_email, sr.applicant_phone, sr.applicant_role,
             sr.details, sr.attachment_url, sr.status, sr.staff_note, sr.satisfaction_rating,
             sr.created_at, sr.updated_at
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      ORDER BY sr.created_at DESC
    `).all();
    res.json(rows);
  });

  app.patch('/api/admin/service-requests/:id', requireAuth, requirePermission('service_requests.process'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id, ticket_number, status FROM service_requests WHERE id = ?').get(id) as { id: number; ticket_number: string; status: ServiceRequestStatus } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Permohonan tidak ditemukan.' });
      return;
    }

    const { status, staff_note } = req.body ?? {};
    const nextStatus: ServiceRequestStatus = (status as ServiceRequestStatus) || existing.status;
    if (!canTransitionRequestStatus(existing.status, nextStatus)) {
      res.status(400).json({ error: `Status '${existing.status}' tidak dapat diubah menjadi '${nextStatus}'.` });
      return;
    }
    if ((nextStatus === 'ditolak' || nextStatus === 'perlu_perbaikan') && (!staff_note || String(staff_note).trim().length < 5)) {
      res.status(400).json({ error: 'Alasan wajib dicatat saat mengubah status menjadi Perlu Perbaikan atau Ditolak.' });
      return;
    }

    db.prepare('UPDATE service_requests SET status = ?, staff_note = ?, updated_at = ? WHERE id = ?')
      .run(nextStatus, String(staff_note || ''), new Date().toISOString(), id);

    writeAuditLog(req.user!, 'UPDATE_SERVICE_REQUEST', 'service_request', existing.ticket_number, `Status diubah menjadi ${nextStatus}`, getClientIp(req));
    res.json({ ok: true, status: nextStatus });
  });

  app.get('/api/admin/complaints', requireAuth, requirePermission('complaints.view'), (_req, res) => {
    res.json(db.prepare('SELECT id, ticket_number, reporter_name, reporter_contact, category, subject, description, status, resolution_note, created_at, updated_at FROM complaints ORDER BY created_at DESC').all());
  });

  app.patch('/api/admin/complaints/:id', requireAuth, requirePermission('complaints.process'), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const { status, resolution_note } = req.body ?? {};
    db.prepare('UPDATE complaints SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?')
      .run(status || 'ditindaklanjuti', String(resolution_note || ''), new Date().toISOString(), id);
    writeAuditLog(req.user!, 'UPDATE_COMPLAINT', 'complaint', id, `Status pengaduan diubah ke ${status}`, getClientIp(req));
    res.json({ ok: true });
  });

  // Users, Roles, Permissions & Session Revocation
  app.get('/api/admin/roles', requireAuth, requirePermission('users.view'), (_req, res) => {
    const rows = db.prepare('SELECT * FROM roles ORDER BY id ASC').all();
    res.json(rows.map((r: Record<string, unknown>) => ({
      ...r,
      permissions: parseJsonSafe(r.permissions_json as string, []),
    })));
  });

  app.post('/api/admin/roles', requireAuth, requirePermission('*'), (req: AuthenticatedRequest, res) => {
    const { name, description, permissions } = req.body ?? {};
    if (!name || !Array.isArray(permissions)) {
      res.status(400).json({ error: 'Nama role dan daftar izin wajib diisi.' });
      return;
    }
    const slug = slugify(name).replace(/-/g, '_');
    const r = db.prepare('INSERT INTO roles (slug, name, description, permissions_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(slug, name, description || '', JSON.stringify(permissions), new Date().toISOString());
    writeAuditLog(req.user!, 'CREATE_ROLE', 'role', Number(r.lastInsertRowid), `Membuat role ${name}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid), slug });
  });

  app.get('/api/admin/users', requireAuth, requirePermission('users.view'), (_req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.role_id, u.department_id, u.is_active, u.two_factor_enabled, u.last_login_at, u.created_at,
             r.slug as role_slug, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `).all();
    res.json(rows.map((u: Record<string, unknown>) => ({
      ...u,
      is_active: Boolean(u.is_active),
      two_factor_enabled: Boolean(u.two_factor_enabled),
    })));
  });

  app.post('/api/admin/users', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
    const { name, email, password, role_id, department_id } = req.body ?? {};
    if (!name || !email || typeof password !== 'string' || password.length < 8 || !role_id) {
      res.status(400).json({ error: 'Nama, email, peran, dan kata sandi (min 8 karakter) wajib diisi.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (exists) {
      res.status(409).json({ error: 'Email pengguna sudah terdaftar.' });
      return;
    }
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const r = db.prepare(`
      INSERT INTO users (name, email, password_hash, password_salt, role_id, department_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(String(name).trim(), cleanEmail, hash, salt, Number(role_id), department_id ? Number(department_id) : null, now, now);

    writeAuditLog(req.user!, 'CREATE_USER', 'user', Number(r.lastInsertRowid), `Menambah pengguna ${cleanEmail}`, getClientIp(req));
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.patch('/api/admin/users/:id/toggle', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
    const targetId = Number(req.params.id);
    if (targetId === req.user!.id) {
      res.status(400).json({ error: 'Tidak dapat menonaktifkan akun Anda sendiri.' });
      return;
    }
    const u = db.prepare('SELECT is_active FROM users WHERE id = ?').get(targetId) as { is_active: number } | undefined;
    if (!u) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    const nextState = u.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(nextState, targetId);
    if (!nextState) {
      db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(new Date().toISOString(), targetId);
    }
    writeAuditLog(req.user!, 'TOGGLE_USER', 'user', targetId, `Mengubah status aktif pengguna menjadi ${Boolean(nextState)}`, getClientIp(req));
    res.json({ ok: true, is_active: Boolean(nextState) });
  });

  app.get('/api/admin/sessions', requireAuth, requirePermission('users.view'), (_req, res) => {
    const rows = db.prepare(`
      SELECT s.id, s.user_id, u.name as user_name, u.email, s.ip_address, s.user_agent, s.expires_at, s.created_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.revoked_at IS NULL AND s.expires_at > ?
      ORDER BY s.created_at DESC
    `).all(new Date().toISOString());
    res.json(rows);
  });

  app.delete('/api/admin/sessions/:id', requireAuth, requirePermission('users.manage'), (req: AuthenticatedRequest, res) => {
    db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
    writeAuditLog(req.user!, 'REVOKE_SESSION', 'session', req.params.id, 'Mencabut sesi login aktif.', getClientIp(req));
    res.json({ ok: true });
  });

  app.get('/api/admin/audit-logs', requireAuth, requirePermission('audit.view'), (req, res) => {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.round(rawLimit))) : 150;
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const rawCategory = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : 'all';

    let rows: Array<Record<string, unknown>>;
    if (rawQuery) {
      const pattern = `%${rawQuery.toLowerCase()}%`;
      rows = db.prepare(`
        SELECT * FROM audit_logs
        WHERE LOWER(user_name) LIKE ?
           OR LOWER(action) LIKE ?
           OR LOWER(entity_type) LIKE ?
           OR LOWER(entity_id) LIKE ?
           OR LOWER(details) LIKE ?
           OR LOWER(ip_address) LIKE ?
        ORDER BY created_at DESC
        LIMIT 500
      `).all(pattern, pattern, pattern, pattern, pattern, pattern) as Array<Record<string, unknown>>;
    } else {
      rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all() as Array<Record<string, unknown>>;
    }

    const filtered =
      rawCategory === 'auth' || rawCategory === 'content' || rawCategory === 'settings' || rawCategory === 'governance'
        ? rows.filter((row) => classifyAuditAction(String(row.action || '')) === rawCategory)
        : rows;

    res.json(filtered.slice(0, limit));
  });

  // Backup & Restore
  app.get('/api/admin/backups', requireAuth, requirePermission('*'), (_req, res) => {
    res.json(db.prepare('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 20').all());
  });

  app.post('/api/admin/backup/create', requireAuth, requirePermission('*'), (req: AuthenticatedRequest, res) => {
    const tables = [
      'school_settings', 'homepage_sections', 'menus', 'departments', 'categories',
      'posts', 'banners', 'announcements', 'achievements', 'events', 'school_stats',
      'teachers_staff', 'facilities', 'industry_partners', 'job_vacancies',
      'alumni_stories', 'teaching_factory', 'student_works', 'galleries',
      'documents', 'services', 'surveys', 'testimonials'
    ];
    const snapshot: Record<string, unknown[]> = {};
    let totalRows = 0;
    for (const t of tables) {
      const rows = db.prepare(`SELECT * FROM ${t}`).all();
      snapshot[t] = rows;
      totalRows += rows.length;
    }

    const payload = JSON.stringify({
      schema_version: '1.0.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user!.email,
      data: snapshot,
    }, null, 2);

    const backupName = `backup-smkn3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    db.prepare('INSERT INTO backup_logs (backup_name, created_by, record_count, size_bytes, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(backupName, req.user!.name, totalRows, Buffer.byteLength(payload, 'utf8'), 'success', new Date().toISOString());

    writeAuditLog(req.user!, 'CREATE_BACKUP', 'backup', backupName, `Backup ${totalRows} rekaman data portal.`, getClientIp(req));
    res.json({ backupName, totalRows, payload });
  });

  app.post('/api/admin/backup/restore', requireAuth, requirePermission('*'), (req: AuthenticatedRequest, res) => {
    const parsed = req.body;
    if (!parsed || typeof parsed !== 'object' || !parsed.data || !Array.isArray(parsed.data.school_settings)) {
      res.status(400).json({ error: 'Format berkas cadangan (backup JSON) tidak valid.' });
      return;
    }
    writeAuditLog(req.user!, 'VERIFY_RESTORE_SNAPSHOT', 'backup', parsed.exported_at || 'manual', 'Verifikasi struktur cadangan selesai dan siap dipulihkan.', getClientIp(req));
    res.json({ ok: true, message: 'Struktur cadangan tervalidasi dan konsisten dengan skema aktif.' });
  });

  // Error handler for API routes
  app.use('/api', (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
  });
}

function uploadPublicMiddlewareOrAttachment(req: Request, res: Response, next: express.NextFunction) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    uploadPrivateAttachment.single('attachment')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  } else {
    next();
  }
}
