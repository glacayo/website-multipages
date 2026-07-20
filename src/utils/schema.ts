/**
 * Build typed Schema.org JSON-LD graphs from business/site JSON (no per-page duplication).
 */
import type {
  BlogPosting,
  BreadcrumbList,
  DayOfWeek,
  FAQPage,
  HomeAndConstructionBusiness,
  OpeningHoursSpecification,
  PostalAddress,
  Service as SchemaService,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import type { BlogPost, Service } from '../data/types';
import {
  getBusiness,
  getFAQ,
  getSite,
  getTestimonials,
} from '../data/loaders';
import { imageToAbsolute } from './images';
import { absoluteUrl } from './seo';

export type PageType =
  | 'home'
  | 'about'
  | 'services'
  | 'service'
  | 'gallery'
  | 'blog'
  | 'post'
  | 'contact'
  | 'faq'
  | 'legal'
  | 'other';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface BuildSchemasOptions {
  pageType: PageType;
  path: string;
  /** Page title for WebPage name (optional). */
  pageTitle?: string;
  /** Page description for WebPage (optional). */
  pageDescription?: string;
  service?: Service;
  post?: BlogPost;
  breadcrumbs?: BreadcrumbItem[];
  /** Force FAQPage inclusion (e.g. home with FAQ section). */
  includeFaq?: boolean;
}

const DAY_ALIASES: Record<string, string> = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
  sun: 'Sunday',
  sunday: 'Sunday',
};

const ORDERED_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

function to24h(time: string): string | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function expandDayRange(days: string): string[] {
  const cleaned = days.trim();
  if (!cleaned || /^closed$/i.test(cleaned)) return [];

  if (cleaned.includes('-')) {
    const [startRaw, endRaw] = cleaned.split('-').map((part) => part.trim().toLowerCase());
    const start = DAY_ALIASES[startRaw];
    const end = DAY_ALIASES[endRaw];
    if (!start || !end) return [];
    const startIdx = ORDERED_DAYS.indexOf(start as (typeof ORDERED_DAYS)[number]);
    const endIdx = ORDERED_DAYS.indexOf(end as (typeof ORDERED_DAYS)[number]);
    if (startIdx < 0 || endIdx < 0) return [];
    if (startIdx <= endIdx) return [...ORDERED_DAYS.slice(startIdx, endIdx + 1)];
    return [...ORDERED_DAYS.slice(startIdx), ...ORDERED_DAYS.slice(0, endIdx + 1)];
  }

  const single = DAY_ALIASES[cleaned.toLowerCase()];
  return single ? [single] : [];
}

function buildOpeningHours(): OpeningHoursSpecification[] {
  const business = getBusiness();
  const specs: OpeningHoursSpecification[] = [];

  for (const entry of business.hours) {
    if (/closed/i.test(entry.time)) continue;
    const days = expandDayRange(entry.days);
    if (!days.length) continue;

    const [openRaw, closeRaw] = entry.time.split('-').map((part) => part.trim());
    const opens = openRaw ? to24h(openRaw) : null;
    const closes = closeRaw ? to24h(closeRaw) : null;
    if (!opens || !closes) continue;

    specs.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days as DayOfWeek[],
      opens,
      closes,
    });
  }

  return specs;
}

function socialSameAs(): string[] {
  const social = getBusiness().social;
  return Object.values(social).filter((url): url is string => Boolean(url));
}

function postalAddress(): PostalAddress {
  const { address } = getBusiness();
  return {
    '@type': 'PostalAddress',
    streetAddress: address.street,
    addressLocality: address.city,
    addressRegion: address.state,
    postalCode: address.zip,
    addressCountry: address.country || 'US',
  };
}

function isValidCoordinatePair(
  coordinates: { latitude?: string; longitude?: string } | undefined,
): coordinates is { latitude: string; longitude: string } {
  if (!coordinates) return false;
  const lat = coordinates.latitude?.trim();
  const lng = coordinates.longitude?.trim();
  if (!lat || !lng) return false;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return false;
  return true;
}

function buildLocalBusiness(): WithContext<HomeAndConstructionBusiness> {
  const business = getBusiness();
  const site = getSite();
  const testimonials = getTestimonials().testimonials;
  const openingHours = buildOpeningHours();
  const sameAs = socialSameAs();

  const node: WithContext<HomeAndConstructionBusiness> = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${absoluteUrl('/')}#localbusiness`,
    name: business.name,
    description: site.seo.default_description,
    url: absoluteUrl('/'),
    telephone: toE164(business.phones[0] ?? ''),
    email: business.emails[0],
    address: postalAddress(),
    image: absoluteUrl(site.seo.default_image),
    priceRange: '$$',
    paymentAccepted: business.payment_methods.join(', '),
    areaServed: business.service_area,
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const ratings = testimonials
    .map((t) => t.stars)
    .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5);
  if (ratings.length > 0) {
    const avg = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avg.toFixed(2),
      reviewCount: ratings.length,
    };
  }

  if (isValidCoordinatePair(business.coordinates)) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude,
    };
  }

  return node;
}

