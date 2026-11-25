import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Mail, Users } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { usePortal } from '../context/PortalContext';
import { formatIDR, formatIndonesianDate, pickLang } from '../utils/portalLogic';
import type {
  Achievement,
  Department,
  IndustryPartner,
  Post,
  StudentWork,
  TeacherStaff,
  TeachingFactoryItem,
} from '../shared/types';

export const DepartmentsListPage: React.FC = () => {
  const { lang } = usePortal();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="max-w-3xl space-y-3 border-b border-stone-200 dark:border-slate-800 pb-8">
        <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
          {lang === 'id' ? 'Program Pendidikan Vokasi' : 'Vocational Education Programs'}
        </div>
        <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-white text-balance">
          {lang === 'id' ? 'Konsentrasi Keahlian SMK Negeri 3 Probolinggo' : 'Vocational Concentrations at SMK Negeri 3 Probolinggo'}
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 leading-relaxed">
          {lang === 'id'
            ? 'Lima konsentrasi keahlian terakreditasi yang dirancang selaras dengan standar dunia usaha dan dunia industri serta Teaching Factory aktif.'
            : 'Five accredited vocational programs designed in alignment with industry standards and active Teaching Factory production units.'}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 rounded-lg bg-stone-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {departments.map((d) => (
            <article key={d.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
              <div className="aspect-16/9 border-b border-stone-200 dark:border-slate-800 overflow-hidden">
                <ResilientImage src={d.image_url} alt={pickLang(lang, d.name_id, d.name_en)} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                    {lang === 'id' ? 'Kode' : 'Code'} {d.code} · {lang === 'id' ? 'Daya Tampung SPMB' : 'Admissions Quota'} {d.quota_spmb} {lang === 'id' ? 'siswa' : 'students'} · {lang === 'id' ? 'Kepala:' : 'Head:'} {d.head_name}
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-white">
                    {pickLang(lang, d.name_id, d.name_en)}
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                    {pickLang(lang, d.profile_id, d.profile_en)}
                  </p>
                </div>
                <Link
                  to={`/konsentrasi-keahlian/${d.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                >
                  <span>
                    {lang === 'id'
                      ? 'Pelajari Kurikulum, Fasilitas & Prospek Karier'
                      : 'Explore Curriculum, Facilities & Career Prospects'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

interface DepartmentDetailPayload {
  department: Department;
  teachers: TeacherStaff[];
  partners: IndustryPartner[];
  achievements: Achievement[];
  works: StudentWork[];
  tefa: TeachingFactoryItem[];
  relatedPosts: Post[];
}

export const DepartmentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = usePortal();
  const [data, setData] = useState<DepartmentDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/departments/${slug}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((payload) => setData(payload))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-8 w-48 bg-stone-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-96 bg-stone-200 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold">
          {lang === 'id' ? 'Konsentrasi Keahlian Tidak Ditemukan' : 'Vocational Program Not Found'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-400">
          {lang === 'id'
            ? 'Halaman program keahlian yang Anda tuju tidak tersedia.'
            : 'The requested vocational program page is unavailable.'}
        </p>
        <Link to="/konsentrasi-keahlian" className="inline-block px-4 py-2 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
          {lang === 'id' ? 'Kembali ke Daftar Konsentrasi Keahlian' : 'Back to All Programs'}
        </Link>
      </div>
    );
  }

  const { department: dept, teachers, partners, achievements, works, tefa, relatedPosts } = data;
  const deptName = pickLang(lang, dept.name_id, dept.name_en);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div>
        <Link to="/konsentrasi-keahlian" className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-slate-400 hover:underline">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{lang === 'id' ? 'Semua Konsentrasi Keahlian' : 'All Vocational Programs'}</span>
        </Link>
      </div>

      {/* Hero Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
            {lang === 'id' ? `Konsentrasi Keahlian · Kode ${dept.code}` : `Vocational Program · Code ${dept.code}`}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 dark:text-white text-balance">
            {deptName}
          </h1>
          <p className="text-base text-stone-600 dark:text-slate-300 leading-relaxed">
            {pickLang(lang, dept.profile_id, dept.profile_en)}
          </p>
          <div className="pt-2 border-t border-stone-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-stone-500 dark:text-slate-400">
                {lang === 'id' ? 'Kepala Konsentrasi' : 'Program Head'}
              </div>
              <div className="font-semibold text-stone-900 dark:text-white mt-0.5">{dept.head_name}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500 dark:text-slate-400">
                {lang === 'id' ? 'Daya Tampung SPMB' : 'Admissions Quota'}
              </div>
              <div className="font-mono-tabular font-semibold text-stone-900 dark:text-white mt-0.5">
                {dept.quota_spmb} {lang === 'id' ? 'Peserta Didik' : 'Students'}
              </div>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/spmb" className="px-4 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
              {lang === 'id' ? 'Informasi Pendaftaran SPMB' : 'Admissions (SPMB) Info'}
            </Link>
            <a
              href={`mailto:${dept.head_contact}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-stone-300 dark:border-slate-700 text-sm font-medium"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span>{dept.head_contact}</span>
            </a>
          </div>
        </div>
        <div className="lg:col-span-6 rounded-lg overflow-hidden border border-stone-200 dark:border-slate-800 min-h-[320px]">
          <ResilientImage src={dept.image_url} alt={deptName} className="w-full h-full object-cover" loading="eager" />
        </div>
      </div>

      {/* Vision, Competencies, Curriculum, Career */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold">
            {lang === 'id' ? 'Visi & Tujuan Konsentrasi' : 'Program Vision & Mission'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {pickLang(lang, dept.vision_id, dept.vision_en)}
          </p>
          <h3 className="font-sans font-semibold text-sm pt-2">
            {lang === 'id' ? 'Kompetensi yang Dipelajari' : 'Core Competencies'}
          </h3>
          <ul className="space-y-2 text-sm text-stone-700 dark:text-slate-300">
            {dept.competencies.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {lang === 'id' ? 'Struktur Pembelajaran' : 'Curriculum Structure'}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-700 dark:text-slate-300 list-disc pl-5">
              {dept.curriculum_structure.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-stone-200 dark:border-slate-800 pt-4">
            <h3 className="font-sans font-semibold text-sm">
              {lang === 'id' ? 'Prospek Karier Lulusan' : 'Graduate Career Prospects'}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-700 dark:text-slate-300 list-disc pl-5">
              {dept.career_prospects.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Facilities & Teachers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold">
            {lang === 'id' ? 'Laboratorium & Bengkel Praktik' : 'Laboratories & Practice Studios'}
          </h2>
          <ul className="space-y-2 text-sm text-stone-700 dark:text-slate-300">
            {dept.facilities.map((f, i) => (
              <li key={i} className="py-1.5 border-b border-stone-100 dark:border-slate-800 last:border-0">
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
            <span>{lang === 'id' ? 'Tenaga Pengajar Kejuruan' : 'Vocational Faculty'}</span>
          </h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-stone-500">
              {lang === 'id'
                ? 'Data tenaga pengajar dikelola melalui modul GTK CMS.'
                : 'Faculty directory records are managed in the CMS.'}
            </p>
          ) : (
            <div className="space-y-3">
              {teachers.map((t) => (
                <div key={t.id} className="py-2 border-b border-stone-100 dark:border-slate-800 last:border-0">
                  <div className="font-semibold text-sm text-stone-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-stone-500 dark:text-slate-400">{t.position} · {t.education}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Partners, Teaching Factory, Works & Achievements */}
      {(partners.length > 0 || tefa.length > 0 || works.length > 0 || achievements.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="font-display text-xl font-semibold">
              {lang === 'id' ? 'Mitra Industri & Teaching Factory' : 'Industry Partners & Teaching Factory'}
            </h2>
            {partners.map((p) => (
              <div key={p.id} className="p-3 rounded border border-stone-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400">
                  <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{p.name}</span>
                </div>
                <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">{p.cooperation_field} ({p.city})</div>
              </div>
            ))}
            {tefa.map((tf) => (
              <div key={tf.id} className="p-3 rounded border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{tf.name}</div>
                  <div className="text-xs text-stone-500">{tf.description}</div>
                </div>
                <div className="font-mono-tabular text-xs font-semibold text-[#9A3412] dark:text-amber-400 shrink-0">
                  {formatIDR(tf.price_idr)}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="font-display text-xl font-semibold">
              {lang === 'id' ? 'Prestasi & Karya Siswa' : 'Achievements & Student Works'}
            </h2>
            {achievements.map((a) => (
              <div key={a.id} className="py-2 border-b border-stone-100 dark:border-slate-800">
                <div className="text-xs text-stone-500">{a.level} · {a.year}</div>
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-stone-600 dark:text-slate-300">{a.recipient_name}</div>
              </div>
            ))}
            {works.map((w) => (
              <div key={w.id} className="py-2 border-b border-stone-100 dark:border-slate-800 last:border-0">
                <div className="text-xs text-stone-500">{lang === 'id' ? 'Karya Siswa' : 'Student Work'} · {w.year}</div>
                <div className="font-semibold text-sm">{w.title}</div>
                <div className="text-xs text-stone-600 dark:text-slate-300">{w.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related News */}
      {relatedPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            {lang === 'id' ? `Berita Terkait ${deptName}` : `Related News — ${deptName}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedPosts.map((post) => (
              <Link key={post.id} to={`/berita/${post.slug}`} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400 transition-colors">
                <div className="text-xs text-stone-500">{formatIndonesianDate(post.published_at, lang)}</div>
                <div className="font-semibold text-base mt-1">{post.title}</div>
                <div className="text-xs text-stone-600 dark:text-slate-300 mt-1">{post.summary}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
