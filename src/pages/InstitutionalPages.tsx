import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Leaf,
  Users,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { usePortal } from '../context/PortalContext';
import { formatIDR, formatIndonesianDate, formatNumberLocale, pickLang } from '../utils/portalLogic';
import type {
  Achievement,
  AlumniStory,
  Department,
  Facility,
  IndustryPartner,
  JobVacancy,
  StudentWork,
  TeacherStaff,
  TeachingFactoryItem,
} from '../shared/types';

export const ProfilePage: React.FC = () => {
  const { settings, stats, lang } = usePortal();
  const [teachers, setTeachers] = useState<TeacherStaff[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | 'pimpinan' | 'guru' | 'tendik'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/teachers').then((r) => r.json()).then((d) => setTeachers(Array.isArray(d) ? d : []));
  }, []);

  const filteredTeachers = teachers.filter((t) => {
    if (roleFilter !== 'all' && t.role_type !== roleFilter) return false;
    if (search.trim() && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.position.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const isEn = lang === 'en';
  const principalMessage = pickLang(lang, settings?.principal_message_id, settings?.principal_message_en);
  const visionText = pickLang(lang, settings?.vision_id, settings?.vision_en);
  const missionList =
    isEn && settings?.mission_en && settings.mission_en.length > 0
      ? settings.mission_en
      : settings?.mission_id || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-8 space-y-3 max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Institutional Identity & Governance' : 'Identitas & Tata Kelola'}
        </div>
        <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-white">
          {isEn ? 'Profile of' : 'Profil'} {settings?.school_name || 'SMK Negeri 3 Probolinggo'}
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 leading-relaxed">
          {settings?.school_type} · {settings?.city}, {settings?.province} · {settings?.accreditation} · NPSN: {settings?.npsn}
        </p>
      </div>

      {/* Principal & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 rounded-lg border border-stone-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <div className="aspect-3/4">
            <ResilientImage src={settings?.principal_photo} alt={settings?.principal_name || (isEn ? 'Principal' : 'Kepala Sekolah')} className="w-full h-full object-cover" />
          </div>
          <div className="p-4 border-t border-stone-200 dark:border-slate-800">
            <div className="font-semibold text-sm">{settings?.principal_name}</div>
            <div className="text-xs text-stone-500">{settings?.principal_title}</div>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'History & Institutional Mandate' : 'Sejarah & Mandat Kelembagaan'}
            </h2>
            <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed">
              {principalMessage}
            </p>
            <p className="text-sm text-stone-600 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Official school history, NPSN registration, accreditation records, and organizational governance are dynamically maintained via the CMS Admin Panel to ensure institutional accuracy.'
                : 'Seluruh informasi sejarah resmi, NPSN, akreditasi, serta struktur organisasi dikelola secara dinamis melalui Panel Administrator CMS untuk memastikan akurasi data kelembagaan.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <h3 className="font-display text-xl font-semibold">{isEn ? 'School Vision' : 'Visi Sekolah'}</h3>
              <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed">{visionText}</p>
            </div>
            <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <h3 className="font-display text-xl font-semibold">{isEn ? 'Strategic Missions' : 'Misi Strategis'}</h3>
              <ul className="space-y-1.5 text-sm text-stone-700 dark:text-slate-300 list-disc pl-5">
                {missionList.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Structure Overview */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'School Organizational Structure' : 'Struktur Organisasi Sekolah'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            {
              role: isEn ? 'Principal' : 'Kepala Sekolah',
              holder: settings?.principal_name || (isEn ? 'School Leadership' : 'Pimpinan Sekolah'),
              unit: isEn ? 'Leadership & Quality Policy' : 'Pimpinan & Kebijakan Mutu',
            },
            {
              role: isEn ? 'Vice Principal for Curriculum' : 'Wakil Kepala Bidang Kurikulum',
              holder: isEn ? 'Academic & Quality Assurance Team' : 'Tim Akademik & Penjaminan Mutu',
              unit: isEn ? 'Curriculum & e-Rapor' : 'Kurikulum & e-Rapor',
            },
            {
              role: isEn ? 'Vice Principal for Public Relations & BKK' : 'Wakil Kepala Bidang Humas & BKK',
              holder: isEn ? 'Industry Partnership & Alumni Team' : 'Tim Kemitraan DUDI & Alumni',
              unit: isEn ? 'Internship, Career Center & Tracer Study' : 'PKL, BKK & Tracer Study',
            },
            {
              role: isEn ? 'Head of Administration & PPID' : 'Kepala Tata Usaha & PPID',
              holder: isEn ? 'Administrative Services Unit' : 'Unit Layanan Administrasi',
              unit: isEn ? 'Correspondence & Public Information' : 'Persuratan & Keterbukaan Informasi',
            },
          ].map((node) => (
            <div key={node.role} className="p-4 rounded border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-950">
              <div className="text-xs uppercase tracking-wider text-stone-500">{node.unit}</div>
              <div className="font-semibold mt-1">{node.role}</div>
              <div className="text-xs text-stone-600 dark:text-slate-400 mt-1">{node.holder}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GTK Directory */}
      <div id="gtk" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Teachers & Education Staff (GTK)' : 'Guru dan Tenaga Kependidikan (GTK)'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {isEn
                ? 'Faculty and staff directory managed and updated by school operators via the CMS.'
                : 'Data GTK contoh dikelola dan diperbarui operator melalui CMS.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? 'Search name or position...' : 'Cari nama atau jabatan...'}
              className="px-3 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <div className="flex p-0.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-900 text-xs">
              {(['all', 'pimpinan', 'guru', 'tendik'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded ${roleFilter === r ? 'bg-white dark:bg-slate-800 font-semibold' : ''}`}
                >
                  {r === 'all'
                    ? (isEn ? 'All' : 'Semua')
                    : r === 'pimpinan'
                      ? (isEn ? 'LEADERSHIP' : 'PIMPINAN')
                      : r === 'guru'
                        ? (isEn ? 'TEACHERS' : 'GURU')
                        : (isEn ? 'STAFF' : 'TENDIK')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 dark:border-slate-800 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Name' : 'Nama'}</th>
                <th className="px-4 py-3">{isEn ? 'Position' : 'Jabatan'}</th>
                <th className="px-4 py-3">{isEn ? 'Category' : 'Kategori'}</th>
                <th className="px-4 py-3">{isEn ? 'Qualification' : 'Kualifikasi'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {filteredTeachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-slate-300">{t.position}</td>
                  <td className="px-4 py-3 uppercase text-xs text-stone-500">{t.role_type}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-slate-300">{t.education}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{isEn ? 'School Statistics' : 'Statistik Sekolah'}</h2>
          <span className="text-xs text-stone-500">{settings?.stats_period}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.id} className="p-3 rounded border border-stone-100 dark:border-slate-800">
              <div className="font-mono-tabular text-2xl font-semibold text-[#1E3A8A] dark:text-blue-400">
                {formatNumberLocale(s.value, lang)}
              </div>
              <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                {pickLang(lang, s.label_id, s.label_en)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AcademicPage: React.FC = () => {
  const { settings, lang } = usePortal();
  const isEn = lang === 'en';
  const [tefa, setTefa] = useState<TeachingFactoryItem[]>([]);
  const [works, setWorks] = useState<StudentWork[]>([]);

  useEffect(() => {
    fetch('/api/tefa').then((r) => r.json()).then((d) => setTefa(Array.isArray(d) ? d : []));
    fetch('/api/student-works').then((r) => r.json()).then((d) => setWorks(Array.isArray(d) ? d : []));
  }, []);

  const integrations = [
    {
      name: 'e-Rapor SMK',
      desc: isEn
        ? 'Vocational student learning assessment portal connected to the Ministry of Education.'
        : 'Portal penilaian hasil belajar peserta didik terhubung Kemendikbudristek.',
      url: settings?.integrations?.erapor_url,
    },
    {
      name: isEn ? 'Basic Education Data (Dapodik)' : 'Data Pokok Pendidikan (Dapodik)',
      desc: isEn
        ? 'Official institutional, faculty, and student master data reference.'
        : 'Referensi data pokok kelembagaan, GTK, dan peserta didik resmi.',
      url: settings?.integrations?.dapodik_url,
    },
    {
      name: 'Learning Management System (LMS)',
      desc: isEn
        ? 'Online learning portal, vocational teaching modules, and student evaluations.'
        : 'Portal pembelajaran daring, modul ajar vokasi, dan evaluasi.',
      url: settings?.integrations?.lms_url,
    },
    {
      name: isEn ? 'Digital Library' : 'Perpustakaan Digital',
      desc: isEn
        ? 'Access to vocational reference books and student literacy collections.'
        : 'Akses koleksi buku referensi kejuruan dan literasi siswa.',
      url: settings?.integrations?.library_url,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-8 space-y-3 max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Curriculum, Teaching Factory & Academic Systems' : 'Kurikulum, Teaching Factory & Sistem Akademik'}
        </div>
        <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-white">
          {isEn ? 'Academics & Vocational Learning' : 'Akademik & Pembelajaran Vokasi'}
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 leading-relaxed">
          {isEn
            ? 'Implementation of the industry-project-based Merdeka Vocational Curriculum, vocational block practice scheduling, and official academic portal integrations.'
            : 'Implementasi Kurikulum Merdeka SMK berbasis proyek industri, jadwal blok praktik kejuruan, dan integrasi portal akademik resmi.'}
        </p>
      </div>

      {/* Curriculum & Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <BookOpen className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold">{isEn ? 'Curriculum Structure' : 'Struktur Kurikulum'}</h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {isEn
              ? 'Learning encompasses General Subjects, Vocational Competence Groups (Phase E Grade X and Phase F Grades XI–XII), Pancasila Student Profile Projects, and a minimum one-semester industry internship (PKL).'
              : 'Pembelajaran mencakup Kelompok Mata Pelajaran Umum, Kelompok Kejuruan (Fase E Kelas X dan Fase F Kelas XI–XII), Proyek Penguatan Profil Pelajar Pancasila, dan PKL minimal 1 semester.'}
          </p>
        </div>
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <GraduationCap className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold">{isEn ? 'Block Schedule System' : 'Jadwal Sistem Blok'}</h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {isEn
              ? 'Learning schedules optimize full-duration theory and laboratory/workshop practice sessions so students complete projects to industry standards.'
              : 'Pengaturan jadwal pembelajaran mengoptimalkan sesi teori dan praktik laboratorium/bengkel berdurasi penuh sehingga peserta didik tuntas mengerjakan proyek standar industri.'}
          </p>
        </div>
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <Award className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold">{isEn ? 'Academic Calendar' : 'Kalender Pendidikan'}</h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {isEn
              ? 'Odd Semester runs July–December and Even Semester runs January–June, including Summative Assessments, Vocational Competency Exams (UKK), and Industry Internships (PKL).'
              : 'Semester Ganjil berlangsung Juli–Desember dan Semester Genap Januari–Juni, mencakup Penilaian Sumatif, Uji Kompetensi Keahlian (UKK), dan PKL.'}
          </p>
        </div>
      </div>

      {/* Integrated Information Systems */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'Information System Integrations' : 'Portal Integrasi Sistem Informasi'}
        </h2>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          {isEn
            ? 'In accordance with educational data security policies, access to external platforms (e-Rapor/Dapodik/LMS) is routed through authorized official portals.'
            : 'Sesuai kebijakan keamanan data pendidikan, akses ke sistem eksternal (e-Rapor/Dapodik/LMS) dilakukan melalui tautan portal resmi yang terotorisasi.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {integrations.map((intg) => (
            <a
              key={intg.name}
              href={intg.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400 transition-colors flex flex-col justify-between gap-3"
            >
              <div>
                <div className="font-semibold text-sm flex items-center justify-between gap-2">
                  <span>{intg.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-300 mt-1.5 leading-relaxed">{intg.desc}</p>
              </div>
              <span className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                {isEn ? 'Open Official Portal →' : 'Buka Portal Resmi →'}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Teaching Factory */}
      <div id="tefa" className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-semibold">
            {isEn ? 'Teaching Factory & School Products/Services' : 'Teaching Factory & Produk/Jasa Sekolah'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
            {isEn
              ? 'Real production units managed by students alongside mentor teachers and industry partners.'
              : 'Unit produksi nyata yang dikelola peserta didik bersama guru pembimbing dan mitra industri.'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tefa.map((item) => (
            <article key={item.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                <ResilientImage src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 space-y-2">
                <div className="text-xs text-stone-500 uppercase">{item.item_type} · {item.department_name}</div>
                <h3 className="font-display text-lg font-semibold">{item.name}</h3>
                <p className="text-xs text-stone-600 dark:text-slate-300">{item.description}</p>
                <div className="pt-2 font-mono-tabular text-sm font-semibold text-[#9A3412] dark:text-amber-400">
                  {formatIDR(item.price_idr)} / {item.unit_label}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Student Works */}
      {works.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            {isEn ? 'Student Innovation Portfolio' : 'Portofolio Karya Inovasi Siswa'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {works.map((w) => (
              <div key={w.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="text-xs text-stone-500">{w.department_name} · {w.year}</div>
                <h3 className="font-semibold text-base">{w.title}</h3>
                <div className="text-xs text-stone-500">{isEn ? 'Creator' : 'Kreator'}: {w.creator_names}</div>
                <p className="text-xs text-stone-600 dark:text-slate-300 pt-1">{w.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StudentAffairsPage: React.FC = () => {
  const { lang } = usePortal();
  const isEn = lang === 'en';
  const [extras, setExtras] = useState<Array<{ id: number; name: string; category: string; coach_name: string; schedule: string; description: string }>>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    fetch('/api/extracurriculars').then((r) => r.json()).then((d) => setExtras(Array.isArray(d) ? d : []));
    fetch('/api/achievements').then((r) => r.json()).then((d) => setAchievements(Array.isArray(d) ? d : []));
  }, []);

  const filteredAch = levelFilter === 'all' ? achievements : achievements.filter((a) => a.level === levelFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-stone-500">
            {isEn ? 'Character & Talent Development' : 'Pembinaan Karakter & Talenta'}
          </div>
          <h1 className="font-display text-4xl font-semibold">
            {isEn ? 'Student Affairs, OSIS & Achievements' : 'Kesiswaan, OSIS & Prestasi'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Student council leadership development, extracurricular clubs, counseling guidance, scholarship information, and student achievement records.'
              : 'Pengembangan kepemimpinan OSIS, kegiatan ekstrakurikuler, bimbingan konseling, informasi beasiswa, dan rekam prestasi peserta didik.'}
          </p>
        </div>
        <Link to="/spmb" className="px-4 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-medium w-fit">
          {isEn ? 'Open Admissions (SPMB) →' : 'Buka Halaman SPMB →'}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-display text-xl font-semibold">
            {isEn ? 'Student Council (OSIS) & MPK' : 'OSIS & Majelis Perwakilan Kelas'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Student leadership body fostering organizational skills, campus events, and community outreach.'
              : 'Wadah organisasi siswa untuk melatih kepemimpinan, penyelenggaraan acara sekolah, dan pengabdian masyarakat.'}
          </p>
        </div>
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-display text-xl font-semibold">
            {isEn ? 'Guidance & Counseling (BK)' : 'Bimbingan dan Konseling (BK)'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Confidential and supportive academic mentoring, career planning, student well-being, and parent mediation services.'
              : 'Layanan pendampingan akademik, pengembangan karier, kesehatan mental siswa, serta mediasi orang tua secara rahasia dan suportif.'}
          </p>
        </div>
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-display text-xl font-semibold">
            {isEn ? 'Scholarship Information' : 'Informasi Beasiswa'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Assistance for Indonesia Smart Program (PIP), regional merit scholarships, and industry partner education grants.'
              : 'Pendampingan program PIP (Program Indonesia Pintar), beasiswa prestasi daerah, dan dukungan pendidikan mitra industri.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">{isEn ? 'Active Extracurriculars' : 'Ekstrakurikuler Aktif'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {extras.map((ex) => (
            <div key={ex.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="text-xs text-[#1E3A8A] dark:text-blue-400 font-medium">{ex.category}</div>
              <h3 className="font-semibold text-base">{ex.name}</h3>
              <p className="text-xs text-stone-600 dark:text-slate-300">{ex.description}</p>
              <div className="text-xs text-stone-500 pt-2">{ex.schedule} · {ex.coach_name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{isEn ? 'Achievement Directory' : 'Daftar Prestasi'}</h2>
          <select
            aria-label={isEn ? 'Filter achievement level' : 'Filter tingkat prestasi'}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-fit"
          >
            <option value="all">{isEn ? 'All Levels' : 'Semua Tingkat'}</option>
            <option value="Kota/Kabupaten">{isEn ? 'City/Regency' : 'Kota/Kabupaten'}</option>
            <option value="Provinsi">{isEn ? 'Province' : 'Provinsi'}</option>
            <option value="Nasional">{isEn ? 'National' : 'Nasional'}</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAch.map((a) => (
            <div key={a.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
              <div className="w-24 h-24 rounded overflow-hidden shrink-0 border border-stone-200 dark:border-slate-800">
                <ResilientImage src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-stone-500 tabular-nums">{a.level} · {a.year} · {a.organizer}</div>
                <h3 className="font-semibold text-sm">{a.title}</h3>
                <div className="text-xs text-stone-600 dark:text-slate-300">{a.recipient_name}</div>
                <p className="text-xs text-stone-500">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SpmbPage: React.FC = () => {
  const { settings, announcements, lang } = usePortal();
  const isEn = lang === 'en';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch('/api/departments').then((r) => r.json()).then((d) => setDepartments(Array.isArray(d) ? d : []));
  }, []);

  const totalQuota = departments.reduce((acc, d) => acc + (d.quota_spmb || 0), 0);
  const spmbAnnouncements = announcements.filter((a) => a.category === 'spmb');

  const faqs = isEn
    ? [
        {
          q: 'Where does official SPMB registration for SMK Negeri 3 Probolinggo take place?',
          a: 'Official registration is conducted centrally through the East Java Provincial Government SPMB portal according to the Education Office schedule. The school provides a free information and document verification desk.',
        },
        {
          q: 'Are there special requirements for specific vocational programs?',
          a: 'Across all five vocational programs (Culinary Arts, Fashion Design & Production, Hospitality, Beauty & Hair Care, and Visual Communication Design), applicants fulfill standard junior high graduation and basic health criteria per SPMB guidelines.',
        },
        {
          q: 'How can prospective students get guidance on choosing a study program?',
          a: 'Prospective students and parents may visit the campus SPMB information desk during business hours or contact the official admissions committee.',
        },
      ]
    : [
        { q: 'Di mana pendaftaran resmi SPMB SMK Negeri 3 Probolinggo dilakukan?', a: 'Pendaftaran resmi dilaksanakan terpusat melalui portal SPMB Pemerintah Provinsi Jawa Timur sesuai jadwal dinas pendidikan. Sekolah menyediakan posko informasi dan verifikasi dokumen tanpa pungutan biaya.' },
        { q: 'Apakah ada persyaratan khusus untuk konsentrasi keahlian tertentu?', a: 'Untuk seluruh konsentrasi keahlian (Kuliner, Desain & Produksi Busana, Perhotelan, Tata Kecantikan, dan DKV), pendaftar memenuhi syarat umum ijazah SMP/sederajat serta persyaratan kesehatan dasar sesuai juknis SPMB.' },
        { q: 'Bagaimana jika calon murid ingin berkonsultasi memilih jurusan?', a: 'Calon peserta didik dan orang tua dapat mengunjungi posko informasi SPMB sekolah pada jam kerja atau menghubungi kontak panitia resmi pada halaman ini.' },
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="p-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#9A3412] dark:text-amber-400 font-semibold">
            {isEn ? 'New Student Admissions System (SPMB)' : 'Sistem Penerimaan Murid Baru (SPMB)'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-white">
            {isEn ? 'Official Admissions Information' : 'Informasi Resmi SPMB'} {settings?.school_name}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {isEn
              ? 'Official information on program admission quotas, general requirements, schedules, registration steps, and the East Java Provincial Government SPMB portal link.'
              : 'Halaman informasi daya tampung, persyaratan, jadwal, alur pendaftaran, dan tautan resmi portal SPMB Pemerintah Provinsi Jawa Timur.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <a
            href={settings?.integrations?.spmb_url || 'https://spmbjatim.net'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold hover:opacity-95"
          >
            <span>{isEn ? 'Official East Java SPMB Portal' : 'Portal Resmi SPMB Jatim'}</span>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {spmbAnnouncements.length > 0 && (
        <div className="space-y-3">
          {spmbAnnouncements.map((a) => (
            <div key={a.id} className="p-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30">
              <div className="font-semibold text-sm">{pickLang(lang, a.title_id, a.title_en)}</div>
              <p className="text-xs text-stone-700 dark:text-slate-300 mt-1">{pickLang(lang, a.content_id, a.content_en)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quota Table */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="font-display text-2xl font-semibold">
            {isEn ? 'Vocational Program Admission Quotas' : 'Daya Tampung Konsentrasi Keahlian'}
          </h2>
          <span className="text-xs font-mono-tabular text-stone-500">
            {isEn ? `Total Indicative Quota: ${formatNumberLocale(totalQuota, lang)} students` : `Total Daya Tampung (Contoh): ${formatNumberLocale(totalQuota, lang)} siswa`}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 dark:border-slate-800 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Code' : 'Kode'}</th>
                <th className="px-4 py-3">{isEn ? 'Vocational Program' : 'Konsentrasi Keahlian'}</th>
                <th className="px-4 py-3 text-right">{isEn ? 'Quota' : 'Daya Tampung'}</th>
                <th className="px-4 py-3">{isEn ? 'Details' : 'Detail'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-mono-tabular text-xs">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{pickLang(lang, d.name_id, d.name_en)}</td>
                  <td className="px-4 py-3 text-right font-mono-tabular">
                    {formatNumberLocale(d.quota_spmb, lang)} {isEn ? 'students' : 'siswa'}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/konsentrasi-keahlian/${d.slug}`} className="text-xs text-[#1E3A8A] dark:text-blue-400 hover:underline">
                      {isEn ? 'View Curriculum →' : 'Lihat Kurikulum →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirements & Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold">{isEn ? 'General Requirements' : 'Persyaratan Umum'}</h2>
          <ul className="space-y-2 text-sm text-stone-700 dark:text-slate-300">
            {(isEn
              ? [
                  'Graduated from Junior High School (SMP/MTs) or equivalent.',
                  'Active National Student ID Number (NISN) registered on Family Card.',
                  'Meets maximum age requirements under East Java SPMB technical guidelines.',
                  'Completes online PIN verification and vocational program selection.',
                ]
              : [
                  'Lulusan SMP/MTs atau bentuk lain yang sederajat.',
                  'Memiliki NISN aktif dan terdaftar dalam Kartu Keluarga.',
                  'Memenuhi batas usia maksimal sesuai petunjuk teknis SPMB Jawa Timur.',
                  'Mengikuti tahapan verifikasi PIN dan pemilihan konsentrasi keahlian secara daring.',
                ]
            ).map((req, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold">{isEn ? 'Official Registration Flow' : 'Alur Pendaftaran Resmi'}</h2>
          <ol className="space-y-2 text-sm text-stone-700 dark:text-slate-300 list-decimal pl-5">
            {isEn ? (
              <>
                <li>Obtain PIN and verify population/report card records on the official East Java SPMB portal.</li>
                <li>Select admission track (Affirmation, Academic/Non-Academic Merit, or Domicile).</li>
                <li>Select your preferred Vocational Program at SMK Negeri 3 Probolinggo.</li>
                <li>Track selection announcements and complete re-registration on schedule.</li>
              </>
            ) : (
              <>
                <li>Pengambilan PIN dan verifikasi dokumen kependudukan/rapor di laman resmi SPMB Jatim.</li>
                <li>Pemilihan jalur pendaftaran (Afirmasi, Prestasi Akademik/Non-Akademik, Domisili).</li>
                <li>Pemilihan Konsentrasi Keahlian di SMK Negeri 3 Probolinggo.</li>
                <li>Pemantauan pengumuman hasil seleksi dan daftar ulang sesuai jadwal resmi.</li>
              </>
            )}
          </ol>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">{isEn ? 'Frequently Asked Questions (FAQ)' : 'Pertanyaan Umum (FAQ)'}</h2>
        {faqs.map((f, idx) => (
          <div key={idx} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              aria-expanded={openFaq === idx}
              className="w-full px-5 py-4 text-left font-semibold text-sm flex items-center justify-between gap-4"
            >
              <span>{f.q}</span>
              <span className="text-xs font-mono-tabular">{openFaq === idx ? '−' : '+'}</span>
            </button>
            {openFaq === idx && (
              <div className="px-5 pb-4 text-sm text-stone-600 dark:text-slate-300 border-t border-stone-100 dark:border-slate-800 pt-3">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const IndustryBkkPage: React.FC = () => {
  const { lang } = usePortal();
  const isEn = lang === 'en';
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [alumni, setAlumni] = useState<AlumniStory[]>([]);

  useEffect(() => {
    fetch('/api/partners').then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d : []));
    fetch('/api/jobs').then((r) => r.json()).then((d) => setJobs(Array.isArray(d) ? d : []));
    fetch('/api/alumni').then((r) => r.json()).then((d) => setAlumni(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-8 space-y-3 max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Public Relations, Industry Partners & Career Center (BKK)' : 'Humas, Mitra DUDI & Bursa Kerja Khusus'}
        </div>
        <h1 className="font-display text-4xl font-semibold">
          {isEn ? 'Industry Partnerships, BKK & Alumni' : 'Kemitraan Industri, BKK & Alumni'}
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300">
          {isEn
            ? 'Graduate job placement hub, official partner company vacancies, industry internship (PKL) coordination, and alumni Tracer Study.'
            : 'Pusat penyaluran tenaga kerja lulusan SMK, informasi lowongan resmi perusahaan mitra, koordinasi Praktik Kerja Lapangan (PKL), dan Tracer Study alumni.'}
        </p>
      </div>

      {/* Job Vacancies */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display text-2xl font-semibold">
            {isEn ? 'Special Job Exchange (BKK) Vacancies' : 'Lowongan Pekerjaan Bursa Kerja Khusus (BKK)'}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <article key={job.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs text-stone-500">
                  {job.department_target} · {job.employment_type} · {job.location}
                </div>
                <h3 className="font-display text-lg font-semibold">{job.title}</h3>
                <div className="text-sm font-medium text-[#1E3A8A] dark:text-blue-400">{job.company_name}</div>
                <ul className="text-xs text-stone-600 dark:text-slate-300 list-disc pl-4 space-y-1 pt-1">
                  {job.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 text-xs text-stone-500 space-y-1">
                <div>{isEn ? 'Application Deadline' : 'Batas Pendaftaran'}: {formatIndonesianDate(job.deadline, lang)}</div>
                <div>{isEn ? 'BKK Contact' : 'Kontak BKK'}: {job.contact_info}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Industry Partners */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'Business & Industry Partners (DUDI)' : 'Mitra Dunia Usaha & Dunia Industri'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {partners.map((p) => (
            <div key={p.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono-tabular font-semibold text-[#1E3A8A] dark:text-blue-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {p.logo_text}
                </span>
                <span>{isEn ? `Partner since ${p.since_year}` : `Mitra sejak ${p.since_year}`}</span>
              </div>
              <h3 className="font-semibold text-base">{p.name}</h3>
              <div className="text-xs text-stone-500">{p.sector} · {p.city}</div>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tracer Study & Alumni */}
      <div id="tracer" className="space-y-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Alumni Tracer Study Aggregate Statistics (Sample Data)' : 'Statistik Agregat Tracer Study Alumni (Data Contoh)'}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            {isEn
              ? 'Aggregate graduate absorption figures are published without exposing individual alumni personal data, in line with personal data protection regulations.'
              : 'Data agregat keterserapan lulusan ditampilkan tanpa membuka identitas pribadi alumni sesuai ketentuan pelindungan data pribadi.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded border border-stone-200 dark:border-slate-800">
              <div className="font-mono-tabular text-3xl font-semibold text-[#1E3A8A] dark:text-blue-400">68%</div>
              <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                {isEn ? 'Employed in Industry & Services' : 'Bekerja di Industri & Jasa'}
              </div>
            </div>
            <div className="p-4 rounded border border-stone-200 dark:border-slate-800">
              <div className="font-mono-tabular text-3xl font-semibold text-[#14532D] dark:text-emerald-400">19%</div>
              <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                {isEn ? 'Independent Entrepreneurs' : 'Berwirausaha Mandiri'}
              </div>
            </div>
            <div className="p-4 rounded border border-stone-200 dark:border-slate-800">
              <div className="font-mono-tabular text-3xl font-semibold text-[#9A3412] dark:text-amber-400">13%</div>
              <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                {isEn ? 'Continuing Higher Education' : 'Melanjutkan Pendidikan Tinggi'}
              </div>
            </div>
          </div>
        </div>

        <h2 className="font-display text-2xl font-semibold">{isEn ? 'Alumni Success Stories' : 'Kisah Sukses Alumni'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {alumni.map((a) => (
            <article key={a.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="text-xs text-stone-500">
                {isEn ? `Class of ${a.graduation_year}` : `Angkatan ${a.graduation_year}`} · {a.department_name}
              </div>
              <h3 className="font-semibold text-base">{a.name}</h3>
              <div className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">{a.current_role} — {a.organization}</div>
              <p className="text-xs text-stone-600 dark:text-slate-300 italic leading-relaxed">“{a.testimonial}”</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FacilitiesPage: React.FC = () => {
  const { lang } = usePortal();
  const isEn = lang === 'en';
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [catFilter, setCatFilter] = useState('all');

  useEffect(() => {
    fetch('/api/facilities').then((r) => r.json()).then((d) => setFacilities(Array.isArray(d) ? d : []));
  }, []);

  const filtered = catFilter === 'all' ? facilities : facilities.filter((f) => f.category === catFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-stone-500">
            {isEn ? 'Learning Infrastructure & Environment' : 'Infrastruktur Pembelajaran & Lingkungan'}
          </div>
          <h1 className="font-display text-4xl font-semibold">
            {isEn ? 'Campus Facilities & ASRI Green School' : 'Sarana, Prasarana & Sekolah ASRI'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Vocational laboratories, industry-standard practice workshops, Edotel training hotel, digital library, and the Safe, Healthy, Green & Beautiful (ASRI) campus initiative.'
              : 'Laboratorium kejuruan, bengkel praktik berstandar industri, Edotel, perpustakaan digital, serta gerakan kampus Aman, Sehat, Rindang, dan Indah (ASRI).'}
          </p>
        </div>
        <select
          aria-label={isEn ? 'Filter facility category' : 'Filter kategori fasilitas'}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-fit"
        >
          <option value="all">{isEn ? 'All Facilities' : 'Semua Fasilitas'}</option>
          <option value="laboratorium">{isEn ? 'Laboratories' : 'Laboratorium'}</option>
          <option value="bengkel">{isEn ? 'Practice Workshops' : 'Bengkel Praktik'}</option>
          <option value="produksi">{isEn ? 'Production Units / Edotel' : 'Unit Produksi / Edotel'}</option>
          <option value="perpustakaan">{isEn ? 'Library' : 'Perpustakaan'}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((fac) => (
          <article key={fac.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="aspect-4/3 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
              <ResilientImage src={fac.image_url} alt={fac.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 space-y-2">
              <div className="text-xs text-stone-500 uppercase">
                {fac.category} · {isEn ? 'Capacity' : 'Kapasitas'} {fac.capacity} · {isEn ? 'Condition' : 'Kondisi'} {fac.condition}
              </div>
              <h2 className="font-display text-xl font-semibold">{fac.name}</h2>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{fac.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="p-6 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-4">
        <Leaf className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-1" aria-hidden="true" />
        <div>
          <h2 className="font-display text-xl font-semibold">
            {isEn ? 'ASRI Campus Program (Safe, Healthy, Shady & Beautiful)' : 'Program Sekolah ASRI (Aman, Sehat, Rindang, Indah)'}
          </h2>
          <p className="text-sm text-stone-700 dark:text-slate-300 mt-1 leading-relaxed">
            {isEn
              ? 'SMK Negeri 3 Probolinggo implements sorted waste management, workshop energy efficiency, lush campus green zones, and Occupational Health & Safety (K3) standards across every learning space.'
              : 'SMK Negeri 3 Probolinggo menerapkan pengelolaan sampah terpilah, efisiensi energi bengkel praktik, ruang terbuka hijau kampus, dan standar keselamatan kerja (K3) di seluruh area pembelajaran.'}
          </p>
        </div>
      </div>
    </div>
  );
};
