/**
 * Typed getters for the v2 JSON data contract.
 * Components and pages should import from here — never raw JSON paths for v2 data.
 */

import type {
  AreasData,
  BlogData,
  BlogPost,
  Business,
  DirectoriesData,
  FAQData,
  GalleryData,
  HeroData,
  LandingPage,
  LandingsData,
  Navigation,
  Service,
  ServicesData,
  Site,
  TestimonialsData,
} from './types';

import { filterNavigationForSite } from '../utils/routes';

import business from './business.json';
import site from './site.json';
import navigation from './navigation.json';
import hero from './hero.json';
import services from './services.json';
import gallery from './gallery.json';
import testimonials from './testimonials.json';
import faq from './faq.json';
import areas from './areas.json';
import directories from './directories.json';
import blog from './blog.json';
import landings from './landings.json';

export function getBusiness(): Business {
  return business as Business;
}

export function getSite(): Site {
  return site as Site;
}

/** Filtered clone: drop unpublished blog/service-detail links; never mutate JSON. */
export function getNavigation(): Navigation {
  return filterNavigationForSite(navigation as Navigation, getSite());
}

export function getHero(): HeroData {
  return hero as HeroData;
}

export function getServices(): ServicesData {
  return services as ServicesData;
}

export function getService(slug: string): Service | undefined {
  return getServices().services.find((service) => service.slug === slug);
}

export function getGallery(): GalleryData {
  return gallery as GalleryData;
}

export function getTestimonials(): TestimonialsData {
  return testimonials as TestimonialsData;
}

export function getFAQ(): FAQData {
  return faq as FAQData;
}

export function getAreas(): AreasData {
  return areas as AreasData;
}

export function getDirectories(): DirectoriesData {
  return directories as DirectoriesData;
}

export function getBlog(): BlogData {
  return blog as BlogData;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlog().posts.find((post) => post.slug === slug);
}

export function getLandings(): LandingsData {
  return landings as LandingsData;
}

export function getLandingPage(slug: string): LandingPage | undefined {
  return getLandings().landing_pages.find((page) => page.slug === slug);
}

/**
 * Published blog posts only (for listing/routes).
 */
export function getPublishedBlogPosts(): BlogPost[] {
  return getBlog().posts.filter((post) => post.published);
}
