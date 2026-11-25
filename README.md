# Portal Digital Sekolah Terintegrasi — SMK Negeri 3 Probolinggo

Aplikasi website resmi dan Content Management System (CMS) terintegrasi untuk **SMK Negeri 3 Probolinggo**, Kota Probolinggo, Jawa Timur. Dibangun sebagai *Integrated School Digital Portal* yang mencakup portal publik dwibahasa (ID/EN), halaman detail 5 konsentrasi keahlian, manajemen berita 5W+1H dengan alur redaksi, layanan administrasi digital dengan tiket terverifikasi, keterbukaan informasi publik (PPID), survei penjaminan mutu, serta dashboard administrator berbasis RBAC.

---

## Ringkasan Arsitektur & Pilihan Teknologi

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router DOM, Lucide Icons.
- **Backend**: Node.js (`v22`), Express REST API (`server.ts`, `server/routes.ts`, `server/auth.ts`).
- **Database**: SQLite relasional (`node:sqlite` / `DatabaseSync`) tersimpan di `data/smkn3_portal.db` dengan skema ternormalisasi (`FOREIGN KEY`, indeks pencarian, migrasi otomatis, serta seeder awal).
- **Keamanan**: Hashing kata sandi menggunakan `crypto.scryptSync` + salt acak per akun, token sesi HMAC-SHA256 di memori klien (tanpa `localStorage`), pencabutan sesi aktif, pembatasan percobaan login (*rate limiting*), validasi tipe MIME dan batas ukuran unggahan, serta RBAC 10 peran di sisi backend.
- **Catatan Lingkungan Hosting**: Pada runtime Node.js aplikasi ini, SQLite + Express dipilih agar seluruh sistem berjalan mandiri tanpa ketergantungan layanan eksternal. Untuk deployment skala institusi pada shared hosting PHP/cPanel, struktur API dan skema relasional di `docs/PORTAL_DOCUMENTATION.md` dapat dipetakan langsung ke Laravel + MySQL/MariaDB.

---

## Struktur Direktori Proyek

```text
├── server.ts                          # Entry point Express + Vite middleware / static serving
├── server/
│   ├── db.ts                          # Migrasi skema relasional (32 tabel) & seeder data awal
│   ├── auth.ts                        # Scrypt hashing, sesi HMAC, RBAC middleware, audit log
│   └── routes.ts                      # REST API publik, layanan, PPID, survei, CMS, backup, AI
├── src/
│   ├── shared/types.ts                # Kontrak tipe TypeScript bersama
│   ├── utils/
│   │   ├── portalLogic.ts             # Logika domain murni (slug, workflow, RBAC, survei, tanggal)
│   │   └── portalLogic.test.ts        # Unit tests (node:test)
│   ├── context/PortalContext.tsx      # State konfigurasi sekolah, bahasa, tema, aksesibilitas
│   ├── components/
│   │   ├── PortalLayout.tsx           # Header mega menu, utilitas WCAG, pencarian, AI chat, footer
│   │   ├── ResilientImage.tsx         # Gambar tangguh dengan fallback editorial
│   │   └── admin/                     # Modul UI CMS Administrator
│   └── pages/                         # Halaman Beranda, Jurusan, Berita, Layanan, PPID, Mutu, Admin
├── docs/
│   └── PORTAL_DOCUMENTATION.md        # SRS, Sitemap, User Flow, ERD, API Docs, SOP & Evaluasi
└── .env.example                       # Variabel lingkungan (.env) tanpa kredensial keras
```

---

## Instalasi & Menjalankan Secara Lokal

1. **Pasang dependensi**:
   ```bash
   npm install
   ```
2. **Konfigurasi environment** (opsional untuk AI & password awal):
   Salin `.env.example` menjadi `.env` dan isi seperlunya:
   - `GEMINI_API_KEY`: Opsional untuk mengaktifkan fitur Asisten Redaksi & Chatbot Info Sekolah.
   - `ADMIN_INITIAL_PASSWORD`: Opsional. Jika dikosongkan, halaman `/admin` akan menampilkan formulir **Aktivasi Awal Super Administrator** saat pertama kali dibuka.
3. **Jalankan mode pengembangan**:
   ```bash
   npm run dev
   ```
   Aplikasi berjalan di `http://localhost:3000`.
4. **Jalankan pengujian unit & lint**:
   ```bash
   npx --yes tsx --test src/utils/portalLogic.test.ts
   npm run lint
   npm run build
   ```
5. **Menjalankan mode produksi**:
   ```bash
   npm run build && npm start
   ```

---

## Dokumentasi Lengkap

Lihat [docs/PORTAL_DOCUMENTATION.md](docs/PORTAL_DOCUMENTATION.md) untuk detail:
- Software Requirements Specification (SRS) & Analisis Kebutuhan
- Sitemap & User Flow
- Entity Relationship Diagram (ERD) & Kamus Data
- Dokumentasi Endpoint API
- Panduan Administrator, Penulis Berita & SOP Backup/Keamanan
- Test Cases, Instrumen Evaluasi, Roadmap & Changelog
