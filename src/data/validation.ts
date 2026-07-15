/**
 * Zod schemas mirroring the v2 JSON data contract interfaces in types.ts.
 * Used by TypeScript consumers; scripts/validate-data.cjs mirrors these checks at build time.
 */

import { z } from 'zod';

const instructionsSchema = z.record(z.string(), z.string());

const ctaLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const businessSchema = z.object({
  _instructions: instructionsSchema,
  name: z.string().min(1),
  legal_name: z.string().optional(),
  tagline: z.string().min(1),
  phones: z.array(z.string().min(1)).min(1),
  emails: z.array(z.string().min(1)).min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1),
    full: z.string().min(1),
  }),
  hours: z
    .array(
      z.object({
        days: z.string().min(1),
        time: z.string().min(1),
      }),
    )
    .min(1),
  license: z.string().min(1),
  insurance: z.string().min(1),
  payment_methods: z.array(z.string().min(1)).min(1),
  free_estimate: z.string().min(1),
  years_experience: z.string().min(1),
  service_area: z.string().min(1),
  type_of_services: z.string().min(1),
  founded_year: z.string().optional(),
  social: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
    google_business: z.string().optional(),
    linkedin: z.string().optional(),
    x: z.string().optional(),
  }),
  services_offered: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
      }),
    )
    .min(1),
});

export const siteSchema = z.object({
  _instructions: instructionsSchema,
  url: z.string().min(1),
  lang: z.string().min(1),
  region: z.string().min(1),
  timezone: z.string().optional(),
  logo: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  favicon: z.object({
    src: z.string().min(1),
    apple_touch_icon: z.string().optional(),
  }),
  seo: z.object({
    title_separator: z.string().min(1),
    default_title: z.string().min(1),
    default_description: z.string().min(1),
    default_image: z.string().min(1),
    twitter_handle: z.string().optional(),
    og_type: z.enum(['website', 'business.business']),
  }),
  theme: z.object({
    primary: z.string().min(1),
    accent: z.string().min(1),
    dark: z.string().min(1),
    light: z.string().min(1),
    body_font: z.string().min(1),
    heading_font: z.string().min(1),
  }),
  features: z.object({
    enable_blog: z.boolean(),
    enable_landings: z.boolean(),
    enable_gallery: z.boolean(),
    enable_testimonials: z.boolean(),
    enable_faq: z.boolean(),
    enable_areas: z.boolean(),
    enable_directories: z.boolean(),
  }),
  analytics: z
    .object({
      gtag_id: z.string().optional(),
      gtm_id: z.string().optional(),
    })
    .optional(),
  header_variant: z.string().optional(),
  footer_variant: z.string().optional(),
});

const navLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  description: z.string().optional(),
});

export const navigationSchema = z.object({
  _instructions: instructionsSchema,
  header: z
    .array(
      navLinkSchema.extend({
        children: z.array(navLinkSchema).optional(),
      }),
    )
    .min(1),
  footer: z
    .array(
      z.object({
        title: z.string().min(1),
        links: z.array(navLinkSchema).min(1),
      }),
    )
    .min(1),
  mobile: z.object({
    cta_label: z.string().min(1),
    cta_href: z.string().min(1),
  }),
  legal: z.array(navLinkSchema).min(1),
});

export const heroSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  slides: z
    .array(
      z.object({
        image: z.string().min(1),
        image_alt: z.string().min(1),
        overlay: z.enum(['dark', 'primary', 'accent', 'none']).optional(),
        tagline: z.string().min(1),
        headline: z.string().min(1),
        text: z.string().min(1),
        cta_primary: ctaLinkSchema,
        cta_secondary: ctaLinkSchema.optional(),
      }),
    )
    .min(1),
});

export const servicesSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().min(1),
  services: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        slug: z.string().min(1),
        short_description: z.string().min(1),
        full_description: z.string().min(1),
        image: z.string().min(1),
        icon: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        faq: z
          .array(
            z.object({
              q: z.string().min(1),
              a: z.string().min(1),
            }),
          )
          .optional(),
      }),
    )
    .min(1),
});

export const gallerySchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().optional(),
  categories: z.array(z.string().min(1)).min(1),
  items: z
    .array(
      z.object({
        image: z.string().min(1),
        image_alt: z.string().min(1),
        title: z.string().min(1),
        category: z.string().min(1),
        location: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1),
});

export const testimonialsSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().optional(),
  testimonials: z
    .array(
      z.object({
        name: z.string().min(1),
        location: z.string().min(1),
        service: z.string().min(1),
        stars: z.number().min(1).max(5),
        quote: z.string().min(1),
        avatar: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .min(1),
});

export const faqSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().optional(),
  faqs: z
    .array(
      z.object({
        q: z.string().min(1),
        a: z.string().min(1),
        category: z.string().optional(),
      }),
    )
    .min(1),
});

export const areasSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().optional(),
  primary_city: z.string().min(1),
  service_radius: z.string().optional(),
  areas: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        county: z.string().optional(),
        state: z.string().min(1),
        zip_codes: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export const directoriesSchema = z.object({
  _instructions: instructionsSchema,
  variant: z.string().optional(),
  section_title: z.string().min(1),
  section_subtitle: z.string().optional(),
  directories: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        icon: z.string().optional(),
        initials: z.string().optional(),
        badge_image: z.string().optional(),
      }),
    )
    .min(1),
});

export const blogSchema = z.object({
  _instructions: instructionsSchema,
  default_author: z.string().min(1),
  default_category: z.string().min(1),
  posts: z.array(
    z.object({
      slug: z.string().min(1),
      headline: z.string().min(1),
      meta_title: z.string().optional(),
      description: z.string().min(1),
      excerpt: z.string().min(1),
      content: z.string().min(1),
      image: z.string().min(1),
      image_alt: z.string().optional(),
      date: z.string().min(1),
      updated: z.string().optional(),
      author: z.string().min(1),
      category: z.string().min(1),
      tags: z.array(z.string()).optional(),
      reading_time: z.string().min(1),
      published: z.boolean(),
    }),
  ),
});

export const landingsSchema = z.object({
  _instructions: instructionsSchema,
  landing_pages: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      service_id: z.string().min(1),
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      hero: z.object({
        headline: z.string().min(1),
        paragraph: z.string().min(1),
        image: z.string().min(1),
        image_alt: z.string().optional(),
      }),
      sections: z
        .array(
          z.object({
            headline: z.string().min(1),
            paragraphs: z.array(z.string().min(1)).min(1),
            image: z.string().min(1),
            image_alt: z.string().optional(),
          }),
        )
        .min(1),
      cta: z.object({
        headline: z.string().min(1),
        button_label: z.string().min(1),
      }),
    }),
  ),
});

/** Map of required contract filename → Zod schema. */
export const dataSchemas = {
  'business.json': businessSchema,
  'site.json': siteSchema,
  'navigation.json': navigationSchema,
  'hero.json': heroSchema,
  'services.json': servicesSchema,
  'gallery.json': gallerySchema,
  'testimonials.json': testimonialsSchema,
  'faq.json': faqSchema,
  'areas.json': areasSchema,
  'directories.json': directoriesSchema,
  'blog.json': blogSchema,
  'landings.json': landingsSchema,
} as const;

export type DataFileName = keyof typeof dataSchemas;
