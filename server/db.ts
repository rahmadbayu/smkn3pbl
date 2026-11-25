import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'smkn3_portal.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      school_name TEXT NOT NULL,
      school_type TEXT NOT NULL,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      slogan_id TEXT NOT NULL,
      slogan_en TEXT NOT NULL,
      address TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      website_url TEXT NOT NULL,
      principal_name TEXT NOT NULL,
      principal_title TEXT NOT NULL,
      principal_photo TEXT NOT NULL,
      principal_quote_id TEXT NOT NULL,
      principal_quote_en TEXT NOT NULL,
      principal_message_id TEXT NOT NULL,
      principal_message_en TEXT NOT NULL,
      vision_id TEXT NOT NULL,
      vision_en TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      mission_en TEXT NOT NULL,
      accreditation TEXT NOT NULL,
      npsn TEXT NOT NULL,
      profile_video_url TEXT NOT NULL,
      primary_color TEXT NOT NULL,
      secondary_color TEXT NOT NULL,
      social_instagram TEXT NOT NULL,
      social_youtube TEXT NOT NULL,
      social_facebook TEXT NOT NULL,
      social_tiktok TEXT NOT NULL,
      map_lat REAL NOT NULL,
      map_lng REAL NOT NULL,
      ai_enabled INTEGER NOT NULL DEFAULT 0,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      stats_period TEXT NOT NULL,
      seo_default_title TEXT NOT NULL,
      seo_default_description TEXT NOT NULL,
      integrations_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT NOT NULL UNIQUE,
      title_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL,
      label_en TEXT NOT NULL,
      href TEXT NOT NULL,
      group_name TEXT NOT NULL DEFAULT 'main',
      is_external INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      name_id TEXT NOT NULL,
      name_en TEXT NOT NULL,
      short_desc_id TEXT NOT NULL,
      short_desc_en TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      profile_en TEXT NOT NULL,
      vision_id TEXT NOT NULL,
      vision_en TEXT NOT NULL,
      competencies_json TEXT NOT NULL,
      curriculum_json TEXT NOT NULL,
      career_prospects_json TEXT NOT NULL,
      facilities_json TEXT NOT NULL,
      head_name TEXT NOT NULL,
      head_contact TEXT NOT NULL,
      image_url TEXT NOT NULL,
      video_url TEXT NOT NULL DEFAULT '',
      quota_spmb INTEGER NOT NULL DEFAULT 72,
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '',
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_en TEXT NOT NULL,
      section_group TEXT NOT NULL,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      featured_image TEXT NOT NULL DEFAULT '',
      image_alt TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      editor_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      is_featured INTEGER NOT NULL DEFAULT 0,
      event_date TEXT,
      published_at TEXT,
      scheduled_at TEXT,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      views_count INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      revised_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      subtitle_id TEXT NOT NULL,
      subtitle_en TEXT NOT NULL,
      cta_label_id TEXT NOT NULL,
      cta_label_en TEXT NOT NULL,
      cta_href TEXT NOT NULL,
      image_url TEXT NOT NULL,
      focal_point TEXT NOT NULL DEFAULT 'center',
      sort_order INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      ends_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_en TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'umum',
      priority TEXT NOT NULL DEFAULT 'normal',
      valid_until TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_type TEXT NOT NULL DEFAULT 'siswa',
      level TEXT NOT NULL,
      year INTEGER NOT NULL,
      organizer TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      image_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      time_range TEXT NOT NULL,
      category TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS school_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stat_key TEXT NOT NULL UNIQUE,
      label_id TEXT NOT NULL,
      label_en TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teachers_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nip_or_code TEXT NOT NULL,
      role_type TEXT NOT NULL DEFAULT 'guru',
      position TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      education TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS extracurriculars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      coach_name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      description TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      capacity TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'Baik',
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS industry_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      cooperation_field TEXT NOT NULL,
      description TEXT NOT NULL,
      city TEXT NOT NULL,
      logo_text TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      since_year INTEGER NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS job_vacancies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      location TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      department_target TEXT NOT NULL,
      requirements_json TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'terbuka',
      contact_info TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS alumni_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      graduation_year INTEGER NOT NULL,
      department_name TEXT NOT NULL,
      current_role TEXT NOT NULL,
      organization TEXT NOT NULL,
      testimonial TEXT NOT NULL,
      consent_granted INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS teaching_factory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'produk',
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      price_idr INTEGER NOT NULL DEFAULT 0,
      unit_label TEXT NOT NULL DEFAULT 'paket',
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS student_works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      creator_names TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      year INTEGER NOT NULL,
      summary TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      album TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'foto',
      media_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      taken_at TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      folder TEXT NOT NULL DEFAULT 'umum',
      url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      copyright_info TEXT NOT NULL DEFAULT 'SMK Negeri 3 Probolinggo',
      sha256_hash TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'publik',
      ppid_group TEXT NOT NULL DEFAULT 'berkala',
      file_url TEXT NOT NULL,
      file_size_kb INTEGER NOT NULL DEFAULT 0,
      version TEXT NOT NULL DEFAULT '1.0',
      is_approved INTEGER NOT NULL DEFAULT 1,
      published_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name_id TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_id TEXT NOT NULL,
      requirements_json TEXT NOT NULL,
      sop_summary TEXT NOT NULL,
      estimated_sla TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      tracking_code_hash TEXT NOT NULL,
      service_id INTEGER NOT NULL REFERENCES services(id),
      applicant_name TEXT NOT NULL,
      applicant_email TEXT NOT NULL,
      applicant_phone TEXT NOT NULL,
      applicant_role TEXT NOT NULL,
      details TEXT NOT NULL,
      attachment_url TEXT,
      status TEXT NOT NULL DEFAULT 'diajukan',
      staff_note TEXT NOT NULL DEFAULT '',
      satisfaction_rating INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      tracking_code_hash TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      reporter_contact TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'diterima',
      resolution_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      description TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      respondent_group TEXT NOT NULL,
      rating_informasi INTEGER NOT NULL,
      rating_pelayanan INTEGER NOT NULL,
      rating_fasilitas INTEGER NOT NULL,
      rating_transparansi INTEGER NOT NULL,
      feedback_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      respondent_group TEXT NOT NULL,
      organization TEXT NOT NULL,
      quote TEXT NOT NULL,
      consent_verified INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'baru',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visitor_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_date TEXT NOT NULL,
      path TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 1,
      UNIQUE(visit_date, path)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status_pub ON posts(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
    CREATE INDEX IF NOT EXISTS idx_requests_ticket ON service_requests(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_documents_class ON documents(classification, ppid_group);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  const settingsCols = db.prepare('PRAGMA table_info(school_settings)').all() as Array<{ name: string }>;
  if (!settingsCols.some((c) => c.name === 'logo_url')) {
    db.exec(`ALTER TABLE school_settings ADD COLUMN logo_url TEXT NOT NULL DEFAULT '';`);
  }
}

export function seedDatabase(): void {
  const existingSettings = db.prepare('SELECT id FROM school_settings WHERE id = 1').get();
  if (existingSettings) {
    return;
  }

  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {
    // 1. School Settings (with clearly marked placeholder info where official records can be updated via CMS)
    db.prepare(`
      INSERT INTO school_settings (
        id, school_name, school_type, city, province, slogan_id, slogan_en,
        address, postal_code, phone, email, website_url,
        principal_name, principal_title, principal_photo,
        principal_quote_id, principal_quote_en, principal_message_id, principal_message_en,
        vision_id, vision_en, mission_id, mission_en,
        accreditation, npsn, profile_video_url,
        primary_color, secondary_color,
        social_instagram, social_youtube, social_facebook, social_tiktok,
        map_lat, map_lng, ai_enabled, maintenance_mode, stats_period,
        seo_default_title, seo_default_description, integrations_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'SMK Negeri 3 Probolinggo',
      'Sekolah Menengah Kejuruan Negeri',
      'Kota Probolinggo',
      'Jawa Timur',
      'Unggul dalam Vokasi, Berkarakter Pancasila, Siap Bersaing Global',
      'Excellence in Vocational Education, Grounded in Character, Ready for Global Industry',
      'Jl. Pahlawan No. 26A, Kec. Kanigaran, Kota Probolinggo, Jawa Timur',
      '67211',
      '(0335) 421123 (Kontak Resmi Terkonfigurasi di CMS)',
      'info@smkn3probolinggo.sch.id',
      'https://smkn3probolinggo.sch.id',
      'Drs. H. Ahmad Fauzi, M.Pd. (Data Contoh — Perbarui di CMS)',
      'Kepala SMK Negeri 3 Probolinggo',
      '/src/assets/images/principal_portrait_1795574979746.jpg',
      'Pendidikan vokasi bukan sekadar melatih keterampilan teknis, melainkan membangun kemandirian, etos kerja industri, dan integritas generasi muda Kota Probolinggo.',
      'Vocational education goes beyond technical training—it cultivates independence, industry work ethic, and integrity for Probolinggo’s next generation.',
      'Selamat datang di Portal Digital Terintegrasi SMK Negeri 3 Probolinggo. Platform ini kami hadirkan sebagai wujud komitmen keterbukaan informasi publik, modernisasi tata kelola layanan administrasi sekolah, serta etalase kompetensi peserta didik pada lima konsentrasi keahlian unggulan. Melalui kolaborasi erat bersama dunia usaha dan dunia industri (DUDI), kami terus memastikan kurikulum, Teaching Factory, dan sertifikasi kompetensi selaras dengan kebutuhan industri masa kini.',
      'Welcome to the Integrated Digital Portal of SMK Negeri 3 Probolinggo. This platform embodies our commitment to public information transparency, modernized school administrative services, and showcasing student excellence across five flagship vocational concentrations.',
      'Menjadi SMK rujukan berstandar nasional yang menghasilkan lulusan kompeten, berakhlak mulia, berjiwa wirausaha, dan berwawasan lingkungan (ASRI).',
      'To become a nationally recognized vocational school producing competent, ethical, entrepreneurial, and environmentally conscious graduates.',
      JSON.stringify([
        'Menyelenggarakan pembelajaran berbasis proyek dan Teaching Factory selaras dengan standar dunia usaha dan industri.',
        'Memperkuat pendidikan karakter Profil Pelajar Pancasila serta budaya kerja 5R di seluruh unit praktik.',
        'Mengembangkan layanan tata kelola digital yang transparan, akuntabel, dan mudah diakses masyarakat.',
        'Memperluas kemitraan strategis dengan industri nasional maupun internasional untuk penyaluran kerja dan wirausaha.'
      ]),
      JSON.stringify([
        'Deliver project-based learning and Teaching Factory programs aligned with industry standards.',
        'Strengthen Pancasila character education and 5S workplace discipline across all vocational studios.',
        'Provide transparent, accountable, and accessible digital governance services.',
        'Expand strategic industry partnerships for graduate placement and entrepreneurship.'
      ]),
      'Terakreditasi A (Verifikasi Data Resmi via CMS)',
      '20536291 (Contoh — Sesuaikan di CMS)',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      '#1E3A8A',
      '#9A3412',
      'https://instagram.com/smkn3probolinggo',
      'https://youtube.com/@smkn3probolinggo',
      'https://facebook.com/smkn3probolinggo',
      'https://tiktok.com/@smkn3probolinggo',
      -7.7569,
      113.2156,
      1,
      0,
      'Semester Ganjil 2026/2027 (Data Contoh Development)',
      'SMK Negeri 3 Probolinggo — Portal Digital Sekolah Terintegrasi',
      'Portal resmi SMK Negeri 3 Probolinggo: program keahlian Kuliner, Desain & Produksi Busana, Perhotelan, Tata Kecantikan, dan DKV.',
      JSON.stringify({
        erapor_url: 'https://erapor.kemdikbud.go.id',
        dapodik_url: 'https://dapo.kemdikbud.go.id',
        lms_url: 'https://lms.smkn3probolinggo.sch.id',
        library_url: 'https://perpustakaan.smkn3probolinggo.sch.id',
        bkk_url: '/humas-bkk',
        tracer_url: '/humas-bkk#tracer',
        ppid_url: '/informasi-publik',
        spmb_url: 'https://spmbjatim.net',
        workspace_enabled: true
      }),
      now
    );

    // 2. Homepage Sections (CMS toggleable & reorderable)
    const sections = [
      ['hero', 'Hero Banner Utama', 'Hero Banner', 1, 1],
      ['announcements', 'Pengumuman Penting', 'Important Announcements', 1, 2],
      ['quick_access', 'Akses Cepat Layanan Digital', 'Quick Digital Access', 1, 3],
      ['principal', 'Sambutan Kepala Sekolah', 'Principal Welcome', 1, 4],
      ['profile_summary', 'Profil Singkat Sekolah', 'School Profile Overview', 1, 5],
      ['departments', 'Konsentrasi Keahlian', 'Vocational Concentrations', 1, 6],
      ['news', 'Berita & Publikasi Terbaru', 'Latest News & Publications', 1, 7],
      ['achievements', 'Prestasi Sekolah, Guru & Siswa', 'Achievements', 1, 8],
      ['events', 'Agenda Kegiatan', 'School Calendar & Events', 1, 9],
      ['stats', 'Statistik Sekolah Terverifikasi', 'Verified School Statistics', 1, 10],
      ['tefa', 'Teaching Factory & Karya Siswa', 'Teaching Factory & Student Works', 1, 11],
      ['facilities', 'Sarana dan Prasarana', 'Campus Facilities', 1, 12],
      ['partners', 'Mitra Dunia Usaha & Industri', 'Industry Partners', 1, 13],
      ['testimonials', 'Testimoni Pemangku Kepentingan', 'Stakeholder Testimonials', 1, 14],
      ['gallery', 'Galeri Foto & Video', 'Photo & Video Gallery', 1, 15],
      ['location', 'Lokasi & Kontak Resmi', 'Campus Location & Contact', 1, 16],
    ] as const;
    const insertSection = db.prepare(
      'INSERT INTO homepage_sections (section_key, title_id, title_en, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    for (const s of sections) {
      insertSection.run(s[0], s[1], s[2], s[3], s[4]);
    }

    // 3. Roles & Granular Permissions
    const rolesData = [
      ['super_admin', 'Super Administrator', 'Akses penuh sistem, pengguna, hak akses, backup, dan audit keamanan.', ['*']],
      ['web_admin', 'Administrator Website', 'Mengelola halaman, menu, banner, galeri, media, dan pengaturan tampilan.', ['pages.*', 'menus.*', 'banners.*', 'media.*', 'galleries.*', 'settings.view']],
      ['editor', 'Editor / Redaktur', 'Memeriksa, menyunting, menyetujui, dan menjadwalkan publikasi berita.', ['posts.*', 'categories.*', 'announcements.*', 'events.*']],
      ['writer', 'Penulis Berita / Humas', 'Membuat artikel, mengunggah dokumentasi, dan mengajukan persetujuan.', ['posts.create', 'posts.edit_own', 'posts.submit', 'media.upload', 'announcements.create']],
      ['school_operator', 'Operator Sekolah', 'Memperbarui data kelembagaan, statistik, GTK, dan sarpras.', ['stats.*', 'teachers.*', 'facilities.*', 'settings.profile']],
      ['dept_operator', 'Operator Konsentrasi Keahlian', 'Mengelola profil jurusan, karya siswa, Teaching Factory, dan prestasi jurusan.', ['departments.edit_own', 'tefa.*', 'student_works.*', 'achievements.*']],
      ['bkk_officer', 'Petugas BKK', 'Mengelola lowongan pekerjaan, alumni, tracer study, dan mitra industri.', ['jobs.*', 'alumni.*', 'partners.*']],
      ['service_officer', 'Petugas Layanan Administrasi', 'Memproses permohonan layanan administrasi digital dan laporan layanan.', ['services.*', 'service_requests.*', 'complaints.*']],
      ['ppid_officer', 'Petugas Informasi Publik', 'Mengelola daftar informasi publik, dokumen PPID, dan SOP pelayanan.', ['public_info.*', 'documents.*', 'service_requests.view']],
      ['principal', 'Kepala Sekolah / Pimpinan', 'Memantau dashboard eksekutif, laporan evaluasi, dan persetujuan akhir.', ['dashboard.view', 'reports.export', 'posts.approve', 'surveys.view', 'audit.view']],
    ] as const;

    const insertRole = db.prepare(
      'INSERT INTO roles (slug, name, description, permissions_json, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const r of rolesData) {
      insertRole.run(r[0], r[1], r[2], JSON.stringify(r[3]), now);
    }

    // 4. Departments (Exact 5 Konsentrasi Keahlian from prompt)
    const departmentsData = [
      {
        slug: 'kuliner',
        code: 'KUL',
        name_id: 'Kuliner',
        name_en: 'Culinary Arts',
        short_desc_id: 'Menguasai seni pengolahan hidangan Nusantara, kontinental, pastry & bakery, hingga tata hidang berstandar perhotelan.',
        short_desc_en: 'Mastering Indonesian and continental cuisine, pastry & bakery, and hospitality-grade food service.',
        profile_id: 'Konsentrasi Keahlian Kuliner mempersiapkan peserta didik menjadi tenaga profesional di bidang jasa boga, tata boga hotel berbintang, restoran, dan wirausaha kuliner modern melalui praktik intensif di dapur standar industri.',
        profile_en: 'The Culinary Arts program prepares students for professional careers in fine dining, hotel kitchens, patisserie, and culinary entrepreneurship.',
        vision_id: 'Mencetak chef muda yang terampil, higienis, kreatif mengolah pangan lokal, dan siap bersaing di industri perhotelan.',
        vision_en: 'Producing skilled, hygienic, and creative young chefs ready for hospitality industry careers.',
        competencies: ['Pengolahan Makanan Nusantara & Kontinental', 'Pastry, Bakery & Cake Decoration', 'Keamanan Pangan (HACCP) & Sanitasi Dapur', 'Tata Hidang & Manajemen Jasa Boga (Catering)'],
        curriculum: ['Dasar-Dasar Kuliner (Fase E)', 'Produk Pastry & Bakery', 'Pengolahan & Penyajian Makanan', 'Proyek Kreatif & Kewirausahaan Teaching Factory'],
        career: ['Commis Chef / Cook di Hotel & Restoran', 'Pastry & Bakery Specialist', 'Food & Beverage Supervisor', 'Wirausaha Katering & Produk Pangan'],
        facilities: ['Dapur Praktik Kuliner Standar Industri', 'Laboratorium Pastry & Bakery', 'Ruang Restoran Praktik (Table Manner)', 'Unit Produksi Teaching Factory Boga'],
        head_name: 'Ibu Sri Rahayu, S.Pd. (Placeholder)',
        head_contact: 'kuliner@smkn3probolinggo.sch.id',
        image_url: '/src/assets/images/dept_kuliner_1795574977139.jpg',
        quota: 108,
        sort: 1,
      },
      {
        slug: 'desain-dan-produksi-busana',
        code: 'DPB',
        name_id: 'Desain dan Produksi Busana',
        name_en: 'Fashion Design & Garment Production',
        short_desc_id: 'Mengembangkan desain fesyen kreatif, pembuatan pola digital & manual, batik kontemporer, hingga produksi garmen presisi.',
        short_desc_en: 'Developing fashion illustration, manual & digital pattern making, contemporary batik, and garment manufacturing.',
        profile_id: 'Konsentrasi Keahlian Desain dan Produksi Busana membekali peserta didik dengan keahlian merancang busana adibusana maupun siap pakai (ready-to-wear), teknik menjahit industri, serta manajemen butik.',
        profile_en: 'Fashion Design & Garment Production trains students in couture and ready-to-wear design, pattern engineering, and boutique management.',
        vision_id: 'Menjadi pusat pengembangan talenta fesyen berbasis kearifan lokal Jawa Timur dan teknologi garmen modern.',
        vision_en: 'Becoming a hub for fashion talent combining East Javanese textile heritage with modern garment technology.',
        competencies: ['Ilustrasi Mode & Desain Digital', 'Pembuatan Pola Konstruksi & Draping', 'Teknologi Menjahit Busana Custom & Industri', 'Finishing, Bordir & Manajemen Usaha Butik'],
        curriculum: ['Dasar Desain & Tekstil', 'Pembuatan Pola & Pecah Model', 'Pembuatan Busana Industri & Adibusana', 'Manajemen Produksi Teaching Factory Butik'],
        career: ['Fashion Designer / Pattern Maker', 'Quality Control Industri Garmen', 'Visual Merchandiser', 'Pemilik Butik & Lini Busana Mandiri'],
        facilities: ['Atelier Desain & Pembuatan Pola', 'Bengkel Jahit Mesin High-Speed Industri', 'Studio Draping & Fitting', 'Galeri Pamer & Butik Teaching Factory'],
        head_name: 'Ibu Endang Sulistyowati, S.Pd. (Placeholder)',
        head_contact: 'busana@smkn3probolinggo.sch.id',
        image_url: '/src/assets/images/dept_busana_1795574977336.jpg',
        quota: 72,
        sort: 2,
      },
      {
        slug: 'perhotelan',
        code: 'PHT',
        name_id: 'Perhotelan',
        name_en: 'Hospitality & Hotel Management',
        short_desc_id: 'Menyiapkan profesional layanan front office, housekeeping, layanan kamar, serta komunikasi hospitality dwibahasa.',
        short_desc_en: 'Preparing hospitality professionals in front office operations, housekeeping, guest relations, and bilingual hotel service.',
        profile_id: 'Konsentrasi Keahlian Perhotelan mengintegrasikan pembelajaran praktik hotel sesungguhnya melalui Edotel sekolah, mencakup reservasi, resepsionis, tata graha, laundry, dan layanan prima berstandar ASEAN.',
        profile_en: 'Hospitality integrates hands-on training through our campus training hotel covering reservations, front desk, housekeeping, and guest service.',
        vision_id: 'Melahirkan insan pariwisata dan perhotelan yang ramah, komunikatif, sigap, dan profesional di tingkat nasional maupun global.',
        vision_en: 'Graduating courteous, communicative, and industry-ready hospitality professionals.',
        competencies: ['Operasional Front Office & Reservasi Digital', 'Tata Graha (Housekeeping) & Public Area', 'Layanan Laundry & Linen Management', 'Komunikasi Pariwisata Bahasa Inggris & Jepang'],
        curriculum: ['Industri Pariwisata & Keramahtamahan', 'Front Office & Sistem PMS Hotel', 'Housekeeping & Laundry Service', 'Praktik Kerja Nyata di Edotel & Hotel Mitra'],
        career: ['Front Desk Agent / Guest Relations Officer', 'Housekeeping Supervisor', 'Reservation & Concierge Staff', 'Entrepreneur Akomodasi & Jasa Wisata'],
        facilities: ['Edotel (Hotel Praktik Kampus)', 'Mock-up Front Office & Sistem PMS', 'Laboratorium Housekeeping & Suite Room', 'Unit Laundry Standar Hotel'],
        head_name: 'Bapak Hendra Wijaya, S.Par. (Placeholder)',
        head_contact: 'perhotelan@smkn3probolinggo.sch.id',
        image_url: '/src/assets/images/dept_perhotelan_1795574977721.jpg',
        quota: 108,
        sort: 3,
      },
      {
        slug: 'tata-kecantikan-kulit-dan-rambut',
        code: 'TKKR',
        name_id: 'Tata Kecantikan Kulit dan Rambut',
        name_en: 'Beauty Therapy & Hairdressing',
        short_desc_id: 'Mempelajari perawatan kulit estetika, tata rias pengantin & karakter, penataan rambut modern, dan manajemen salon.',
        short_desc_en: 'Covering aesthetic skincare therapy, bridal and editorial makeup, modern hairstyling, and salon management.',
        profile_id: 'Konsentrasi Keahlian Tata Kecantikan Kulit dan Rambut mendidik peserta didik menguasai teknik perawatan wajah, spa, pemangkasan dan pewarnaan rambut, tata rias profesional, serta pelayanan salon higienis.',
        profile_en: 'Beauty Therapy & Hairdressing trains students in clinical skincare, spa wellness, hair artistry, professional makeup, and hygienic salon operations.',
        vision_id: 'Mewujudkan tenaga kecantikan profesional yang menguasai estetika modern dan tradisi tata rias Nusantara.',
        vision_en: 'Developing beauty professionals fluent in modern aesthetics and traditional Indonesian makeup artistry.',
        competencies: ['Perawatan Wajah Manual & Teknologi Estetika', 'Pemangkasan, Pewarnaan & Penataan Rambut', 'Tata Rias Wajah Pengantin & Panggung', 'Perawatan Badan (Spa) & Konsultasi Klien'],
        curriculum: ['Anatomi Fisiologi Kulit & Rambut', 'Perawatan Kulit Wajah & Badan', 'Penataan Rambut & Tata Rias Artistik', 'Pengelolaan Salon Teaching Factory'],
        career: ['Beautician & Aesthetic Therapist', 'Professional Hair Stylist', 'Make-Up Artist (MUA) Komersial & Pengantin', 'Pemilik Salon & Klinik Kecantikan'],
        facilities: ['Salon Praktik Kecantikan Terpadu', 'Ruang Spa & Perawatan Tubuh', 'Studio Tata Rias & Pencahayaan Profesional', 'Teaching Factory Griya Cantik'],
        head_name: 'Ibu Ratna Kusumawati, S.Pd. (Placeholder)',
        head_contact: 'kecantikan@smkn3probolinggo.sch.id',
        image_url: '/src/assets/images/dept_kecantikan_1795574977844.jpg',
        quota: 72,
        sort: 4,
      },
      {
        slug: 'desain-komunikasi-visual',
        code: 'DKV',
        name_id: 'Desain Komunikasi Visual',
        name_en: 'Visual Communication Design',
        short_desc_id: 'Mengasah keahlian desain grafis, identitas merek, fotografi komersial, videografi, ilustrasi digital, dan UI/UX.',
        short_desc_en: 'Sharpening skills in graphic design, brand identity, commercial photography, videography, digital illustration, and UI/UX.',
        profile_id: 'Konsentrasi Keahlian Desain Komunikasi Visual memadukan kepekaan estetika dengan penguasaan perangkat lunak industri kreatif untuk menghasilkan karya branding, publikasi cetak, konten multimedia, dan desain antarmuka digital.',
        profile_en: 'Visual Communication Design blends aesthetic craft with creative industry software for branding, print, multimedia, and UI/UX design.',
        vision_id: 'Menjadi kawah candradimuka desainer visual muda yang adaptif terhadap teknologi media digital dan industri kreatif.',
        vision_en: 'Nurturing adaptive young visual designers for the modern creative and digital media industry.',
        competencies: ['Tipografi, Tata Letak & Identitas Merek', 'Ilustrasi Digital & Pengolahan Citra', 'Fotografi Produk & Produksi Video', 'Desain Antarmuka Web (UI/UX) & Kemasan'],
        curriculum: ['Sketsa, Gambar Bentuk & Warna', 'Komputer Grafis Vektor & Bitmap', 'Fotografi, Videografi & Audio Visual', 'Proyek Studio Kreatif & Portofolio Klien'],
        career: ['Graphic & Brand Designer', 'Photographer / Video Editor', 'UI/UX & Social Media Creative', 'Studio Desain & Percetakan Digital'],
        facilities: ['Laboratorium Komputer Grafis & Rendering', 'Studio Fotografi & Pencahayaan', 'Ruang Produksi Audio Visual', 'Unit Jasa Desain & Cetak Teaching Factory'],
        head_name: 'Bapak Dimas Prasetyo, S.Ds. (Placeholder)',
        head_contact: 'dkv@smkn3probolinggo.sch.id',
        image_url: '/src/assets/images/dept_dkv_1795574978480.jpg',
        quota: 72,
        sort: 5,
      },
    ];

    const insertDept = db.prepare(`
      INSERT INTO departments (
        slug, code, name_id, name_en, short_desc_id, short_desc_en,
        profile_id, profile_en, vision_id, vision_en,
        competencies_json, curriculum_json, career_prospects_json, facilities_json,
        head_name, head_contact, image_url, quota_spmb, is_published, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    for (const d of departmentsData) {
      insertDept.run(
        d.slug, d.code, d.name_id, d.name_en, d.short_desc_id, d.short_desc_en,
        d.profile_id, d.profile_en, d.vision_id, d.vision_en,
        JSON.stringify(d.competencies), JSON.stringify(d.curriculum),
        JSON.stringify(d.career), JSON.stringify(d.facilities),
        d.head_name, d.head_contact, d.image_url, d.quota, d.sort
      );
    }

    // 5. Menus
    const menuSeeds = [
      ['Beranda', 'Home', '/', 'main', 0, 1],
      ['Profil', 'Profile', '/profil', 'profil', 0, 2],
      ['Akademik', 'Academics', '/akademik', 'akademik', 0, 3],
      ['Konsentrasi Keahlian', 'Programs', '/konsentrasi-keahlian', 'keahlian', 0, 4],
      ['Kesiswaan & SPMB', 'Student Affairs', '/kesiswaan', 'kesiswaan', 0, 5],
      ['Humas & BKK', 'Industry & BKK', '/humas-bkk', 'humas', 0, 6],
      ['Sarpras', 'Facilities', '/sarana-prasarana', 'sarpras', 0, 7],
      ['Berita', 'News', '/berita', 'berita', 0, 8],
      ['Penjaminan Mutu', 'Quality', '/penjaminan-mutu', 'mutu', 0, 9],
      ['Layanan Digital', 'Services', '/layanan-digital', 'layanan', 0, 10],
      ['Informasi Publik', 'Public Info', '/informasi-publik', 'ppid', 0, 11],
      ['Kontak', 'Contact', '/kontak', 'kontak', 0, 12],
    ] as const;
    const insertMenu = db.prepare(
      'INSERT INTO menus (parent_id, label_id, label_en, href, group_name, is_external, is_published, sort_order) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)'
    );
    for (const m of menuSeeds) {
      insertMenu.run(m[0], m[1], m[2], m[3], m[4], m[5]);
    }

    // 6. Banners
    const insertBanner = db.prepare(`
      INSERT INTO banners (title_id, title_en, subtitle_id, subtitle_en, cta_label_id, cta_label_en, cta_href, image_url, focal_point, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'center', ?, 1)
    `);
    insertBanner.run(
      'Pendidikan Vokasi Terintegrasi untuk Generasi Unggul Kota Probolinggo',
      'Integrated Vocational Education for Probolinggo’s Next Generation',
      'Menghadirkan lima konsentrasi keahlian terakreditasi, Teaching Factory berstandar industri, dan layanan administrasi digital transparan.',
      'Offering five accredited vocational concentrations, industry-standard Teaching Factory studios, and transparent digital administration.',
      'Jelajahi Konsentrasi Keahlian',
      'Explore Programs',
      '/konsentrasi-keahlian',
      '/src/assets/images/hero_campus_smkn3_1795574976594.jpg',
      1
    );
    insertBanner.run(
      'Pusat Layanan Informasi Publik & Administrasi Digital Sekolah',
      'Public Information Transparency & Digital School Services',
      'Ajukan surat keterangan, legalisasi ijazah, informasi publik, serta lacak status permohonan secara daring dengan tiket terverifikasi.',
      'Request academic certificates, diploma legalization, public documents, and track ticket status online.',
      'Akses Layanan Digital',
      'Access Digital Services',
      '/layanan-digital',
      '/src/assets/images/dept_perhotelan_1795574977721.jpg',
      2
    );

    // 7. Announcements
    const insertAnn = db.prepare(
      'INSERT INTO announcements (title_id, title_en, content_id, content_en, category, priority, valid_until, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
    );
    insertAnn.run(
      'Informasi Persiapan SPMB Tahun Ajaran 2026/2027 (Contoh Data)',
      'New Student Admission (SPMB) 2026/2027 Preparation',
      'Calon peserta didik dapat mempelajari daya tampung, persyaratan, serta alur pendaftaran resmi melalui portal SPMB Pemerintah Provinsi Jawa Timur dan halaman informasi SPMB sekolah.',
      'Prospective students can review program capacities, requirements, and official East Java provincial admission guidelines on our SPMB page.',
      'spmb',
      'tinggi',
      '2027-07-31',
      now
    );
    insertAnn.run(
      'Jadwal Uji Kompetensi Keahlian (UKK) & Sertifikasi LSP P1',
      'Vocational Competency Assessment (UKK) Schedule',
      'Pelaksanaan Uji Kompetensi Keahlian bagi peserta didik kelas XII seluruh konsentrasi keahlian dijadwalkan bertahap bersama penguji eksternal dari mitra industri.',
      'Competency assessments for Grade XII students across all five concentrations will be held in stages with external industry assessors.',
      'akademik',
      'normal',
      '2027-04-30',
      now
    );

    // 8. Categories & Posts
    const catNames = [
      'Kegiatan Sekolah', 'Akademik', 'Kesiswaan', 'Humas', 'Prestasi',
      'Dunia Industri', 'Konsentrasi Keahlian', 'Teaching Factory',
      'Penjaminan Mutu', 'PKKS', 'Pengembangan SDM', 'Alumni',
      'Artikel Pendidikan', 'Pengumuman'
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
    for (const c of catNames) {
      const slug = c.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insertCat.run(c, slug, `Publikasi resmi kategori ${c} SMK Negeri 3 Probolinggo.`);
    }

    const insertPost = db.prepare(`
      INSERT INTO posts (
        title, slug, summary, content, featured_image, image_alt,
        category_id, tags_json, author_name, editor_name, status,
        is_featured, event_date, published_at, seo_title, seo_description, views_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPost.run(
      'Siswa Kuliner SMKN 3 Probolinggo Raih Juara LKS Tingkat Provinsi (Data Contoh)',
      'siswa-kuliner-smkn3-raih-juara-lks-provinsi',
      'Tim Kuliner SMK Negeri 3 Probolinggo menampilkan inovasi hidangan berbahan pangan lokal Probolinggo dalam ajang Lomba Kompetensi Siswa tingkat Jawa Timur.',
      'PROBOLINGGO — Tim peserta didik Konsentrasi Keahlian Kuliner SMK Negeri 3 Probolinggo berhasil menorehkan prestasi membanggakan pada ajang Lomba Kompetensi Siswa (LKS) bidang Culinary Arts.\n\nDalam kompetisi yang berlangsung di Surabaya selama tiga hari tersebut, peserta ditantang menyusun menu tiga hidangan (appetizer, main course, dan dessert) dengan standar higienitas dapur internasional serta efisiensi pengelolaan bahan.\n\nKepala Konsentrasi Keahlian Kuliner menyampaikan bahwa persiapan dilakukan secara intensif di dapur Teaching Factory sekolah bersama praktisi chef dari hotel mitra di Jawa Timur. Capaian ini menegaskan kesiapan lulusan vokasi untuk bersaing di industri perhotelan dan tata boga nasional.',
      '/src/assets/images/dept_kuliner_1795574977139.jpg',
      'Siswa Kuliner SMK Negeri 3 Probolinggo sedang melakukan plating hidangan di dapur praktik',
      5,
      JSON.stringify(['LKS', 'Kuliner', 'Prestasi Siswa']),
      'Tim Humas Sekolah',
      'Redaktur Portal',
      1,
      '2026-11-10',
      '2026-11-12T08:00:00Z',
      'Siswa Kuliner SMKN 3 Probolinggo Juara LKS Provinsi',
      'Liputan prestasi tim Kuliner SMK Negeri 3 Probolinggo pada Lomba Kompetensi Siswa.',
      342,
      now,
      now
    );

    insertPost.run(
      'Gelar Karya Busana Batik Kontemporer dan Pameran Desain DKV (Data Contoh)',
      'gelar-karya-busana-batik-dan-pameran-dkv',
      'Kolaborasi lintas jurusan Desain dan Produksi Busana bersama Desain Komunikasi Visual menghadirkan katalog mode dan fotografi komersial.',
      'PROBOLINGGO — Aula utama SMK Negeri 3 Probolinggo dipadati perwakilan mitra industri tekstil, studio kreatif, dan orang tua murid dalam acara Gelar Karya Vokasi tahunan.\n\nSebanyak 24 koleksi busana siap pakai hasil rancangan peserta didik Desain dan Produksi Busana ditampilkan lengkap dengan materi branding, lookbook cetak, serta video dokumenter yang diproduksi oleh siswa Desain Komunikasi Visual.\n\nMelalui model pembelajaran berbasis proyek kolaboratif (Teaching Factory lintas keahlian), peserta didik tidak hanya mengasah keterampilan teknis masing-masing, tetapi juga memahami rantai kerja industri kreatif dari hulu hingga hilir.',
      '/src/assets/images/dept_busana_1795574977336.jpg',
      'Suasana studio produksi busana batik dan pola desain di SMKN 3 Probolinggo',
      8,
      JSON.stringify(['Teaching Factory', 'Busana', 'DKV']),
      'Tim Humas Sekolah',
      'Redaktur Portal',
      1,
      '2026-11-02',
      '2026-11-05T09:30:00Z',
      'Gelar Karya Busana Batik dan Pameran DKV SMKN 3 Probolinggo',
      'Kolaborasi Teaching Factory antara jurusan Desain & Produksi Busana dan DKV.',
      218,
      now,
      now
    );

    insertPost.run(
      'Penandatanganan Kerja Sama Praktik Kerja Lapangan dengan Jaringan Hotel Jawa Timur (Data Contoh)',
      'kerja-sama-pkl-jaringan-hotel-jawa-timur',
      'Memperluas peluang magang industri dan rekrutmen lulusan untuk jurusan Perhotelan, Kuliner, dan Tata Kecantikan.',
      'PROBOLINGGO — SMK Negeri 3 Probolinggo kembali memperluas jejaring kemitraan Dunia Usaha dan Dunia Industri (DUDI) melalui penandatanganan nota kesepahaman program Praktik Kerja Lapangan (PKL), guru tamu industri, dan penyaluran kerja BKK.\n\nProgram kemitraan ini mencakup penyelarasan kurikulum berbasis kompetensi kerja terkini di bidang front office, housekeeping, food & beverage, serta layanan spa dan estetika. Sebanyak 120 peserta didik kelas XI dan XII dijadwalkan mengikuti penempatan PKL terstruktur dengan pendampingan supervisor industri.',
      '/src/assets/images/dept_perhotelan_1795574977721.jpg',
      'Area resepsionis Edotel praktik Perhotelan SMK Negeri 3 Probolinggo',
      6,
      JSON.stringify(['PKL', 'Mitra Industri', 'Perhotelan', 'BKK']),
      'Unit Humas & BKK',
      'Redaktur Portal',
      0,
      '2026-10-24',
      '2026-10-26T10:00:00Z',
      'Kerja Sama PKL dan BKK SMKN 3 Probolinggo dengan Industri Perhotelan',
      'Penandatanganan kerja sama PKL, guru tamu, dan rekrutmen BKK bersama mitra hotel.',
      189,
      now,
      now
    );

    insertPost.run(
      'Workshop Estetika Kulit & Tata Rias Pengantin Bersama Praktisi Industri (Data Contoh)',
      'workshop-estetika-tata-rias-bersama-praktisi',
      'Peserta didik Tata Kecantikan Kulit dan Rambut memperoleh pendalaman teknik perawatan kulit higienis dan tata rias komersial.',
      'PROBOLINGGO — Konsentrasi Keahlian Tata Kecantikan Kulit dan Rambut menyelenggarakan program Guru Tamu Industri di laboratorium Griya Cantik SMK Negeri 3 Probolinggo.\n\nMateri meliputi standar konsultasi klien, sterilisasi peralatan salon, pemetaan jenis kulit, serta teknik tata rias tahan lama untuk kebutuhan fotografi dan upacara adat. Kegiatan ditutup dengan evaluasi praktik langsung yang dinilai oleh instruktur tamu.',
      '/src/assets/images/dept_kecantikan_1795574977844.jpg',
      'Studio praktik Tata Kecantikan Kulit dan Rambut SMK Negeri 3 Probolinggo',
      7,
      JSON.stringify(['Tata Kecantikan', 'Guru Tamu', 'SDM']),
      'Operator Tata Kecantikan',
      'Redaktur Portal',
      0,
      '2026-10-15',
      '2026-10-16T07:45:00Z',
      'Workshop Guru Tamu Tata Kecantikan SMKN 3 Probolinggo',
      'Pendalaman kompetensi tata kecantikan kulit dan rambut bersama praktisi industri.',
      154,
      now,
      now
    );

    // 9. Achievements
    const insertAch = db.prepare(`
      INSERT INTO achievements (title, recipient_name, recipient_type, level, year, organizer, department_id, image_url, description, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertAch.run('Juara 1 LKS Culinary Arts Provinsi Jawa Timur (Contoh)', 'Nadia Putri & Tim Kuliner', 'siswa', 'Provinsi', 2026, 'Dinas Pendidikan Prov. Jawa Timur', 1, '/src/assets/images/dept_kuliner_1795574977139.jpg', 'Pengolahan menu 3-course Nusantara kontemporer dengan skor sanitasi tertinggi.');
    insertAch.run('Finalis Nasional LKS Fashion Technology (Contoh)', 'Siti Aminah (XII DPB)', 'siswa', 'Nasional', 2026, 'Kemendikbudristek', 2, '/src/assets/images/dept_busana_1795574977336.jpg', 'Perancangan dan penjahitan busana kerja modern berbasis wastra lokal.');
    insertAch.run('Guru Berprestasi Inovasi Media Pembelajaran Vokasi (Contoh)', 'Drs. Bambang Santoso, M.Pd.', 'guru', 'Provinsi', 2025, 'Dinas Pendidikan Jawa Timur', 5, '/src/assets/images/dept_dkv_1795574978480.jpg', 'Pengembangan modul portofolio digital interaktif untuk kelas DKV.');
    insertAch.run('Sekolah Berbudaya Lingkungan ASRI & Teaching Factory Unggulan (Contoh)', 'SMK Negeri 3 Probolinggo', 'lembaga', 'Kota/Kabupaten', 2026, 'Pemerintah Kota Probolinggo', null, '/src/assets/images/hero_campus_smkn3_1795574976594.jpg', 'Penghargaan tata kelola lingkungan hijau kampus dan inovasi unit produksi siswa.');

    // 10. Events
    const insertEvent = db.prepare(
      'INSERT INTO events (title, description, location, start_date, end_date, time_range, category, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertEvent.run('Rapat Pleno Penyelarasan Kurikulum & Mitra Industri', 'Evaluasi capaian pembelajaran berbasis Teaching Factory semester berjalan bersama DUDI.', 'Aula Utama SMKN 3 Probolinggo', '2026-12-04', '2026-12-04', '08:30 - 13:00 WIB', 'Industri & Akademik');
    insertEvent.run('Pameran Karya Teaching Factory & Job Fair BKK', 'Bursa kerja khusus terbuka bagi alumni SMK dan pameran produk 5 konsentrasi keahlian.', 'Halaman Kampus & Edotel', '2026-12-12', '2026-12-13', '08:00 - 15:30 WIB', 'BKK & Teaching Factory');
    insertEvent.run('Sosialisasi Jalur SPMB & Kunjungan SMP Se-Kota Probolinggo', 'Tur laboratorium praktik dan pengenalan konsentrasi keahlian bagi siswa kelas IX.', 'Kampus SMKN 3 Probolinggo', '2027-01-18', '2027-01-20', '08:00 - 12:00 WIB', 'SPMB');

    // 11. School Stats (clearly marked placeholder period, editable in CMS)
    const statsData = [
      ['students', 'Peserta Didik Aktif', 'Active Students', 1248, 'siswa', 'Semester Ganjil 2026/2027 (Placeholder)', 1],
      ['teachers', 'Guru Pendidik', 'Faculty Teachers', 74, 'orang', 'Semester Ganjil 2026/2027 (Placeholder)', 2],
      ['staff', 'Tenaga Kependidikan', 'Administrative Staff', 26, 'orang', 'Semester Ganjil 2026/2027 (Placeholder)', 3],
      ['classes', 'Rombongan Belajar', 'Learning Groups', 36, 'rombel', 'Semester Ganjil 2026/2027 (Placeholder)', 4],
      ['departments', 'Konsentrasi Keahlian', 'Vocational Programs', 5, 'jurusan', 'Tahun Ajaran 2026/2027', 5],
      ['partners', 'Mitra Dunia Industri', 'Industry Partners', 48, 'perusahaan', 'Data Terverifikasi BKK (Placeholder)', 6],
      ['alumni', 'Alumni Tersalurkan & Wirausaha', 'Placed & Entrepreneur Alumni', 3420, 'alumni', 'Rekap Tracer Study (Placeholder)', 7],
      ['achievements', 'Prestasi Tercatat (3 Tahun)', 'Recorded Achievements', 64, 'penghargaan', '2024–2026 (Placeholder)', 8],
    ] as const;
    const insertStat = db.prepare(
      'INSERT INTO school_stats (stat_key, label_id, label_en, value, unit, period, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const st of statsData) {
      insertStat.run(st[0], st[1], st[2], st[3], st[4], st[5], st[6]);
    }

    // 12. Teachers & Staff
    const insertTeacher = db.prepare(
      'INSERT INTO teachers_staff (name, nip_or_code, role_type, position, department_id, education, photo_url, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertTeacher.run('Drs. H. Ahmad Fauzi, M.Pd.', 'CONTOH-001', 'pimpinan', 'Kepala Sekolah', null, 'S2 Manajemen Pendidikan', '/src/assets/images/principal_portrait_1795574979746.jpg');
    insertTeacher.run('Ibu Sri Rahayu, S.Pd.', 'CONTOH-002', 'guru', 'Kepala Konsentrasi Keahlian Kuliner', 1, 'S1 Pendidikan Tata Boga', '/src/assets/images/dept_kuliner_1795574977139.jpg');
    insertTeacher.run('Ibu Endang Sulistyowati, S.Pd.', 'CONTOH-003', 'guru', 'Kepala Konsentrasi Keahlian Busana', 2, 'S1 Pendidikan Tata Busana', '/src/assets/images/dept_busana_1795574977336.jpg');
    insertTeacher.run('Bapak Hendra Wijaya, S.Par.', 'CONTOH-004', 'guru', 'Kepala Konsentrasi Keahlian Perhotelan', 3, 'S1 Pariwisata & Perhotelan', '/src/assets/images/dept_perhotelan_1795574977721.jpg');
    insertTeacher.run('Ibu Ratna Kusumawati, S.Pd.', 'CONTOH-005', 'guru', 'Kepala Konsentrasi Keahlian Tata Kecantikan', 4, 'S1 Pendidikan Tata Rias', '/src/assets/images/dept_kecantikan_1795574977844.jpg');
    insertTeacher.run('Bapak Dimas Prasetyo, S.Ds.', 'CONTOH-006', 'guru', 'Kepala Konsentrasi Keahlian DKV', 5, 'S1 Desain Komunikasi Visual', '/src/assets/images/dept_dkv_1795574978480.jpg');
    insertTeacher.run('Ibu Kartika Sari, S.E.', 'CONTOH-007', 'tendik', 'Kepala Tata Usaha & Layanan Administrasi', null, 'S1 Ekonomi Manajemen', '');

    // 13. Extracurriculars
    const insertExtra = db.prepare(
      'INSERT INTO extracurriculars (name, category, coach_name, schedule, description, is_published) VALUES (?, ?, ?, ?, ?, 1)'
    );
    insertExtra.run('Pramuka Penegak', 'Kepemimpinan', 'Pembina Gugus Depan', 'Jumat, 14:30 - 16:30 WIB', 'Pembinaan karakter, kepramukaan, dan kemandirian peserta didik.');
    insertExtra.run('English & Hospitality Club', 'Bahasa & Profesi', 'Tim Bahasa Inggris', 'Selasa, 15:00 - 16:30 WIB', 'Pelatihan debat, public speaking, dan pelayanan wisata dwibahasa.');
    insertExtra.run('Karya Ilmiah Remaja & Kewirausahaan', 'Akademik & Inovasi', 'Tim PKWU', 'Rabu, 15:00 - 16:30 WIB', 'Pengembangan produk kreatif dan riset pangan/tekstil terapan.');
    insertExtra.run('Palang Merah Remaja (PMR)', 'Sosial & Kesehatan', 'Pembina PMR', 'Sabtu, 08:30 - 11:00 WIB', 'Pelatihan pertolongan pertama, kesiapsiagaan bencana, dan aksi sosial.');

    // 14. Facilities
    const insertFacility = db.prepare(
      'INSERT INTO facilities (name, category, capacity, condition, description, image_url, is_published) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    insertFacility.run('Dapur Praktik Kuliner & Pastry Industri', 'bengkel', '36 siswa / sesi', 'Sangat Baik', 'Dilengkapi konveksi oven, kompor komersial, chiller, dan stasiun kerja stainless steel.', '/src/assets/images/dept_kuliner_1795574977139.jpg');
    insertFacility.run('Edotel (Hotel Praktik Perhotelan)', 'produksi', '12 kamar praktik + lobi', 'Sangat Baik', 'Unit pelatihan resepsionis, housekeeping, dan layanan kamar terbuka untuk tamu institusi.', '/src/assets/images/dept_perhotelan_1795574977721.jpg');
    insertFacility.run('Atelier Pola & Bengkel Garmen Modern', 'bengkel', '36 siswa / sesi', 'Sangat Baik', 'Tersedia mesin jahit high-speed, obras industri, meja potong pola, dan studio draping.', '/src/assets/images/dept_busana_1795574977336.jpg');
    insertFacility.run('Laboratorium Komputer Desain & Studio Foto DKV', 'laboratorium', '36 workstation', 'Sangat Baik', 'Komputer grafis berlayar kalibrasi warna, pen tablet, dan studio pencahayaan komersial.', '/src/assets/images/dept_dkv_1795574978480.jpg');
    insertFacility.run('Perpustakaan Digital & Ruang Baca Terpadu', 'perpustakaan', '60 pembaca', 'Sangat Baik', 'Koleksi buku referensi vokasi, literasi umum, dan terminal akses katalog digital.', '/src/assets/images/principal_portrait_1795574979746.jpg');
    insertFacility.run('Griya Cantik & Studio Estetika', 'laboratorium', '30 siswa / sesi', 'Sangat Baik', 'Peralatan facial modern, kursi tata rambut ergonomis, dan ruang spa higienis.', '/src/assets/images/dept_kecantikan_1795574977844.jpg');

    // 15. Industry Partners
    const insertPartner = db.prepare(
      'INSERT INTO industry_partners (name, sector, cooperation_field, description, city, logo_text, department_id, since_year, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertPartner.run('Hotel Santika & Jaringan Perhotelan Jatim (Contoh)', 'Perhotelan & Pariwisata', 'PKL, Guru Tamu & Rekrutmen BKK', 'Penyelarasan kurikulum operasional hotel, uji kompetensi, dan penyerapan alumni.', 'Surabaya & Probolinggo', 'SANTIKA JATIM', 3, 2021);
    insertPartner.run('Bromo Heritage Bakery & Culinary Group (Contoh)', 'Kuliner & Food Service', 'Teaching Factory & Magang Chef', 'Pelatihan pastry komersial, standar HACCP, dan penempatan lulusan dapur.', 'Kota Probolinggo', 'BROMO CULINARY', 1, 2022);
    insertPartner.run('Batik Prabulinggih Atelier & Garment (Contoh)', 'Tekstil & Fesyen', 'Produksi Busana & Desain Wastra', 'Pengembangan motif batik kontemporer dan praktik produksi garmen ekspor.', 'Probolinggo', 'PRABULINGGIH', 2, 2020);
    insertPartner.run('Aesthetic Wellness Clinic & Salon Group (Contoh)', 'Kecantikan & Estetika', 'Sertifikasi Terapis & Penempatan Kerja', 'Pelatihan perawatan kulit berbasis alat dan standar layanan klinik kecantikan.', 'Malang & Surabaya', 'AESTHETIC PRO', 4, 2023);
    insertPartner.run('Karya Visual Studio & Media Kreatif (Contoh)', 'Industri Kreatif & Digital', 'Magang DKV & Proyek Branding UMKM', 'Kolaborasi proyek desain kemasan UMKM dan fotografi produk komersial.', 'Surabaya', 'KARYA VISUAL', 5, 2022);

    // 16. Job Vacancies (BKK)
    const insertJob = db.prepare(
      'INSERT INTO job_vacancies (title, company_name, location, employment_type, department_target, requirements_json, deadline, status, contact_info, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertJob.run('Commis Chef & Pastry Assistant (Contoh)', 'Bromo Heritage Hotel & Resort', 'Probolinggo', 'Penuh Waktu', 'Kuliner', JSON.stringify(['Lulusan SMK Konsentrasi Kuliner', 'Memiliki sertifikat kompetensi LSP', 'Mampu bekerja dalam tim dapur hotel']), '2027-02-28', 'terbuka', 'BKK SMKN 3 Probolinggo (bkk@smkn3probolinggo.sch.id)');
    insertJob.run('Front Desk Agent & Guest Relations (Contoh)', 'Jaringan Hotel Bintang 4 Jawa Timur', 'Surabaya', 'Penuh Waktu', 'Perhotelan', JSON.stringify(['Lulusan SMK Perhotelan', 'Komunikatif dalam Bahasa Indonesia & Inggris', 'Menguasai dasar sistem reservasi hotel']), '2027-03-15', 'terbuka', 'BKK SMKN 3 Probolinggo');
    insertJob.run('Junior Graphic & Packaging Designer (Contoh)', 'Karya Visual Studio', 'Malang / Hybrid', 'Kontrak / Penuh Waktu', 'Desain Komunikasi Visual', JSON.stringify(['Lulusan SMK DKV', 'Melampirkan portofolio desain cetak & digital', 'Menguasai perangkat lunak vektor & layout']), '2027-03-01', 'terbuka', 'BKK SMKN 3 Probolinggo');

    // 17. Alumni Stories
    const insertAlumni = db.prepare(
      'INSERT INTO alumni_stories (name, graduation_year, department_name, current_role, organization, testimonial, consent_granted, is_published) VALUES (?, ?, ?, ?, ?, ?, 1, 1)'
    );
    insertAlumni.run('Rizky Pratama (Contoh)', 2023, 'Kuliner', 'Sous Chef Pastry', 'Hotel Bintang 4 Surabaya', 'Praktik dapur berstandar industri sejak kelas XI membuat transisi saya ke dapur hotel profesional berjalan sangat mulus.');
    insertAlumni.run('Anisa Rahmawati (Contoh)', 2022, 'Desain dan Produksi Busana', 'Pendiri & Desainer', 'Studio Busana Arum Probolinggo', 'Pembelajaran pola dan Teaching Factory butik membekali saya kepercayaan diri untuk membuka usaha jahit modern sendiri.');
    insertAlumni.run('Fajar Maulana (Contoh)', 2024, 'Desain Komunikasi Visual', 'Brand & UI Designer', 'Agensi Kreatif Jawa Timur', 'Portofolio nyata yang kami kerjakan selama proyek DKV di sekolah menjadi modal utama saat seleksi kerja di agensi.');

    // 18. Teaching Factory
    const insertTefa = db.prepare(
      'INSERT INTO teaching_factory (name, item_type, department_id, price_idr, unit_label, description, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertTefa.run('Paket Snack Box & Pastry Artisan SMKN 3 (Contoh)', 'produk', 1, 35000, 'kotak', 'Aneka kue tradisional modern dan pastry panggang segar produksi harian siswa Kuliner.', '/src/assets/images/dept_kuliner_1795574977139.jpg');
    insertTefa.run('Jasa Jahit Seragam Institusi & Busana Batik Custom (Contoh)', 'jasa', 2, 185000, 'stel', 'Layanan desain pola, pengukuran, hingga penjahitan rapi oleh unit produksi Desain Busana.', '/src/assets/images/dept_busana_1795574977336.jpg');
    insertTefa.run('Layanan Akomodasi Kamar Edotel & Ruang Pertemuan (Contoh)', 'jasa', 3, 275000, 'malam', 'Kamar tamu standar hotel dikelola siswa Perhotelan dengan pendampingan instruktur.', '/src/assets/images/dept_perhotelan_1795574977721.jpg');
    insertTefa.run('Paket Perawatan Wajah & Hair Styling Griya Cantik (Contoh)', 'jasa', 4, 95000, 'sesi', 'Layanan perawatan wajah higienis dan penataan rambut oleh unit produksi Tata Kecantikan.', '/src/assets/images/dept_kecantikan_1795574977844.jpg');
    insertTefa.run('Jasa Desain Kemasan UMKM, Katalog & Fotografi Produk (Contoh)', 'jasa', 5, 250000, 'paket', 'Pembuatan identitas visual, foto studio produk, dan desain cetak siap produksi.', '/src/assets/images/dept_dkv_1795574978480.jpg');

    // 19. Student Works
    const insertWork = db.prepare(
      'INSERT INTO student_works (title, creator_names, department_id, year, summary, image_url, is_published) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    insertWork.run('Katalog Busana Ecoprint & Batik Probolinggo', 'Kelompok Produksi Kelas XII DPB', 2, 2026, 'Koleksi 12 busana ready-to-wear menggunakan pewarna alam dan motif lokal pesisir Probolinggo.', '/src/assets/images/dept_busana_1795574977336.jpg');
    insertWork.run('Inovasi Dessert Mangga Manalagi Probolinggo', 'Tim Riset Boga Kelas XII Kuliner', 1, 2026, 'Pengembangan mille-crepe dan mousse berbahan mangga khas Probolinggo untuk menu hotel.', '/src/assets/images/dept_kuliner_1795574977139.jpg');
    insertWork.run('Rebranding Kemasan Kopi Lereng Bromo untuk UMKM', 'Studio Kreatif XII DKV', 5, 2026, 'Paket identitas visual, ilustrasi kemasan ramah lingkungan, dan foto komersial produk lokal.', '/src/assets/images/dept_dkv_1795574978480.jpg');

    // 20. Galleries
    const insertGallery = db.prepare(
      'INSERT INTO galleries (title, album, media_type, media_url, caption, taken_at, is_published) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    insertGallery.run('Lingkungan Kampus Asri SMKN 3 Probolinggo', 'Profil Kampus', 'foto', '/src/assets/images/hero_campus_smkn3_1795574976594.jpg', 'Suasana halaman utama gedung praktik dan ruang pembelajaran yang hijau dan tertata.', '2026-10-12');
    insertGallery.run('Praktik Fine Dining Dapur Kuliner', 'Kegiatan Praktik', 'foto', '/src/assets/images/dept_kuliner_1795574977139.jpg', 'Peserta didik melatih ketelitian penyajian hidangan berstandar industri.', '2026-11-01');
    insertGallery.run('Studio Pola & Pembuatan Busana', 'Teaching Factory', 'foto', '/src/assets/images/dept_busana_1795574977336.jpg', 'Proses draping dan penjahitan koleksi wastra Nusantara.', '2026-10-28');
    insertGallery.run('Layanan Front Office Edotel Kampus', 'Kegiatan Praktik', 'foto', '/src/assets/images/dept_perhotelan_1795574977721.jpg', 'Simulasi penerimaan tamu dan administrasi resepsionis hotel.', '2026-10-19');
    insertGallery.run('Laboratorium Estetika Tata Kecantikan', 'Kegiatan Praktik', 'foto', '/src/assets/images/dept_kecantikan_1795574977844.jpg', 'Penyiapan peralatan perawatan kulit sesuai standar higienitas salon.', '2026-10-20');
    insertGallery.run('Studio Desain Komunikasi Visual', 'Teaching Factory', 'foto', '/src/assets/images/dept_dkv_1795574978480.jpg', 'Tinjauan hasil cetak portofolio dan desain antarmuka oleh siswa DKV.', '2026-11-05');

    // 21. Public Information & Documents (UU KIP No. 14/2008)
    const insertDoc = db.prepare(
      'INSERT INTO documents (title, category, classification, ppid_group, file_url, file_size_kb, version, is_approved, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertDoc.run('Profil Kelembagaan & Rencana Kerja Sekolah Tahun 2026 (Contoh)', 'Perencanaan', 'publik', 'berkala', '/api/documents/download-sample/profil-rks-2026', 420, '2026.1', 1, '2026-07-15');
    insertDoc.run('Ringkasan Realisasi Anggaran & Transparansi Pengelolaan Sekolah (Contoh)', 'Transparansi Anggaran', 'publik', 'berkala', '/api/documents/download-sample/ringkasan-anggaran-2026', 315, '2026.2', 1, '2026-10-01');
    insertDoc.run('Prosedur Kesiapsiagaan Keadaan Darurat & Keselamatan Bengkel (K3)', 'Keselamatan', 'publik', 'serta_merta', '/api/documents/download-sample/prosedur-k3-darurat', 280, '1.2', 1, '2026-08-20');
    insertDoc.run('Daftar Informasi Publik (DIP) SMK Negeri 3 Probolinggo', 'Daftar Informasi', 'publik', 'setiap_saat', '/api/documents/download-sample/daftar-informasi-publik', 195, '2026.1', 1, '2026-09-01');
    insertDoc.run('SOP Pelayanan Administrasi Persuratan & Legalisasi Ijazah', 'SOP Pelayanan', 'publik', 'sop', '/api/documents/download-sample/sop-layanan-administrasi', 240, '2.0', 1, '2026-08-10');
    insertDoc.run('Panduan Informasi SPMB & Daya Tampung Konsentrasi Keahlian', 'SPMB', 'publik', 'spmb', '/api/documents/download-sample/panduan-spmb-2026', 510, '2026.1', 1, '2026-11-01');
    insertDoc.run('Ringkasan Eksekutif Evaluasi Penjaminan Mutu Sekolah (SPMI)', 'Penjaminan Mutu', 'publik', 'mutu', '/api/documents/download-sample/ringkasan-spmi-2026', 360, '2026.1', 1, '2026-10-15');
    insertDoc.run('Dokumen Internal Evaluasi Kinerja Kepegawaian (Terlindungi)', 'Kepegawaian', 'internal', 'lainnya', '/internal/hr-eval-2026.pdf', 840, '1.0', 1, '2026-10-20');

    // 22. Digital Administration Services
    const insertService = db.prepare(
      'INSERT INTO services (slug, name_id, name_en, description_id, requirements_json, sop_summary, estimated_sla, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );
    insertService.run(
      'surat-keterangan-aktif',
      'Permohonan Surat Keterangan Siswa Aktif',
      'Active Student Certificate Request',
      'Penerbitan surat keterangan resmi status siswa aktif untuk keperluan beasiswa, lomba, atau administrasi kependudukan.',
      JSON.stringify(['Nomor Induk Siswa (NIS/NISN)', 'Kartu Pelajar atau identitas pemohon', 'Keterangan tujuan pengajuan surat']),
      'Diajukan daring -> Verifikasi data Dapodik/Tata Usaha -> Pencetakan & tanda tangan kepala sekolah -> Pengambilan atau salinan digital.',
      '1–2 Hari Kerja'
    );
    insertService.run(
      'legalisasi-ijazah',
      'Permohonan Legalisasi Ijazah / SKL',
      'Diploma Legalization Request',
      'Layanan pengesahan fotokopi ijazah dan transkrip nilai bagi alumni untuk melamar kerja atau melanjutkan pendidikan tinggi.',
      JSON.stringify(['Pindai Ijazah Asli (PDF/JPG)', 'Nomor Tahun Kelulusan & Konsentrasi Keahlian', 'Jumlah lembar yang dilegalisasi']),
      'Pengajuan tiket -> Verifikasi arsip induk alumni -> Penjadwalan pengesahan -> Pemberitahuan siap diambil.',
      '2–3 Hari Kerja'
    );
    insertService.run(
      'dokumen-alumni',
      'Layanan Surat Keterangan & Rekomendasi Alumni',
      'Alumni Verification & Recommendation',
      'Penerbitan surat keterangan lulusan atau rekomendasi BKK untuk rekrutmen mitra industri.',
      JSON.stringify(['Data identitas alumni & tahun lulus', 'Nama perusahaan/instansi tujuan', 'Kontak aktif pemohon']),
      'Pengajuan melalui portal -> Verifikasi Unit BKK & Tata Usaha -> Penerbitan dokumen resmi.',
      '2 Hari Kerja'
    );
    insertService.run(
      'permohonan-informasi-publik',
      'Permohonan Informasi Publik (PPID Sekolah)',
      'Public Information Request',
      'Layanan permohonan dokumen dan informasi publik sekolah sesuai ketentuan UU No. 14 Tahun 2008.',
      JSON.stringify(['Identitas pemohon yang sah', 'Rincian informasi publik yang dimohonkan', 'Tujuan penggunaan informasi']),
      'Registrasi permohonan -> Telaah klasifikasi oleh Petugas Informasi Publik -> Tanggapan maksimal 10 hari kerja.',
      'Maksimal 10 Hari Kerja'
    );

    // 23. Surveys & Seeded Aggregate Responses
    const insertSurvey = db.prepare(
      'INSERT INTO surveys (title, target_audience, description, is_active) VALUES (?, ?, ?, 1)'
    );
    insertSurvey.run('Survei Kepuasan Layanan Publik & Portal Digital Sekolah', 'umum', 'Evaluasi kualitas keterbukaan informasi, kecepatan pelayanan administrasi, dan kemudahan portal.');
    insertSurvey.run('Survei Kepuasan Pembelajaran & Fasilitas Praktik Siswa', 'siswa', 'Penilaian peserta didik terhadap mutu pembelajaran kejuruan, bengkel praktik, dan layanan konseling.');
    insertSurvey.run('Survei Kepuasan Mitra Dunia Usaha & Industri (DUDI)', 'mitra_industri', 'Umpan balik mitra industri terhadap kesiapan peserta PKL, lulusan, dan kolaborasi Teaching Factory.');

    const insertResp = db.prepare(
      'INSERT INTO survey_responses (survey_id, respondent_group, rating_informasi, rating_pelayanan, rating_fasilitas, rating_transparansi, feedback_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertResp.run(1, 'umum', 5, 4, 5, 5, 'Informasi konsentrasi keahlian dan pelacakan layanan sangat membantu.', now);
    insertResp.run(1, 'orang_tua', 4, 5, 4, 5, 'Pengumuman akademik mudah diakses.', now);
    insertResp.run(2, 'siswa', 5, 4, 5, 4, 'Fasilitas dapur praktik dan studio sangat mendukung proyek.', now);
    insertResp.run(3, 'mitra_industri', 5, 5, 4, 5, 'Koordinasi PKL dan BKK sangat responsif.', now);

    // 24. Testimonials
    const insertTesti = db.prepare(
      'INSERT INTO testimonials (author_name, author_role, respondent_group, organization, quote, consent_verified, is_published) VALUES (?, ?, ?, ?, ?, 1, 1)'
    );
    insertTesti.run('Bapak Surya Darmawan (Contoh)', 'Human Resources Manager', 'mitra_industri', 'Hotel Mitra Probolinggo', 'Peserta PKL dan alumni dari SMK Negeri 3 Probolinggo memiliki etika pelayanan yang matang dan cepat beradaptasi dengan standar operasional hotel.');
    insertTesti.run('Ibu Dewi Lestari (Contoh)', 'Orang Tua Peserta Didik', 'orang_tua', 'Komite Wali Murid Kelas XI Kuliner', 'Komunikasi sekolah sangat terbuka, kegiatan praktik anak terarah, dan layanan administrasi kini jauh lebih mudah dipantau.');
    insertTesti.run('Rizky Pratama (Contoh)', 'Alumni Angkatan 2023', 'alumni', 'Hotel Bintang 4 Surabaya', 'Pengalaman di Teaching Factory membuat saya tidak canggung ketika memasuki lingkungan kerja dapur komersial.');
    insertTesti.run('Aulia Zahra (Contoh)', 'Peserta Didik Kelas XII DKV', 'peserta_didik', 'SMK Negeri 3 Probolinggo', 'Proyek kolaborasi lintas jurusan memberi kami pengalaman nyata melayani kebutuhan desain untuk UMKM lokal.');

    // 25. Visitor Analytics Baseline (realistic recent days for chart)
    const insertVisit = db.prepare(
      'INSERT INTO visitor_analytics (visit_date, path, views) VALUES (?, ?, ?)'
    );
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      insertVisit.run(iso, '/', 42 + ((6 - i) * 7));
      insertVisit.run(iso, '/konsentrasi-keahlian', 18 + ((6 - i) * 3));
      insertVisit.run(iso, '/berita', 14 + ((6 - i) * 2));
    }

    // 26. Seed initial Audit Log
    db.prepare(
      'INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)'
    ).run('Sistem', 'SEED_DATABASE', 'system', '1', 'Inisialisasi skema relasional dan data awal portal SMK Negeri 3 Probolinggo.', '127.0.0.1', now);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
