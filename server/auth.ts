import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { hasPermission } from '../src/utils/portalLogic';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

// In-memory login throttling (IP -> failed attempts)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function hashToken(rawToken: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(rawToken).digest('hex');
}

export function createSession(userId: number, userAgent: string, ipAddress: string): { token: string; expiresAt: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, userAgent.slice(0, 200), ipAddress, expiresAt, now.toISOString());

  return { token: rawToken, expiresAt };
}

export function isLoginRateLimited(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= 6;
}

export function recordLoginFailure(ip: string): void {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 6) {
    entry.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  }
  loginAttempts.set(ip, entry);
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  department_id: number | null;
  permissions: string[];
  session_id: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function getSetupStatus(): {
  needsClaim: boolean;
  envConfigured: boolean;
  adminCount: number;
} {
  const envPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const row = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.slug = 'super_admin' AND u.is_active = 1
  `).get() as { cnt: number };

  return {
    needsClaim: row.cnt === 0 && !envPassword,
    envConfigured: Boolean(envPassword),
    adminCount: row.cnt,
  };
}

export function ensureEnvAdminIfConfigured(): void {
  const envPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  if (!envPassword) return;

  const superAdminRole = db.prepare(`SELECT id FROM roles WHERE slug = 'super_admin'`).get() as { id: number } | undefined;
  if (!superAdminRole) return;

  const existing = db.prepare(`SELECT id FROM users WHERE role_id = ?`).get(superAdminRole.id) as { id: number } | undefined;
  const { hash, salt } = hashPassword(envPassword);
  const now = new Date().toISOString();

  if (!existing) {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, password_salt, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run('Super Administrator', 'admin@smkn3probolinggo.sch.id', hash, salt, superAdminRole.id, now, now);
  } else {
    db.prepare(`
      UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?
    `).run(hash, salt, now, existing.id);
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' });
    return;
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    res.status(401).json({ error: 'Token sesi tidak valid.' });
    return;
  }

  const tokenHash = hashToken(rawToken);
  const row = db.prepare(`
    SELECT
      s.id as session_id,
      s.expires_at,
      s.revoked_at,
      u.id,
      u.name,
      u.email,
      u.role_id,
      u.department_id,
      u.is_active,
      r.slug as role_slug,
      r.name as role_name,
      r.permissions_json
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE s.token_hash = ?
  `).get(tokenHash) as {
    session_id: string;
    expires_at: string;
    revoked_at: string | null;
    id: number;
    name: string;
    email: string;
    role_id: number;
    department_id: number | null;
    is_active: number;
    role_slug: string;
    role_name: string;
    permissions_json: string;
  } | undefined;

  if (!row || row.revoked_at || !row.is_active) {
    res.status(401).json({ error: 'Sesi tidak aktif atau telah dicabut.' });
    return;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    res.status(401).json({ error: 'Sesi telah kedaluwarsa. Silakan masuk kembali.' });
    return;
  }

  req.user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role_id: row.role_id,
    role_slug: row.role_slug,
    role_name: row.role_name,
    department_id: row.department_id,
    permissions: JSON.parse(row.permissions_json) as string[],
    session_id: row.session_id,
  };

  next();
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    if (!hasPermission(req.user.permissions, permission)) {
      res.status(403).json({
        error: `Akses ditolak. Peran '${req.user.role_name}' tidak memiliki izin '${permission}'.`,
      });
      return;
    }
    next();
  };
}

export function writeAuditLog(
  user: AuthenticatedUser | null,
  action: string,
  entityType: string,
  entityId: string | number,
  details: string,
  ipAddress: string
): void {
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user ? user.id : null,
    user ? user.name : 'Publik/Sistem',
    action,
    entityType,
    String(entityId),
    details,
    ipAddress,
    new Date().toISOString()
  );
}
