import type { SiteContent, LandingPagesData, BlogPostsData, LandingPage, BlogPost } from './types';

// Import JSON files directly
import contentData from '../../CONTENT.json';
import landingsData from '../../LANDINGS.json';
import blogsData from '../../BLOGS.json';

/**
 * Get the full site content from CONTENT.json
 */
export function getSiteContent(): SiteContent {
  return contentData as SiteContent;
}

/**
 * Get all landing pages from LANDINGS.json
 */
export function getLandingPages(): LandingPagesData {
  return landingsData as LandingPagesData;
}

/**
 * Get a single landing page by slug
 */
export function getLandingPage(slug: string): LandingPage | undefined {
  const data = getLandingPages();
  return data.landing_pages.find(page => page.slug === slug);
}

/**
 * Get all blog posts from BLOGS.json
 */
export function getBlogPosts(): BlogPostsData {
  return blogsData as BlogPostsData;
}

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string): BlogPost | undefined {
  const data = getBlogPosts();
  return data.posts.find(post => post.slug === slug);
}

/**
 * Get all services from CONTENT.json
 */
export function getServices() {
  const content = getSiteContent();
  return content.services;
}

/**
 * Get company info from CONTENT.json
 */
export function getCompanyInfo() {
  const content = getSiteContent();
  return {
    name: content.company_name,
    phone: content.company_phone,
    email: content.company_email,
    address: content.company_address,
    schedule: content.company_schedule,
    license: content.company_license,
    licenseInsurance: content.company_license_insurance,
    paymentMethod: content.company_payment_method,
    estimate: content.company_estimate,
    yearsExperience: content.company_years_experience,
    coverArea: content.company_cover_area,
    typeServices: content.company_type_services,
    colors: content.company_colors,
    socialMedia: content.social_media,
  };
}