export type Language = 'id' | 'en';

export type PostStatus =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'revision'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export type ServiceRequestStatus =
  | 'diajukan'
  | 'diverifikasi'
  | 'diproses'
  | 'perlu_perbaikan'
  | 'selesai'
  | 'ditolak'
  | 'dibatalkan';

export type DocumentClassification = 'publik' | 'internal' | 'terbatas' | 'rahasia';

export interface SchoolSettings {
  id: number;
  school_name: string;
  school_type: string;
  city: string;
  province: string;
  slogan_id: string;
  slogan_en: string;
  address: string;
  postal_code: string;
  phone: string;
  email: string;
  website_url: string;
  principal_name: string;
  principal_title: string;
  principal_photo: string;
  principal_quote_id: string;
  principal_quote_en: string;
  principal_message_id: string;
  principal_message_en: string;
  vision_id: string;
  vision_en: string;
  mission_id: string[];
  mission_en: string[];
  accreditation: string;
  npsn: string;
  profile_video_url: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  social_instagram: string;
  social_youtube: string;
  social_facebook: string;
  social_tiktok: string;
  map_lat: number;
  map_lng: number;
  ai_enabled: boolean;
  maintenance_mode: boolean;
  stats_period: string;
  seo_default_title: string;
  seo_default_description: string;
  integrations: {
    erapor_url: string;
    dapodik_url: string;
    lms_url: string;
    library_url: string;
    bkk_url: string;
    tracer_url: string;
    ppid_url: string;
    spmb_url: string;
    workspace_enabled: boolean;
  };
  updated_at: string;
}

export interface HomepageSection {
  id: number;
  section_key: string;
  title_id: string;
  title_en: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface MenuItem {
  id: number;
  parent_id: number | null;
  label_id: string;
  label_en: string;
  href: string;
  group_name: string;
  is_external: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface Banner {
  id: number;
  title_id: string;
  title_en: string;
  subtitle_id: string;
  subtitle_en: string;
  cta_label_id: string;
  cta_label_en: string;
  cta_href: string;
  image_url: string;
  focal_point: string;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface Announcement {
  id: number;
  title_id: string;
  title_en: string;
  content_id: string;
  content_en: string;
  category: 'spmb' | 'akademik' | 'darurat' | 'umum';
  priority: 'normal' | 'tinggi' | 'darurat';
  valid_until: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  slug: string;
  code: string;
  name_id: string;
  name_en: string;
  short_desc_id: string;
  short_desc_en: string;
  profile_id: string;
  profile_en: string;
  vision_id: string;
  vision_en: string;
  competencies: string[];
  curriculum_structure: string[];
  career_prospects: string[];
  facilities: string[];
  head_name: string;
  head_contact: string;
  image_url: string;
  video_url: string;
  quota_spmb: number;
  is_published: boolean;
  sort_order: number;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  featured_image: string;
  image_alt: string;
  category_id: number | null;
  category_name?: string;
  tags: string[];
  author_id: number | null;
  author_name: string;
  editor_name: string;
  status: PostStatus;
  is_featured: boolean;
  event_date: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  seo_title: string;
  seo_description: string;
  views_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface Achievement {
  id: number;
  title: string;
  recipient_name: string;
  recipient_type: 'siswa' | 'guru' | 'lembaga';
  level: 'Kota/Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  year: number;
  organizer: string;
  department_id: number | null;
  department_name?: string;
  image_url: string;
  description: string;
  is_published: boolean;
}

export interface AgendaEvent {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string | null;
  time_range: string;
  category: string;
  is_published: boolean;
}

export interface SchoolStat {
  id: number;
  stat_key: string;
  label_id: string;
  label_en: string;
  value: number;
  unit: string;
  period: string;
  sort_order: number;
}

export interface TeacherStaff {
  id: number;
  name: string;
  nip_or_code: string;
  role_type: 'guru' | 'tendik' | 'pimpinan';
  position: string;
  department_id: number | null;
  department_name?: string;
  education: string;
  photo_url: string;
  is_published: boolean;
}

export interface Facility {
  id: number;
  name: string;
  category: 'laboratorium' | 'bengkel' | 'perpustakaan' | 'ruang_kelas' | 'olahraga' | 'produksi' | 'pendukung';
  capacity: string;
  condition: string;
  description: string;
  image_url: string;
  is_published: boolean;
}

export interface IndustryPartner {
  id: number;
  name: string;
  sector: string;
  cooperation_field: string;
  description: string;
  city: string;
  logo_text: string;
  department_id: number | null;
  since_year: number;
  is_published: boolean;
}

export interface JobVacancy {
  id: number;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  department_target: string;
  requirements: string[];
  deadline: string;
  status: 'terbuka' | 'ditutup';
  contact_info: string;
  is_published: boolean;
}

export interface AlumniStory {
  id: number;
  name: string;
  graduation_year: number;
  department_name: string;
  current_role: string;
  organization: string;
  testimonial: string;
  consent_granted: boolean;
  is_published: boolean;
}

export interface TeachingFactoryItem {
  id: number;
  name: string;
  item_type: 'produk' | 'jasa';
  department_id: number | null;
  department_name?: string;
  price_idr: number;
  unit_label: string;
  description: string;
  image_url: string;
  is_available: boolean;
}

export interface StudentWork {
  id: number;
  title: string;
  creator_names: string;
  department_id: number | null;
  department_name?: string;
  year: number;
  summary: string;
  image_url: string;
  is_published: boolean;
}

export interface GalleryItem {
  id: number;
  title: string;
  album: string;
  media_type: 'foto' | 'video';
  media_url: string;
  caption: string;
  taken_at: string;
  is_published: boolean;
}

export interface DocumentItem {
  id: number;
  title: string;
  category: string;
  classification: DocumentClassification;
  ppid_group: 'berkala' | 'serta_merta' | 'setiap_saat' | 'regulasi' | 'mutu' | 'sop' | 'spmb' | 'lainnya';
  file_url: string;
  file_size_kb: number;
  version: string;
  is_approved: boolean;
  published_at: string;
}

export interface ServiceDefinition {
  id: number;
  slug: string;
  name_id: string;
  name_en: string;
  description_id: string;
  requirements: string[];
  sop_summary: string;
  estimated_sla: string;
  is_active: boolean;
}

export interface ServiceRequest {
  id: number;
  ticket_number: string;
  tracking_code?: string;
  service_id: number;
  service_name?: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  details: string;
  attachment_url: string | null;
  status: ServiceRequestStatus;
  staff_note: string;
  satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintItem {
  id: number;
  ticket_number: string;
  reporter_name: string;
  reporter_contact: string;
  category: string;
  subject: string;
  description: string;
  status: 'diterima' | 'ditelaah' | 'ditindaklanjuti' | 'selesai';
  resolution_note: string;
  created_at: string;
}

export interface SurveyDefinition {
  id: number;
  title: string;
  target_audience: 'umum' | 'siswa' | 'orang_tua' | 'mitra_industri';
  description: string;
  is_active: boolean;
  response_count?: number;
  avg_rating?: number;
  aspect_averages?: {
    informasi: number;
    pelayanan: number;
    fasilitas: number;
    transparansi: number;
  };
}

export interface RoleDefinition {
  id: number;
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  department_id: number | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface TestimonialItem {
  id: number;
  author_name: string;
  author_role: string;
  respondent_group: 'alumni' | 'orang_tua' | 'mitra_industri' | 'peserta_didik';
  organization: string;
  quote: string;
  consent_verified: boolean;
  is_published: boolean;
}

export interface PreviewTarget {
  path: string;
  label?: string;
  draftPost?: Post;
}

