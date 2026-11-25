import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Search,
  Shield,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { formatIndonesianDate, formatNumberLocale, pickLang } from '../utils/portalLogic';
import type { DocumentItem, ServiceDefinition, SurveyDefinition } from '../shared/types';

export const DigitalServicesPage: React.FC = () => {
  const { lang } = usePortal();
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<'ajukan' | 'lacak' | 'pengaduan'>('ajukan');

  // Service Request Form
  const [serviceId, setServiceId] = useState<number>(1);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantRole, setApplicantRole] = useState('Peserta Didik');
  const [details, setDetails] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketReceipt, setTicketReceipt] = useState<{
    ticket_number: string;
    tracking_code: string;
    service_name: string;
    status: string;
  } | null>(null);

  // Tracking Form
  const [trackTicket, setTrackTicket] = useState('');
  const [trackCode, setTrackCode] = useState('');
  const [trackedResult, setTrackedResult] = useState<{
    ticket_number: string;
    service_name: string;
    status: string;
    staff_note: string;
    satisfaction_rating: number | null;
    updated_at: string;
  } | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Complaint Form
  const [compName, setCompName] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compCat, setCompCat] = useState('Layanan Sekolah');
  const [compSubject, setCompSubject] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compReceipt, setCompReceipt] = useState<{ ticket_number: string; tracking_code: string } | null>(null);
  const [compError, setCompError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setServices(d);
          setServiceId(d[0].id);
        }
      });
    if (window.location.hash === '#pengaduan') {
      setActiveTab('pengaduan');
    }
  }, []);

  const isEn = lang === 'en';
  const selectedService = services.find((s) => s.id === Number(serviceId));

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('service_id', String(serviceId));
      formData.append('applicant_name', applicantName);
      formData.append('applicant_email', applicantEmail);
      formData.append('applicant_phone', applicantPhone);
      formData.append('applicant_role', applicantRole);
      formData.append('details', details);
      if (file) formData.append('attachment', file);

      const res = await fetch('/api/service-requests', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEn ? 'Failed to submit service request.' : 'Gagal mengajukan permohonan.'));
      setTicketReceipt(data);
      setTrackTicket(data.ticket_number);
      setTrackCode(data.tracking_code);
      setApplicantName('');
      setApplicantEmail('');
      setApplicantPhone('');
      setDetails('');
      setFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : (isEn ? 'Failed to send request.' : 'Gagal mengirim permohonan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedResult(null);
    setRatingSuccess(false);
    try {
      const res = await fetch('/api/service-requests/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_number: trackTicket, tracking_code: trackCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEn ? 'Ticket not found.' : 'Tiket tidak ditemukan.'));
      setTrackedResult(data);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : (isEn ? 'Failed to track ticket.' : 'Gagal melacak tiket.'));
    }
  };

  const handleRateService = async (rating: number) => {
    if (!trackedResult) return;
    const res = await fetch(`/api/service-requests/${trackedResult.ticket_number}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_code: trackCode, rating }),
    });
    if (res.ok) {
      setTrackedResult({ ...trackedResult, satisfaction_rating: rating });
      setRatingSuccess(true);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompError(null);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name: compName,
          reporter_contact: compContact,
          category: compCat,
          subject: compSubject,
          description: compDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEn ? 'Failed to submit report.' : 'Gagal mengirim pengaduan.'));
      setCompReceipt(data);
      setCompName('');
      setCompContact('');
      setCompSubject('');
      setCompDesc('');
    } catch (err) {
      setCompError(err instanceof Error ? err.message : (isEn ? 'Failed to submit report.' : 'Gagal mengirim pengaduan.'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 space-y-4">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Integrated Administrative Services' : 'Pelayanan Administrasi Terpadu'}
        </div>
        <h1 className="font-display text-4xl font-semibold">
          {isEn ? 'Digital Administrative Services & Public Complaints' : 'Layanan Administrasi Digital & Pengaduan'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-300 max-w-2xl">
          {isEn
            ? 'Submit online requests for official school letters, diploma legalization, alumni records, public information, or community feedback with verified ticket tracking.'
            : 'Ajukan permohonan surat keterangan, legalisasi ijazah, dokumen alumni, permohonan informasi publik, atau pengaduan masyarakat secara daring dengan pelacakan tiket terverifikasi.'}
        </p>
        <div className="flex flex-wrap gap-1 p-1 bg-stone-100 dark:bg-slate-900 rounded-lg w-fit">
          {(
            [
              ['ajukan', isEn ? 'Request Service' : 'Ajukan Layanan Administrasi'],
              ['lacak', isEn ? 'Track Ticket Status' : 'Lacak Status Tiket'],
              ['pengaduan', isEn ? 'Public Complaint Channel' : 'Kanal Pengaduan Masyarakat'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              className={`px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === k ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-xs' : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'ajukan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Service Information & SOP' : 'Informasi & SOP Layanan'}
            </h2>
            {selectedService ? (
              <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div>
                  <div className="text-xs text-[#1E3A8A] dark:text-blue-400 font-semibold">
                    {isEn ? 'Estimated Processing SLA' : 'Estimasi Penyelesaian'}: {selectedService.estimated_sla}
                  </div>
                  <h3 className="font-display text-xl font-semibold mt-1">
                    {pickLang(lang, selectedService.name_id, selectedService.name_en)}
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                    {selectedService.description_id}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {isEn ? 'Document Requirements' : 'Persyaratan Dokumen'}
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-stone-700 dark:text-slate-300 list-disc pl-5">
                    {selectedService.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3 border-t border-stone-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {isEn ? 'SOP Workflow' : 'Alur SOP'}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">{selectedService.sop_summary}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmitRequest} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h2 className="font-display text-2xl font-semibold">
                {isEn ? 'Online Request Form' : 'Formulir Permohonan Online'}
              </h2>
              {submitError && (
                <div role="alert" className="p-3 rounded bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  {submitError}
                </div>
              )}
              {ticketReceipt && (
                <div role="status" className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>{isEn ? 'Request Successfully Registered' : 'Permohonan Berhasil Diregistrasi'}</span>
                  </div>
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div>
                      {isEn ? 'Ticket Number' : 'Nomor Tiket'}: <strong className="font-mono-tabular">{ticketReceipt.ticket_number}</strong>
                    </div>
                    <div>
                      {isEn ? 'Verification Code' : 'Kode Verifikasi Pelacakan'}: <strong className="font-mono-tabular">{ticketReceipt.tracking_code}</strong>
                    </div>
                    <p>
                      {isEn
                        ? 'Save your ticket number and verification code to track the progress of your request.'
                        : 'Simpan nomor tiket dan kode verifikasi tersebut untuk memantau progres permohonan Anda.'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="req-service" className="block text-xs font-medium mb-1">
                  {isEn ? 'Service Type' : 'Jenis Layanan'}
                </label>
                <select
                  id="req-service"
                  value={serviceId}
                  onChange={(e) => setServiceId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-900">
                      {pickLang(lang, s.name_id, s.name_en)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="req-name" className="block text-xs font-medium mb-1">
                    {isEn ? 'Applicant Full Name' : 'Nama Lengkap Pemohon'}
                  </label>
                  <input
                    id="req-name"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder={isEn ? 'Name as on official ID' : 'Nama sesuai identitas'}
                    className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="req-role" className="block text-xs font-medium mb-1">
                    {isEn ? 'Applicant Status' : 'Status Pemohon'}
                  </label>
                  <select
                    id="req-role"
                    value={applicantRole}
                    onChange={(e) => setApplicantRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                  >
                    <option value="Peserta Didik" className="dark:bg-slate-900">{isEn ? 'Student' : 'Peserta Didik'}</option>
                    <option value="Alumni" className="dark:bg-slate-900">Alumni</option>
                    <option value="Orang Tua / Wali" className="dark:bg-slate-900">{isEn ? 'Parent / Guardian' : 'Orang Tua / Wali'}</option>
                    <option value="Masyarakat / Instansi" className="dark:bg-slate-900">{isEn ? 'Public / Institution' : 'Masyarakat / Instansi'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="req-email" className="block text-xs font-medium mb-1">
                    {isEn ? 'Active Email' : 'Email Aktif'}
                  </label>
                  <input
                    id="req-email"
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder={isEn ? 'name@example.org' : 'nama@contoh.id'}
                    className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="req-phone" className="block text-xs font-medium mb-1">
                    {isEn ? 'Phone / WhatsApp Number' : 'Nomor Telepon / WhatsApp'}
                  </label>
                  <input
                    id="req-phone"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="req-details" className="block text-xs font-medium mb-1">
                  {isEn
                    ? 'Purpose Details & Supporting ID (NISN / Graduation Year)'
                    : 'Rincian Keperluan & Identitas Pendukung (NISN / Tahun Lulus)'}
                </label>
                <textarea
                  id="req-details"
                  required
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Describe the requested document/purpose and include your NISN or graduation year...'
                      : 'Jelaskan keperluan surat/dokumen dan cantumkan NISN atau tahun kelulusan...'
                  }
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label htmlFor="req-file" className="block text-xs font-medium mb-1">
                  {isEn ? 'Optional Supporting Attachment (PDF/JPG/PNG, max 5MB)' : 'Lampiran Pendukung Opsional (PDF/JPG/PNG, maks 5MB)'}
                </label>
                <input
                  id="req-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 dark:text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {submitting
                  ? (isEn ? 'Submitting Request...' : 'Mengirim Permohonan...')
                  : (isEn ? 'Submit Service Request' : 'Kirim Permohonan Layanan')}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'lacak' && (
        <div className="max-w-2xl space-y-6">
          <form onSubmit={handleTrackSubmit} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Service Ticket Tracking' : 'Pelacakan Status Tiket Layanan'}
            </h2>
            <p className="text-xs text-stone-500">
              {isEn
                ? 'Under Personal Data Protection Law (UU No. 27/2022), tracking requires both your Ticket Number and Verification Code.'
                : 'Demi pelindungan data pribadi (UU No. 27/2022), pelacakan mewajibkan kombinasi Nomor Tiket dan Kode Verifikasi.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trk-num" className="block text-xs font-medium mb-1">
                  {isEn ? 'Ticket Number' : 'Nomor Tiket'}
                </label>
                <input
                  id="trk-num"
                  required
                  value={trackTicket}
                  onChange={(e) => setTrackTicket(e.target.value)}
                  placeholder="REQ-YYYYMMDD-XXXX"
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="trk-code" className="block text-xs font-medium mb-1">
                  {isEn ? 'Verification Code' : 'Kode Verifikasi'}
                </label>
                <input
                  id="trk-code"
                  required
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder={isEn ? '6-character code' : '6 karakter kode'}
                  className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
                />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>{isEn ? 'Check Request Status' : 'Cek Status Permohonan'}</span>
            </button>
          </form>

          {trackError && (
            <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
              {trackError}
            </div>
          )}

          {trackedResult && (
            <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono-tabular text-stone-500">{trackedResult.ticket_number}</div>
                  <h3 className="font-display text-xl font-semibold">{trackedResult.service_name}</h3>
                </div>
                <div className="px-3 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs font-semibold uppercase">
                  {trackedResult.status.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="text-xs text-stone-500">
                {isEn ? 'Last Updated' : 'Pembaruan Terakhir'}: {formatIndonesianDate(trackedResult.updated_at, lang)}
              </div>
              {trackedResult.staff_note && (
                <div className="p-3 rounded bg-stone-50 dark:bg-slate-800 text-xs">
                  <strong>{isEn ? 'Staff Note' : 'Catatan Petugas'}:</strong> {trackedResult.staff_note}
                </div>
              )}
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-medium">{isEn ? 'Rate This Service:' : 'Beri Penilaian Pelayanan:'}</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRateService(star)}
                      className={`px-3 py-1 rounded border text-xs font-mono-tabular ${
                        trackedResult.satisfaction_rating === star
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                          : 'border-stone-300 dark:border-slate-700'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
                {ratingSuccess && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    {isEn ? 'Thank you for your feedback.' : 'Terima kasih atas penilaian Anda.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pengaduan' && (
        <div id="pengaduan" className="max-w-2xl">
          <form onSubmit={handleSubmitComplaint} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Official Public Complaint Channel' : 'Kanal Pengaduan Masyarakat Resmi'}
            </h2>
            <p className="text-xs text-stone-500">
              {isEn
                ? 'Submit responsible reports or feedback regarding educational services and public information transparency. Reporter identity is protected.'
                : 'Sampaikan laporan atau masukan terkait pelayanan pendidikan dan keterbukaan informasi secara bertanggung jawab. Identitas pelapor dilindungi.'}
            </p>
            {compError && <div className="p-3 rounded bg-red-50 text-xs text-red-700">{compError}</div>}
            {compReceipt && (
              <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs space-y-1">
                <div className="font-semibold">{isEn ? 'Your Report Has Been Recorded' : 'Pengaduan Anda Telah Dicatat'}</div>
                <div>
                  {isEn ? 'Ticket Number' : 'Nomor Tiket'}: <strong className="font-mono-tabular">{compReceipt.ticket_number}</strong> · {isEn ? 'Code' : 'Kode'}: <strong className="font-mono-tabular">{compReceipt.tracking_code}</strong>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cmp-name" className="block text-xs font-medium mb-1">
                  {isEn ? 'Reporter Name' : 'Nama Pelapor'}
                </label>
                <input id="cmp-name" required value={compName} onChange={(e) => setCompName(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label htmlFor="cmp-contact" className="block text-xs font-medium mb-1">
                  {isEn ? 'Contact (Email / Phone)' : 'Kontak (Email / HP)'}
                </label>
                <input id="cmp-contact" required value={compContact} onChange={(e) => setCompContact(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
              </div>
            </div>
            <div>
              <label htmlFor="cmp-cat" className="block text-xs font-medium mb-1">
                {isEn ? 'Complaint Category' : 'Kategori Pengaduan'}
              </label>
              <select id="cmp-cat" value={compCat} onChange={(e) => setCompCat(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent">
                <option value="Layanan Sekolah" className="dark:bg-slate-900">{isEn ? 'School Services' : 'Layanan Sekolah'}</option>
                <option value="Sarana Prasarana" className="dark:bg-slate-900">{isEn ? 'Campus Facilities' : 'Sarana Prasarana'}</option>
                <option value="Informasi Publik" className="dark:bg-slate-900">{isEn ? 'Public Information (PPID)' : 'Informasi Publik (PPID)'}</option>
                <option value="SPMB" className="dark:bg-slate-900">{isEn ? 'Admissions (SPMB)' : 'SPMB'}</option>
              </select>
            </div>
            <div>
              <label htmlFor="cmp-subj" className="block text-xs font-medium mb-1">
                {isEn ? 'Subject' : 'Subjek Pengaduan'}
              </label>
              <input id="cmp-subj" required value={compSubject} onChange={(e) => setCompSubject(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            </div>
            <div>
              <label htmlFor="cmp-desc" className="block text-xs font-medium mb-1">
                {isEn ? 'Details' : 'Uraian Pengaduan'}
              </label>
              <textarea id="cmp-desc" required rows={4} value={compDesc} onChange={(e) => setCompDesc(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold">
              {isEn ? 'Submit Report' : 'Kirim Pengaduan'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export const PublicInfoPage: React.FC = () => {
  const { settings, lang } = usePortal();
  const isEn = lang === 'en';
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [group, setGroup] = useState<string>('all');

  useEffect(() => {
    fetch(`/api/documents?ppid_group=${group}`)
      .then((r) => r.json())
      .then((d) => setDocs(Array.isArray(d) ? d : []));
  }, [group]);

  const groups = [
    ['all', isEn ? 'All Public Registers' : 'Semua DIP Publik'],
    ['berkala', isEn ? 'Periodic Info' : 'Informasi Berkala'],
    ['serta_merta', isEn ? 'Immediate Info' : 'Informasi Serta-Merta'],
    ['setiap_saat', isEn ? 'On-Demand Info' : 'Informasi Setiap Saat'],
    ['sop', isEn ? 'Service Standards & SOP' : 'Standar & SOP Pelayanan'],
    ['mutu', isEn ? 'Quality Documents' : 'Dokumen Mutu'],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-stone-500">
            {isEn ? 'Law No. 14/2008 (KIP) & Perki No. 1/2021' : 'UU No. 14/2008 & Perki No. 1/2021'}
          </div>
          <h1 className="font-display text-4xl font-semibold">
            {isEn ? 'Public Information Disclosure (PPID)' : 'Keterbukaan Informasi Publik (PPID)'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {isEn
              ? 'Publishes officially approved Public documents within school authority. Internal records and student personal data remain separately protected.'
              : 'Menampilkan dokumen berstatus Publik yang telah memperoleh persetujuan publikasi resmi sesuai kewenangan sekolah. Dokumen internal dan data pribadi peserta didik dilindungi terpisah.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/layanan-digital" className="px-4 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
            {isEn ? 'Request Information' : 'Ajukan Permohonan Informasi'}
          </Link>
          <Link to="/layanan-digital#pengaduan" className="px-4 py-2.5 rounded-md border border-stone-300 dark:border-slate-700 text-sm font-medium">
            {isEn ? 'Complaint Channel' : 'Kanal Pengaduan'}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-stone-100 dark:bg-slate-900 rounded-lg w-fit">
        {groups.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setGroup(k)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              group === k ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-xs' : 'text-stone-600 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {docs.length === 0 ? (
          <div className="p-8 rounded-lg border border-stone-200 dark:border-slate-800 text-center text-sm text-stone-500">
            {isEn ? 'No public documents available in this category yet.' : 'Belum ada dokumen publik pada kategori ini.'}
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-stone-500 uppercase">
                  {doc.ppid_group.replace(/_/g, ' ')} · {isEn ? 'Classification' : 'Klasifikasi'} {doc.classification} · {isEn ? 'Version' : 'Versi'} {doc.version} · {formatIndonesianDate(doc.published_at, lang)}
                </div>
                <h2 className="font-semibold text-base text-stone-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <span>{doc.title}</span>
                </h2>
              </div>
              <a
                href={doc.file_url}
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-medium shrink-0 w-fit"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? 'Download' : 'Unduh'} ({doc.file_size_kb} KB)</span>
              </a>
            </div>
          ))
        )}
      </div>

      <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <div className="font-semibold">
              {isEn ? 'Authorized PPID Coordination' : 'Koordinasi PPID Berwenang'}
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5">
              {isEn
                ? `${settings?.school_name} coordinates with the East Java Provincial Education Office PPID for cross-jurisdiction information requests.`
                : `${settings?.school_name} berkoordinasi dengan PPID Dinas Pendidikan Provinsi Jawa Timur untuk layanan informasi lintas kewenangan.`}
            </p>
          </div>
        </div>
        <a
          href="https://ppid.jatimprov.go.id"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline shrink-0"
        >
          <span>{isEn ? 'East Java Provincial PPID' : 'PPID Provinsi Jatim'}</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
};

export const QualityAssurancePage: React.FC = () => {
  const { lang } = usePortal();
  const isEn = lang === 'en';
  const [surveys, setSurveys] = useState<SurveyDefinition[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<number>(1);
  const [group, setGroup] = useState('umum');
  const [rInfo, setRInfo] = useState(5);
  const [rServ, setRServ] = useState(5);
  const [rFac, setRFac] = useState(4);
  const [rTrans, setRTrans] = useState(5);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const loadSurveys = () => {
    fetch('/api/surveys')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setSurveys(d);
        }
      });
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/surveys/${selectedSurvey}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondent_group: group,
        rating_informasi: rInfo,
        rating_pelayanan: rServ,
        rating_fasilitas: rFac,
        rating_transparansi: rTrans,
        feedback_note: note,
      }),
    });
    if (res.ok) {
      setSubmitted(true);
      setNote('');
      loadSurveys();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 space-y-2 max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Internal Quality Assurance (SPMI) & Performance Review' : 'SPMI & Penilaian Kinerja'}
        </div>
        <h1 className="font-display text-4xl font-semibold">
          {isEn ? 'Quality Assurance & Satisfaction Surveys' : 'Penjaminan Mutu & Survei Kepuasan'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {isEn
            ? 'Publication of internal quality assurance programs, school evaluation summaries, principal performance reviews (PKKS), and aggregate satisfaction surveys without revealing respondent identities.'
            : 'Publikasi program penjaminan mutu internal, ringkasan evaluasi sekolah, PKKS, serta survei kepuasan agregat tanpa mengungkap identitas responden.'}
        </p>
      </div>

      {/* Aggregate Results Cards + Live Bar Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {surveys.map((sv) => {
          const aspects = sv.aspect_averages || { informasi: 0, pelayanan: 0, fasilitas: 0, transparansi: 0 };
          return (
            <div key={sv.id} className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <div className="text-xs uppercase text-stone-500">
                  {isEn ? 'Target Group' : 'Sasaran'}: {sv.target_audience.replace('_', ' ')}
                </div>
                <h2 className="font-display text-lg font-semibold mt-1">{sv.title}</h2>
              </div>
              <div className="flex items-baseline justify-between border-y border-stone-100 dark:border-slate-800 py-3">
                <div>
                  <span className="font-mono-tabular text-3xl font-semibold text-[#1E3A8A] dark:text-blue-400">
                    {sv.avg_rating?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-xs text-stone-500"> / 5.00</span>
                </div>
                <div className="text-xs font-mono-tabular text-stone-500">
                  {formatNumberLocale(sv.response_count || 0, lang)} {isEn ? 'respondents' : 'responden'}
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {(
                  [
                    [isEn ? 'Information Clarity' : 'Kejelasan Informasi', aspects.informasi],
                    [isEn ? 'Service Speed' : 'Kecepatan Pelayanan', aspects.pelayanan],
                    [isEn ? 'Facility Quality' : 'Mutu Fasilitas', aspects.fasilitas],
                    [isEn ? 'Transparency' : 'Transparansi', aspects.transparansi],
                  ] as const
                ).map(([label, score]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{label}</span>
                      <span className="font-mono-tabular font-medium">{score.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-[#1E3A8A] dark:bg-blue-500"
                        style={{ width: `${Math.min(100, (score / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Survey Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold">
              {isEn ? 'Submit School Service Satisfaction Survey' : 'Isi Survei Kepuasan Layanan Sekolah'}
            </h2>
          </div>
          {submitted && (
            <div role="status" className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-200">
              {isEn
                ? 'Thank you! Your response has been saved and immediately updates the aggregate summary above.'
                : 'Terima kasih! Partisipasi Anda telah tersimpan dan langsung memperbarui rekap agregat di atas.'}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sv-select" className="block text-xs font-medium mb-1">
                {isEn ? 'Survey Instrument' : 'Instrumen Survei'}
              </label>
              <select
                id="sv-select"
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
              >
                {surveys.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sv-group" className="block text-xs font-medium mb-1">
                {isEn ? 'Respondent Group' : 'Kelompok Responden'}
              </label>
              <select
                id="sv-group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
              >
                <option value="umum" className="dark:bg-slate-900">{isEn ? 'General Public' : 'Masyarakat Umum'}</option>
                <option value="siswa" className="dark:bg-slate-900">{isEn ? 'Students' : 'Peserta Didik'}</option>
                <option value="orang_tua" className="dark:bg-slate-900">{isEn ? 'Parents / Guardians' : 'Orang Tua / Wali'}</option>
                <option value="mitra_industri" className="dark:bg-slate-900">{isEn ? 'Industry Partners' : 'Mitra Dunia Industri'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [isEn ? 'Information (1-5)' : 'Informasi (1-5)', rInfo, setRInfo],
              [isEn ? 'Service (1-5)' : 'Pelayanan (1-5)', rServ, setRServ],
              [isEn ? 'Facilities (1-5)' : 'Fasilitas (1-5)', rFac, setRFac],
              [isEn ? 'Transparency (1-5)' : 'Transparansi (1-5)', rTrans, setRTrans],
            ].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="block text-xs font-medium mb-1">{label as string}</label>
                <select
                  value={val as number}
                  onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent font-mono-tabular"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n} className="dark:bg-slate-900">{n}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="sv-note" className="block text-xs font-medium mb-1">
              {isEn ? 'Quality Improvement Suggestions (Optional)' : 'Saran Peningkatan Mutu (Opsional)'}
            </label>
            <textarea
              id="sv-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isEn ? 'Write your constructive feedback...' : 'Tuliskan masukan konstruktif Anda...'}
              className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold">
            {isEn ? 'Submit Survey Response' : 'Kirim Respons Survei'}
          </button>
        </form>

        <div className="lg:col-span-5 p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {isEn ? 'Evaluation & Follow-Up Summary (SPMI & PKKS)' : 'Ringkasan Evaluasi & Tindak Lanjut (SPMI & PKKS)'}
          </h2>
          <ul className="space-y-3 text-sm text-stone-700 dark:text-slate-300">
            <li className="pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="font-semibold">
                {isEn ? 'Principal Performance Assessment (PKKS)' : 'Penilaian Kinerja Kepala Sekolah (PKKS)'}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {isEn
                  ? 'Preparatory documentation, managerial supervision, and school entrepreneurship reviews compiled annually with supervisory inspectors.'
                  : 'Dokumentasi persiapan, supervisi manajerial, dan kewirausahaan sekolah disusun tiap tahun ajaran bersama pengawas pembina.'}
              </div>
            </li>
            <li className="pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="font-semibold">
                {isEn ? 'Quality Follow-Up Action Plan' : 'Rencana Tindak Lanjut Mutu'}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {isEn
                  ? 'Expanding BNSP/LSP competency certification coverage and upgrading practice workshop equipment for Hospitality and Culinary Arts.'
                  : 'Peningkatan rasio sertifikasi kompetensi BNSP/LSP dan pembaruan peralatan praktik bengkel perhotelan serta tata boga.'}
              </div>
            </li>
            <li>
              <Link to="/informasi-publik" className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline">
                {isEn ? 'View Public Quality Documents in PPID →' : 'Lihat Dokumen Mutu Publik pada Halaman PPID →'}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { settings, lang } = usePortal();
  const isEn = lang === 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSent(null);
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_name: name, sender_email: email, subject, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || (isEn ? 'Failed to send message.' : 'Gagal mengirim pesan.'));
    } else {
      setSent(isEn ? 'Your message has been sent to the school administration office.' : data.message);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 space-y-2 max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Get In Touch' : 'Hubungi Kami'}
        </div>
        <h1 className="font-display text-4xl font-semibold">
          {isEn ? 'Official Contact & Campus Location' : 'Kontak & Lokasi Resmi'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {isEn
            ? `Official communication channels for Administration, Public Relations, PPID, and the BKK Career Center at ${settings?.school_name}.`
            : `Saluran komunikasi resmi Tata Usaha, Humas, PPID, dan Unit BKK ${settings?.school_name}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">{isEn ? 'Campus Address' : 'Alamat Kampus'}</div>
                <div className="text-stone-600 dark:text-slate-300 mt-0.5">{settings?.address}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">{isEn ? 'Official Email & Phone' : 'Email & Telepon Resmi'}</div>
                <div className="text-stone-600 dark:text-slate-300 mt-0.5">{settings?.email}</div>
                <div className="text-stone-600 dark:text-slate-300">{settings?.phone}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 dark:border-slate-800 overflow-hidden">
            <iframe
              title={isEn ? 'School Location Map' : 'Peta Lokasi Sekolah'}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=113.2056%2C-7.7649%2C113.2256%2C-7.7489&layer=mapnik&marker=${settings?.map_lat || -7.7569}%2C${settings?.map_lng || 113.2156}`}
              className="w-full h-64 border-0"
              loading="lazy"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            {isEn ? 'Send a Message to Administration' : 'Kirim Pesan ke Tata Usaha'}
          </h2>
          {err && <div className="p-3 rounded bg-red-50 text-xs text-red-700">{err}</div>}
          {sent && <div className="p-3 rounded bg-emerald-50 text-xs text-emerald-800">{sent}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cnt-name" className="block text-xs font-medium mb-1">
                {isEn ? 'Full Name' : 'Nama Lengkap'}
              </label>
              <input id="cnt-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            </div>
            <div>
              <label htmlFor="cnt-email" className="block text-xs font-medium mb-1">Email</label>
              <input id="cnt-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
            </div>
          </div>
          <div>
            <label htmlFor="cnt-subj" className="block text-xs font-medium mb-1">{isEn ? 'Subject' : 'Subjek'}</label>
            <input id="cnt-subj" required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label htmlFor="cnt-msg" className="block text-xs font-medium mb-1">{isEn ? 'Message' : 'Pesan'}</label>
            <textarea id="cnt-msg" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-slate-700 bg-transparent" />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-md bg-[#1E3A8A] text-white text-sm font-semibold">
            {isEn ? 'Send Message' : 'Kirim Pesan'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const SitemapDocsPage: React.FC = () => {
  const { lang } = usePortal();
  const isEn = lang === 'en';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="border-b border-stone-200 dark:border-slate-800 pb-6 space-y-2">
        <div className="text-xs uppercase tracking-widest text-stone-500">
          {isEn ? 'Navigation, Compliance & Documentation' : 'Navigasi, Kepatuhan & Dokumentasi'}
        </div>
        <h1 className="font-display text-4xl font-semibold">
          {isEn ? 'Sitemap, Privacy Policy & System Architecture' : 'Peta Situs, Kebijakan Privasi & Arsitektur Sistem'}
        </h1>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-semibold">{isEn ? 'Home & School Profile' : 'Halaman Utama & Profil'}</h2>
          <ul className="space-y-1 text-stone-600 dark:text-slate-300">
            <li><Link to="/" className="hover:underline">{isEn ? 'Portal Home' : 'Beranda Portal'}</Link></li>
            <li><Link to="/profil" className="hover:underline">{isEn ? 'Profile, Vision & Faculty' : 'Profil, Visi Misi & GTK'}</Link></li>
            <li><Link to="/akademik" className="hover:underline">{isEn ? 'Academics & Teaching Factory' : 'Akademik & Teaching Factory'}</Link></li>
            <li><Link to="/sarana-prasarana" className="hover:underline">{isEn ? 'Facilities & ASRI Campus' : 'Sarana, Prasarana & Sekolah ASRI'}</Link></li>
          </ul>
        </div>
        <div className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-semibold">{isEn ? 'Vocational Programs & Career Center' : 'Konsentrasi Keahlian & BKK'}</h2>
          <ul className="space-y-1 text-stone-600 dark:text-slate-300">
            <li><Link to="/konsentrasi-keahlian/kuliner" className="hover:underline">{isEn ? 'Culinary Arts' : 'Kuliner'}</Link></li>
            <li><Link to="/konsentrasi-keahlian/desain-dan-produksi-busana" className="hover:underline">{isEn ? 'Fashion Design & Production' : 'Desain & Produksi Busana'}</Link></li>
            <li><Link to="/konsentrasi-keahlian/perhotelan" className="hover:underline">{isEn ? 'Hospitality' : 'Perhotelan'}</Link></li>
            <li><Link to="/konsentrasi-keahlian/tata-kecantikan-kulit-dan-rambut" className="hover:underline">{isEn ? 'Beauty & Hair Care' : 'Tata Kecantikan Kulit & Rambut'}</Link></li>
            <li><Link to="/konsentrasi-keahlian/desain-komunikasi-visual" className="hover:underline">{isEn ? 'Visual Communication Design' : 'Desain Komunikasi Visual'}</Link></li>
            <li><Link to="/humas-bkk" className="hover:underline">{isEn ? 'Public Relations, Partners & BKK' : 'Humas, Mitra DUDI & BKK'}</Link></li>
          </ul>
        </div>
        <div className="p-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <h2 className="font-semibold">{isEn ? 'Services & Public Information' : 'Layanan & Informasi Publik'}</h2>
          <ul className="space-y-1 text-stone-600 dark:text-slate-300">
            <li><Link to="/spmb" className="hover:underline">{isEn ? 'Admissions (SPMB)' : 'Informasi SPMB'}</Link></li>
            <li><Link to="/layanan-digital" className="hover:underline">{isEn ? 'Digital Administrative Services' : 'Layanan Administrasi Digital'}</Link></li>
            <li><Link to="/informasi-publik" className="hover:underline">{isEn ? 'Public Information (PPID)' : 'Keterbukaan Informasi Publik (PPID)'}</Link></li>
            <li><Link to="/penjaminan-mutu" className="hover:underline">{isEn ? 'Quality Assurance & Surveys' : 'Penjaminan Mutu & Survei'}</Link></li>
            <li><Link to="/berita" className="hover:underline">{isEn ? 'News, Events & Gallery' : 'Berita, Agenda & Galeri'}</Link></li>
            <li><Link to="/admin" className="hover:underline">{isEn ? 'CMS Admin Panel' : 'Panel Administrator CMS'}</Link></li>
          </ul>
        </div>
      </section>

      <section id="privasi" className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'Privacy Policy (Reference: Law No. 27 of 2022 on Personal Data Protection)' : 'Kebijakan Privasi (Acuan UU No. 27 Tahun 2022 tentang PDP)'}
        </h2>
        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
          {isEn
            ? 'This portal implements Privacy by Design: visitor analytics are recorded in aggregate without storing personal identities; service request and complaint tracking requires both a ticket number and verification code; and applicant document attachments are stored in a private directory isolated from public assets.'
            : 'Portal ini menerapkan prinsip Privacy by Design: analitik kunjungan dicatat secara agregat tanpa menyimpan identitas pribadi pengunjung; pelacakan permohonan layanan dan pengaduan mensyaratkan nomor tiket serta kode verifikasi; dan lampiran berkas pemohon disimpan pada direktori privat terpisah dari berkas publik.'}
        </p>
      </section>

      <section id="aksesibilitas" className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'Accessibility Statement (Reference: WCAG 2.2 Level AA)' : 'Pernyataan Aksesibilitas (Acuan WCAG 2.2 Level AA)'}
        </h2>
        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
          {isEn
            ? 'The interface is built with semantic HTML, a skip-to-main-content link, full keyboard navigation, pause controls on the homepage slider, and an accessibility toolbar with text scaling (100%–125%), high-contrast mode, and reduced-motion controls in the top utility bar.'
            : 'Antarmuka dirancang dengan HTML semantik, tautan lewati ke konten utama, navigasi papan ketik penuh, kontrol jeda pada slider beranda, serta panel pengaturan ukuran teks (100%–125%), kontras tinggi, dan pengurangan animasi di bilah utilitas atas.'}
        </p>
      </section>

      <section id="penggunaan" className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
        <h2 className="font-display text-2xl font-semibold">{isEn ? 'Terms of Use' : 'Kebijakan Penggunaan'}</h2>
        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
          {isEn
            ? 'All approved public documents may be downloaded for educational and public oversight purposes with official attribution to SMK Negeri 3 Probolinggo.'
            : 'Seluruh informasi publik berstatus disetujui dapat diunduh untuk kepentingan pendidikan dan pengawasan masyarakat dengan mencantumkan sumber resmi SMK Negeri 3 Probolinggo.'}
        </p>
      </section>

      <section id="srs" className="p-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
        <h2 className="font-display text-2xl font-semibold">
          {isEn ? 'System Architecture & Technical Documentation (SRS, ERD & SOP)' : 'Ringkasan Arsitektur & Dokumentasi Teknis (SRS, ERD & SOP)'}
        </h2>
        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
          {isEn
            ? <>Built with a modular full-stack architecture (React + TypeScript + Tailwind CSS + Express REST API + indexed relational SQLite with migrations, seeders, 10-role RBAC, scrypt password hashing, HMAC session tokens with revocation, and JSON backups). Full technical documentation is available in <code className="font-mono-tabular">README.md</code>, <code className="font-mono-tabular">docs/PORTAL_DOCUMENTATION.md</code>, and the CMS System Docs tab.</>
            : <>Aplikasi dibangun menggunakan arsitektur full-stack modular (React + TypeScript + Tailwind CSS + Express REST API + SQLite relasional terindeks dengan migrasi, seeder, RBAC 10 peran, hashing kata sandi scrypt, token sesi ter-HMAC dengan revokasi, serta pencadangan JSON). Dokumentasi teknis lengkap tersedia pada berkas <code className="font-mono-tabular">README.md</code> dan <code className="font-mono-tabular">docs/PORTAL_DOCUMENTATION.md</code> serta tab Dokumentasi Sistem pada CMS.</>}
        </p>
      </section>
    </div>
  );
};
