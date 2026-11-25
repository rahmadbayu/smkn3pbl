# Dokumentasi Lengkap Portal Digital Terintegrasi
## SMK Negeri 3 Probolinggo

---

## 1. Software Requirements Specification (SRS) & Analisis Kebutuhan

### 1.1 Tujuan Sistem
Portal Digital Terintegrasi SMK Negeri 3 Probolinggo berfungsi sebagai pusat publikasi resmi, layanan administrasi digital, etalase 5 konsentrasi keahlian dan Teaching Factory, keterbukaan informasi publik (PPID), Bursa Kerja Khusus (BKK), serta survei penjaminan mutu sekolah.

### 1.2 Aktor & Role-Based Access Control (RBAC)
1. **Super Administrator**: Akses penuh seluruh sistem, pengguna, hak akses, sesi aktif, audit, dan backup/restore.
2. **Administrator Website**: Halaman, menu, banner, galeri, media, dan pengaturan tampilan.
3. **Editor / Redaktur**: Peninjauan, penyuntingan, persetujuan, penjadwalan, dan pengarsipan berita.
4. **Penulis Berita / Humas**: Pembuatan draf artikel, pengunggahan dokumentasi, penyuntingan artikel pribadi, dan pengajuan review.
5. **Operator Sekolah**: Pembaruan profil sekolah, statistik kelembagaan, GTK, dan sarpras.
6. **Operator Konsentrasi Keahlian**: Pengelolaan profil jurusan, Teaching Factory, karya siswa, dan prestasi.
7. **Petugas BKK**: Pengelolaan lowongan kerja, mitra industri, dan tracer study alumni.
8. **Petugas Layanan Administrasi**: Verifikasi, pemrosesan, penolakan/perbaikan permohonan surat dan pengaduan.
9. **Petugas Informasi Publik (PPID)**: Klasifikasi dokumen (`publik`, `internal`, `terbatas`, `rahasia`) dan SOP layanan.
10. **Kepala Sekolah / Pimpinan**: Pemantauan dashboard analitik, ekspor laporan, dan persetujuan publikasi.

---

## 2. Sitemap Portal

- `/` — Beranda (16 bagian dinamis yang dapat diaktifkan & diatur urutannya via CMS)
- `/profil` — Sejarah, Visi & Misi, Sambutan Kepala Sekolah, Struktur Organisasi, GTK, Akreditasi, Statistik
- `/akademik` — Kurikulum, Kalender, Sistem Blok, Portal Integrasi (e-Rapor, Dapodik, LMS), Teaching Factory
- `/konsentrasi-keahlian` & `/konsentrasi-keahlian/:slug` — Kuliner, Desain & Produksi Busana, Perhotelan, Tata Kecantikan Kulit & Rambut, DKV
- `/kesiswaan` — OSIS, Ekstrakurikuler, Prestasi Siswa/Guru/Lembaga, BK, Beasiswa
- `/spmb` — Persyaratan, Jadwal, Daya Tampung, Alur, FAQ, Tautan Portal Resmi SPMB Pemprov Jatim
- `/humas-bkk` — Lowongan BKK, Mitra Industri, PKL, Tracer Study Agregat, Kisah Sukses Alumni
- `/sarana-prasarana` — Laboratorium, Bengkel Praktik, Edotel, Perpustakaan, Sekolah ASRI
- `/berita` & `/berita/:slug` — Indeks Berita, Pencarian, Filter Kategori, Agenda, Galeri, Unduhan
- `/penjaminan-mutu` — Program SPMI, PKKS, Grafik & Formulir Survei Kepuasan Agregat
- `/layanan-digital` — Formulir Layanan Administrasi, Pelacakan Tiket Terverifikasi, Pengaduan Masyarakat
- `/informasi-publik` — Portal PPID (Berkala, Serta-Merta, Setiap Saat, DIP, SOP)
- `/kontak` — Kontak Resmi, Jam Pelayanan, Peta Interaktif, Formulir Pesan
- `/peta-situs` — Peta Situs, Kebijakan Privasi (UU PDP), Pernyataan Aksesibilitas (WCAG 2.2 AA)
- `/admin` — Dashboard Administrator CMS

---

## 3. User Flow Utama

1. **Alur Layanan Administrasi Digital**:
   Pengguna memilih jenis layanan -> Mengisi identitas & rincian + unggah lampiran opsional -> Sistem menghasilkan `Nomor Tiket` + `Kode Verifikasi` -> Petugas memproses pada CMS (`Diajukan -> Diverifikasi -> Diproses -> Selesai`) -> Pemohon melacak menggunakan `Nomor Tiket` + `Kode Verifikasi` -> Pemohon memberi rating kepuasan.
2. **Alur Publikasi Berita**:
   Penulis menyusun berita 5W+1H (dapat memakai Asisten AI opsional) -> `Draft` / `Submitted` -> Redaktur meninjau (`Review` -> `Approved` -> `Published`) -> Tersedia di portal & sitemap XML.
3. **Alur Keterbukaan Informasi Publik**:
   Petugas mengunggah/mendaftarkan dokumen dengan klasifikasi (`publik`/`internal`/`terbatas`/`rahasia`) -> Halaman publik `/informasi-publik` hanya menampilkan dokumen `publik` yang disetujui.

---

## 4. Entity Relationship Diagram (ERD) & Struktur Database

