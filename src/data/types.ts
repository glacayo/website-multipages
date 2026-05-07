// Company Info
export interface CompanyInfo {
  company_name: string;
  company_phone: string[];
  company_email: string[];
  company_address: string;
  company_schedule: string[];
  company_license: string;
  company_license_insurance: string;
  company_payment_method: string;
  company_estimate: string;
  company_years_experience: string;
  company_cover_area: string;
  company_type_services: string;
  company_colors: CompanyColors;
  social_media: SocialMedia;
}

export interface CompanyColors {
  primary: string;
  accent: string;
  light: string;
  dark: string;
}

export interface SocialMedia {
  facebook: string;
  google: string;
  instagram: string;
  youtube: string;
  tiktok: string;
}

// Services
export interface Service {
  name: string;
  description: string;
}

// Site Content (CONTENT.json)
export interface SiteContent {
  _instructions: {
    _readme: string;
    _client_data: string;
    _ai_copy: string;
    phrases: string;
    content_paragraphs: string;
    service_description: string;
    mission_vision_why: string;
  };
  __CLIENT_DATA__: string;
  company_name: string;
  company_phone: string[];
  company_email: string[];
  company_address: string;
  company_schedule: string[];
  company_license: string;
  company_license_insurance: string;
  company_payment_method: string;
  company_estimate: string;
  company_years_experience: string;
  company_cover_area: string;
  company_type_services: string;
  company_colors: CompanyColors;
  social_media: SocialMedia;
  services: Service[];
  __AI_COPY__: string;
  phrases: string[];
  home_content: string[];
  about_content: string[];
  company_mission: string;
  company_vision: string;
  company_why_choose_us: string;
}

// Landing Pages (LANDINGS.json)
export interface LandingHero {
  headline: string;
  paragraph: string;
  image: string;
}

export interface LandingSection {
  headline: string;
  image: string;
  paragraphs: string[];
}

export interface LandingPage {
  name: string;
  slug: string;
  hero: LandingHero;
  sections: LandingSection[];
}

export interface LandingPagesData {
  _instructions: {
    _readme: string;
    _client_data: string;
    _ai_copy: string;
    hero_headline: string;
    hero_paragraph: string;
    images: string;
    section_headline: string;
    section_paragraphs: string;
  };
  __CLIENT_DATA__: string;
  landing_pages: LandingPage[];
}

// Blog (BLOGS.json)
export interface BlogPost {
  headline: string;
  slug: string;
  content: string;
  image_filename: string;
  date: string;
  author: string;
  category: string;
  reading_time: string;
  excerpt: string;
  description: string;
  meta_title: string;
}

export interface BlogPostsData {
  _instructions: {
    _readme: string;
    _client_data: string;
    _ai_copy: string;
    headline: string;
    content: string;
    excerpt: string;
    description: string;
    meta_title: string;
    images: string;
    reading_time: string;
  };
  __CLIENT_DATA__: string;
  default_author: string;
  default_category: string;
  __AI_COPY__: string;
  posts: BlogPost[];
}

// Shared Component Prop Types
export interface SectionProps {
  title: string;
  description?: string;
  className?: string;
}

export interface CardProps {
  title: string;
  description: string;
  href?: string;
  image?: string;
}

export interface CTAProps {
  headline: string;
  buttonText: string;
  phoneNumber: string;
}