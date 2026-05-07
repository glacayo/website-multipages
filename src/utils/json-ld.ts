/**
 * JSON-LD Structured Data Generator
 * Generates LocalBusiness schema for SEO
 */
import { getSiteContent } from '../data/loaders';

export interface JsonLdBase {
  '@context': string;
  '@type': string;
}

/**
 * LocalBusiness JSON-LD schema
 */
export interface LocalBusinessJsonLd extends JsonLdBase {
  '@type': 'LocalBusiness';
  name: string;
  telephone: string;
  email?: string;
  address: {
    '@type': 'PostalAddress';
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  url?: string;
  priceRange?: string;
  openingHoursSpecification?: {
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string | string[];
    opens: string;
    closes: string;
  }[];
  image?: string;
  description?: string;
  areaServed?: string;
  serviceType?: string[];
}

/**
 * Generate LocalBusiness JSON-LD schema from CONTENT.json
 */
export function generateLocalBusinessJsonLd(): string {
  const content = getSiteContent();
  const company = content;
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';

  // Parse address
  const addressParts = company.company_address.split(',');
  const streetAddress = addressParts[0]?.trim() || '';
  const cityStateZip = addressParts.slice(1).join(',').trim();
  const [cityRegion, postalCode] = cityStateZip.split(',').map(s => s.trim());
  const [city, state] = cityRegion?.split(' ').filter(Boolean) || [];

  // Parse schedule for opening hours
  const scheduleStr = company.company_schedule?.[0] || '';
  const hoursMatch = scheduleStr.match(/(\d{1,2})(?:AM|PM)\s*-\s*(\d{1,2})(?:AM|PM)/i);
  const opens = hoursMatch ? `${hoursMatch[1].padStart(2, '0')}:00` : '07:00';
  const closes = hoursMatch ? `${hoursMatch[2].padStart(2, '0')}:00` : '22:00';

  const schema: LocalBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.company_name,
    telephone: company.company_phone?.[0] || '',
    email: company.company_email?.[0],
    address: {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality: city || '',
      addressRegion: state || 'VA',
      postalCode: postalCode || '',
      addressCountry: 'US',
    },
    url: siteUrl,
    priceRange: '$$',
    description: company.company_type_services,
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens,
      closes,
    }],
    image: '/images/logo.png',
    areaServed: company.company_cover_area,
    serviceType: company.services?.map(s => s.name) || [],
  };

  return JSON.stringify(schema);
}

/**
 * Generate WebSite JSON-LD schema for Sitelinks searchbox
 */
export function generateWebSiteJsonLd(): string {
  const content = getSiteContent();
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: content.company_name,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });
}

/**
 * Generate Organization JSON-LD schema
 */
export function generateOrganizationJsonLd(): string {
  const content = getSiteContent();
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: content.company_name,
    url: siteUrl,
    logo: '/images/logo.png',
    sameAs: [
      content.social_media?.facebook,
      content.social_media?.google,
      content.social_media?.instagram,
      content.social_media?.youtube,
      content.social_media?.tiktok,
    ].filter(Boolean),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: content.company_phone?.[0],
      contactType: 'customer service',
      availableLanguage: 'English',
    },
  });
}

/**
 * BlogPosting JSON-LD schema for individual blog posts
 */
export interface BlogPostingJsonLd extends JsonLdBase {
  '@type': 'BlogPosting';
  headline: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    '@type': 'Person';
    name: string;
  };
  publisher?: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
}

/**
 * Generate BlogPosting JSON-LD schema for a blog post
 */
export function generateBlogPostingJsonLd(post: {
  headline: string;
  slug: string;
  description: string;
  image_filename: string;
  date: string;
  author: string;
}): string {
  const content = getSiteContent();
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const imageUrl = `/images/${post.image_filename}`;

  const schema: BlogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    description: post.description,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: content.company_name,
      logo: {
        '@type': 'ImageObject',
        url: '/images/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return JSON.stringify(schema);
}