function buildWebSite(): WithContext<WebSite> {
  const business = getBusiness();
  const site = getSite();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: business.name,
    url: absoluteUrl('/'),
    description: site.seo.default_description,
    publisher: { '@id': `${absoluteUrl('/')}#localbusiness` },
    inLanguage: site.lang || 'en-US',
  };
}

function buildWebPage(options: BuildSchemasOptions): WithContext<WebPage> {
  const site = getSite();
  const path = options.path.startsWith('/') ? options.path : `/${options.path}`;
  const url = absoluteUrl(path === '' ? '/' : path);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: options.pageTitle ?? site.seo.default_title,
    description: options.pageDescription ?? site.seo.default_description,
    isPartOf: { '@id': `${absoluteUrl('/')}#website` },
    about: { '@id': `${absoluteUrl('/')}#localbusiness` },
    inLanguage: site.lang || 'en-US',
  };
}

function buildBreadcrumbList(items: BreadcrumbItem[]): WithContext<BreadcrumbList> | null {
  if (!items.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function defaultBreadcrumbs(pageType: PageType, path: string, options: BuildSchemasOptions): BreadcrumbItem[] {
  if (options.breadcrumbs?.length) return options.breadcrumbs;

  const crumbs: BreadcrumbItem[] = [{ name: 'Home', path: '/' }];

  switch (pageType) {
    case 'about':
      crumbs.push({ name: 'About Us', path: '/about-us' });
      break;
    case 'services':
      crumbs.push({ name: 'Services', path: '/services' });
      break;
    case 'service':
      crumbs.push({ name: 'Services', path: '/services' });
      crumbs.push({
        name: options.service?.name ?? 'Service',
        path: path.startsWith('/') ? path : `/${path}`,
      });
      break;
    case 'gallery':
      crumbs.push({ name: 'Gallery', path: '/gallery' });
      break;
    case 'blog':
      crumbs.push({ name: 'Blog', path: '/blog' });
      break;
    case 'post':
      crumbs.push({ name: 'Blog', path: '/blog' });
      crumbs.push({
        name: options.post?.headline ?? 'Article',
        path: path.startsWith('/') ? path : `/${path}`,
      });
      break;
    case 'contact':
      crumbs.push({ name: 'Contact Us', path: '/contact-us' });
      break;
    case 'faq':
      crumbs.push({ name: 'FAQ', path: path.startsWith('/') ? path : `/${path}` });
      break;
    default:
      break;
  }

  return crumbs.length > 1 ? crumbs : [];
}

function buildServiceSchema(service: Service): WithContext<SchemaService> {
  const business = getBusiness();
  const image =
    typeof service.image === 'string' && service.image.trim()
      ? imageToAbsolute(service.image.trim())
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    serviceType: service.name,
    description: service.short_description || service.full_description,
    url: absoluteUrl(`/services/${service.slug}`),
    ...(image ? { image } : {}),
    provider: {
      '@type': 'HomeAndConstructionBusiness',
      name: business.name,
      '@id': `${absoluteUrl('/')}#localbusiness`,
    },
    areaServed: business.service_area,
  };
}

function buildBlogPosting(post: BlogPost): WithContext<BlogPosting> {
  const business = getBusiness();
  const site = getSite();
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.image
    ? absoluteUrl(post.image.replace(/^\.\//, '/').replace(/^images\//, '/images/'))
    : absoluteUrl(site.seo.default_image);

  // Prefer public OG path for schema when asset path is internal
  const imageUrl = post.image.startsWith('./images/') || post.image.startsWith('images/')
    ? absoluteUrl(site.seo.default_image)
    : image.startsWith('http')
      ? image
      : absoluteUrl(site.seo.default_image);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    description: post.description || post.excerpt,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    mainEntityOfPage: url,
    author: {
      '@type': 'Organization',
      name: post.author || business.name,
    },
    publisher: {
      '@type': 'Organization',
      name: business.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(site.logo.src),
      },
    },
  };
}

function buildFaqPage(): WithContext<FAQPage> | null {
  const faqs = getFAQ().faqs;
  if (!faqs.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

/**
 * Return typed JSON-LD entities for the current page.
 * Home always emits LocalBusiness + WebSite; other types add Service / BlogPosting / FAQPage as needed.
 */
export function buildSchemas(options: BuildSchemasOptions): WithContext<Thing>[] {
  const site = getSite();
  const schemas: WithContext<Thing>[] = [];
  const path = options.path || '/';

  // Local business + website on every page so NAP is always available to crawlers.
  schemas.push(buildLocalBusiness());
  schemas.push(buildWebSite());
  schemas.push(buildWebPage(options));

  const crumbs = defaultBreadcrumbs(options.pageType, path, options);
  const breadcrumb = buildBreadcrumbList(crumbs);
  if (breadcrumb) schemas.push(breadcrumb);

  if (options.pageType === 'service' && options.service) {
    schemas.push(buildServiceSchema(options.service));
  }

  if (options.pageType === 'post' && options.post) {
    schemas.push(buildBlogPosting(options.post));
  }

  const includeFaq =
    options.includeFaq === true ||
    options.pageType === 'faq' ||
    (options.pageType === 'home' && site.features.enable_faq);

  if (includeFaq) {
    const faq = buildFaqPage();
    if (faq) schemas.push(faq);
  }

  return schemas;
}
