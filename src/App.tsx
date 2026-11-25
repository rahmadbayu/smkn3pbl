import React from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { PortalProvider, usePortal } from './context/PortalContext';
import { PortalLayout } from './components/PortalLayout';
import { HomePage } from './pages/HomePage';
import { DepartmentDetailPage, DepartmentsListPage } from './pages/DepartmentPages';
import { NewsArchivePage, NewsDetailPage } from './pages/NewsPages';
import {
  AcademicPage,
  FacilitiesPage,
  IndustryBkkPage,
  ProfilePage,
  SpmbPage,
  StudentAffairsPage,
} from './pages/InstitutionalPages';
import {
  ContactPage,
  DigitalServicesPage,
  PublicInfoPage,
  QualityAssurancePage,
  SitemapDocsPage,
} from './pages/GovernancePages';
import { AdminPortalPage } from './pages/AdminPortalPage';

const NotFoundPage: React.FC = () => {
  const { lang } = usePortal();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
      <div className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500">HTTP 404</div>
      <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-white">
        {lang === 'id' ? 'Halaman Tidak Ditemukan' : 'Page Not Found'}
      </h1>
      <p className="text-sm text-stone-600 dark:text-slate-300">
        {lang === 'id'
          ? 'Tautan yang Anda tuju tidak tersedia atau telah dipindahkan. Gunakan navigasi utama atau kembali ke beranda portal.'
          : 'The link you visited is unavailable or has been moved. Use the main navigation or return to the portal homepage.'}
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Link to="/" className="px-4 py-2 rounded-md bg-[#1E3A8A] text-white text-sm font-medium">
          {lang === 'id' ? 'Kembali ke Beranda' : 'Back to Home'}
        </Link>
        <Link to="/peta-situs" className="px-4 py-2 rounded-md border border-stone-300 dark:border-slate-700 text-sm font-medium">
          {lang === 'id' ? 'Buka Peta Situs' : 'Open Sitemap'}
        </Link>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <PortalProvider>
        <Routes>
          <Route path="/admin" element={<AdminPortalPage />} />
          <Route
            path="*"
            element={
              <PortalLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/profil" element={<ProfilePage />} />
                  <Route path="/akademik" element={<AcademicPage />} />
                  <Route path="/konsentrasi-keahlian" element={<DepartmentsListPage />} />
                  <Route path="/konsentrasi-keahlian/:slug" element={<DepartmentDetailPage />} />
                  <Route path="/kesiswaan" element={<StudentAffairsPage />} />
                  <Route path="/spmb" element={<SpmbPage />} />
                  <Route path="/humas-bkk" element={<IndustryBkkPage />} />
                  <Route path="/sarana-prasarana" element={<FacilitiesPage />} />
                  <Route path="/berita" element={<NewsArchivePage />} />
                  <Route path="/berita/:slug" element={<NewsDetailPage />} />
                  <Route path="/penjaminan-mutu" element={<QualityAssurancePage />} />
                  <Route path="/layanan-digital" element={<DigitalServicesPage />} />
                  <Route path="/informasi-publik" element={<PublicInfoPage />} />
                  <Route path="/kontak" element={<ContactPage />} />
                  <Route path="/peta-situs" element={<SitemapDocsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </PortalLayout>
            }
          />
        </Routes>
      </PortalProvider>
    </BrowserRouter>
  );
}
