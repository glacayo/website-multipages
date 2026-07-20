/**
 * TypeScript interfaces for the v2.1.1 JSON data contract.
 * One interface per file under src/data/. Shape is stable across clients — only values change.
 */

export interface InstructionsBlock {
  [key: string]: string;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  full: string;
}

export interface BusinessHours {
  days: string;
  time: string;
}

export interface BusinessSocial {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  google_business?: string;
  linkedin?: string;
  x?: string;
}

export interface ServiceOffered {
  name: string;
  slug: string;
}

/** Optional placeholder geo coordinates for schema.org GeoCoordinates (fake/example only). */
export interface Coordinates {
  latitude: string;
  longitude: string;
}

export interface Business {
  _instructions: InstructionsBlock;
  name: string;
  legal_name?: string;
  tagline: string;
  phones: string[];
  emails: string[];
  address: BusinessAddress;
  /** Optional; omit or leave invalid to skip geo in JSON-LD. */
  coordinates?: Coordinates;
  hours: BusinessHours[];
  license: string;
  insurance: string;
  payment_methods: string[];
  free_estimate: string;
  years_experience: string;
  service_area: string;
  type_of_services: string;
  founded_year?: string;
  social: BusinessSocial;
  services_offered: ServiceOffered[];
}

export interface SiteLogo {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface SiteFavicon {
  src: string;
  apple_touch_icon?: string;
}

export interface SiteSeo {
  title_separator: string;
  default_title: string;
  default_description: string;
  default_image: string;
  twitter_handle?: string;
  og_type: 'website' | 'business.business';
}

export interface SiteTheme {
  primary: string;
  accent: string;
  dark: string;
  light: string;
  body_font: string;
  heading_font: string;
}

export interface SiteFeatures {
  enable_blog: boolean;
  enable_landings: boolean;
  enable_gallery: boolean;
  enable_testimonials: boolean;
  enable_faq: boolean;
  enable_areas: boolean;
  enable_directories: boolean;
}

export interface SiteAnalytics {
  gtag_id?: string;
  gtm_id?: string;
}

export interface Site {
  _instructions: InstructionsBlock;
  url: string;
  lang: string;
  region: string;
  timezone?: string;
  logo: SiteLogo;
  favicon: SiteFavicon;
  seo: SiteSeo;
  theme: SiteTheme;
  features: SiteFeatures;
  analytics?: SiteAnalytics;
  /** Header dispatcher variant: default | centered | transparent | minimal. */
  header_variant?: string;
  /** Footer dispatcher variant: default | dark | compact | multi-column. */
  footer_variant?: string;
}

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavLink[];
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface Navigation {
  _instructions: InstructionsBlock;
  header: NavItem[];
  footer: FooterColumn[];
  mobile: {
    cta_label: string;
    cta_href: string;
  };
  legal: NavLink[];
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroSlide {
  image: string;
  image_alt: string;
  overlay?: 'dark' | 'primary' | 'accent' | 'none';
  tagline: string;
  headline: string;
  text: string;
  cta_primary: CtaLink;
  cta_secondary?: CtaLink;
}

export interface HeroData {
  _instructions: InstructionsBlock;
  /** Hero dispatcher variant (default: one). */
  variant?: string;
  slides: HeroSlide[];
}

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  image: string;
  icon?: string;
  highlights?: string[];
  faq?: ServiceFaq[];
}

export interface ServicesData {
  _instructions: InstructionsBlock;
  /** Services dispatcher variant (default: grid). */
  variant?: string;
  section_title: string;
  section_subtitle: string;
  services: Service[];
}

export interface GalleryItem {
  image: string;
  image_alt: string;
  title: string;
  category: string;
  location?: string;
  description?: string;
}

export interface GalleryData {
  _instructions: InstructionsBlock;
  /** Gallery dispatcher variant (default: grid). */
  variant?: string;
  section_title: string;
  section_subtitle?: string;
  categories: string[];
  items: GalleryItem[];
}

export interface Testimonial {
  name: string;
  location: string;
  service: string;
  stars: number;
  quote: string;
  avatar?: string;
  date?: string;
}

export interface TestimonialsData {
  _instructions: InstructionsBlock;
  /** Testimonials dispatcher variant (default: slider). Options: slider | cards | list | grid. */
  variant?: string;
  section_title: string;
  section_subtitle?: string;
  testimonials: Testimonial[];
}

export interface FAQItem {
  q: string;
  a: string;
  category?: string;
}

export interface FAQData {
  _instructions: InstructionsBlock;
  /** FAQ dispatcher variant (default: accordion). Options: accordion | columns | compact. */
  variant?: string;
  section_title: string;
  section_subtitle?: string;
  faqs: FAQItem[];
}

export interface ServiceArea {
  name: string;
  slug?: string;
  county?: string;
  state: string;
  zip_codes?: string[];
}

export interface AreasData {
  _instructions: InstructionsBlock;
  /** CoveredAreas dispatcher variant (default: list). Options: list | map | cards | columns. */
  variant?: string;
  section_title: string;
  section_subtitle?: string;
  primary_city: string;
  service_radius?: string;
  areas: ServiceArea[];
}

export interface Directory {
  name: string;
  url: string;
  icon?: string;
  initials?: string;
  badge_image?: string;
}

export interface DirectoriesData {
  _instructions: InstructionsBlock;
  /** DirectoryBadges dispatcher variant (default: logos). Options: badges | logos | list | grid. */
  variant?: string;
  section_title: string;
  section_subtitle?: string;
  directories: Directory[];
}

export interface BlogPost {
  slug: string;
  headline: string;
  meta_title?: string;
  description: string;
  excerpt: string;
  content: string;
  image: string;
  image_alt?: string;
  date: string;
  updated?: string;
  author: string;
  category: string;
  tags?: string[];
  reading_time: string;
  published: boolean;
}

export interface BlogData {
  _instructions: InstructionsBlock;
  default_author: string;
  default_category: string;
  posts: BlogPost[];
}

export interface LandingSection {
  headline: string;
  paragraphs: string[];
  image: string;
  image_alt?: string;
}

export interface LandingPage {
  name: string;
  slug: string;
  service_id: string;
  meta_title?: string;
  meta_description?: string;
  hero: {
    headline: string;
    paragraph: string;
    image: string;
    image_alt?: string;
  };
  sections: LandingSection[];
  cta: {
    headline: string;
    button_label: string;
  };
}

export interface LandingsData {
  _instructions: InstructionsBlock;
  landing_pages: LandingPage[];
}