```text
[roles] 1---* [users] 1---* [user_sessions]
                 |
                 +---* [posts] *---1 [categories]
                          |
                          +---* [post_revisions]

[departments] 1---* [teachers_staff]
              1---* [industry_partners]
              1---* [achievements]
              1---* [student_works]
              1---* [teaching_factory]

[services] 1---* [service_requests]
[surveys]  1---* [survey_responses]

Tabel Independen/Konfigurasi:
- school_settings, homepage_sections, menus, banners, announcements,
  events, school_stats, extracurriculars, facilities, job_vacancies,
  alumni_stories, galleries, media_library, documents, complaints,
  testimonials, contact_messages, visitor_analytics, audit_logs, backup_logs
```

Seluruh relasi dilindungi `PRAGMA foreign_keys = ON`, kunci utama `INTEGER PRIMARY KEY`, indeks pada kolom pencarian (`posts.slug`, `posts.status`, `service_requests.ticket_number`, `documents.classification`), serta dukungan *soft delete* pada berita (`deleted_at`).

---

## 5. Dokumentasi API Ringkas

### Publik
- `GET /api/bootstrap` — Pengaturan sekolah, section beranda, menu, banner aktif, pengumuman, statistik, kategori.
- `GET /api/departments` & `GET /api/departments/:slug` — Daftar & detail lengkap konsentrasi keahlian.
- `GET /api/posts` & `GET /api/posts/:slug` — Daftar berita terpaginasi & detail artikel.
- `GET /api/documents?ppid_group=...` — Dokumen publik terverifikasi.
- `POST /api/service-requests` — Pengajuan layanan administrasi (`multipart/form-data`).
- `POST /api/service-requests/track` — Pelacakan tiket aman (`ticket_number` + `tracking_code`).
- `POST /api/surveys/:id/respond` — Pengiriman respons survei kepuasan.
- `GET /api/sitemap.xml` & `GET /api/robots.txt` — Metadata perayapan SEO.

### Administrator CMS (Wajib Header `Authorization: Bearer <token>`)
- `POST /api/auth/claim-admin` & `POST /api/auth/login` & `POST /api/auth/logout`
- `GET /api/admin/dashboard?range=7d|30d|365d` & `GET /api/admin/export/:type`
- CRUD `/api/admin/posts`, `/api/admin/homepage-sections`, `/api/admin/menus`, `/api/admin/departments`, `/api/admin/announcements`, `/api/admin/events`, `/api/admin/banners`, `/api/admin/jobs`, `/api/admin/partners`, `/api/admin/tefa`, `/api/admin/media/upload`, `/api/admin/documents`, `/api/admin/service-requests/:id`, `/api/admin/complaints/:id`, `/api/admin/settings`, `/api/admin/stats`, `/api/admin/users`, `/api/admin/roles`, `/api/admin/sessions`, `/api/admin/audit-logs`, `/api/admin/backup/create`.

---

## 6. SOP Keamanan, Backup & Panduan Operasional

- **SOP Keamanan**: Jangan membagikan token sesi; selalu cabut sesi aktif di tab *RBAC, Audit & Backup* jika perangkat staf hilang; gunakan akun sesuai peran (prinsip *least privilege*); simpan file sensitif dengan klasifikasi `internal`/`rahasia`.
- **SOP Backup & Restore**: Lakukan ekspor snapshot JSON secara berkala melalui tab *RBAC, Audit & Backup -> Unduh Snapshot Backup* sebelum pembaruan besar; simpan berkas cadangan di penyimpanan luring terenkripsi milik sekolah.
- **Panduan Penulis Berita**: Gunakan struktur 5W+1H (Apa, Siapa, Kapan, Di mana, Mengapa, Bagaimana), isi *alt text* deskriptif untuk aksesibilitas pembaca layar, serta isi meta description maksimal 155 karakter.

---

## 7. Matriks Uji & Evaluasi Internal

| Aspek Evaluasi | Bobot | Cakupan Implementasi |
|---|---:|---|
| Kelengkapan dan kualitas konten | 20% | 16 section beranda, 5 konsentrasi keahlian, SPMB, BKK, TeFa, PPID, Mutu |
| Desain visual | 10% | Tipografi Fraunces + Plus Jakarta Sans + JetBrains Mono, tata letak editorial bersih |
| Kemudahan penggunaan | 10% | Mega menu terkelompok, pencarian global, pelacakan tiket, mode gelap |
| Performa | 10% | Lazy loading gambar, indeks SQLite, bundle teroptimasi |
| Keamanan dan privasi | 10% | Scrypt + HMAC session revocation, RBAC backend, validasi MIME, pelindungan PII |
| Keterbukaan informasi publik | 10% | Klasifikasi dokumen UU KIP, DIP, SOP pelayanan, pengaduan masyarakat |
| Integrasi layanan digital | 10% | Layanan persuratan daring, portal e-Rapor/Dapodik/LMS/SPMB, AI opsional |
| SEO | 8% | Semantic HTML, JSON-LD EducationalOrganization, Sitemap XML, Robots.txt |
| Responsive design | 7% | Mobile-first drawer, grid adaptif 390px–1440px |
| Aksesibilitas | 5% | Skip-to-content, kontrol jeda slider, panel teks 100–125%, kontras tinggi |

---

## 8. Roadmap & Changelog

### Changelog v1.0.0 (2026-11-25)
- Rilis awal Portal Digital Sekolah Terintegrasi SMK Negeri 3 Probolinggo.
- Skema database relasional 32 tabel + migrasi & seeder.
- 16 modul halaman publik + CMS Administrator RBAC 10 peran + unit tests.

### Roadmap Berikutnya
- Integrasi Single Sign-On (SSO) Belajar.id / Google Workspace untuk siswa & guru.
- Notifikasi WhatsApp Gateway resmi sekolah untuk pembaruan status tiket layanan.
- Pengujian audit eksternal WCAG 2.2 AA & penetration testing pra-produksi.
