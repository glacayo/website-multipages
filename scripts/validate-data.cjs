#!/usr/bin/env node
/**
 * Build-time validator for the v2 JSON data contract.
 * Asserts: 12 required files present, valid JSON, Zod shape, unique slugs,
 * and image paths resolvable under src/assets/images/ or public/.
 */
const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const ASSETS_IMAGES = path.join(ROOT, 'src', 'assets', 'images');
const PUBLIC_DIR = path.join(ROOT, 'public');

const REQUIRED_FILES = [
  'business.json',
  'site.json',
  'navigation.json',
  'hero.json',
  'services.json',
  'gallery.json',
  'testimonials.json',
  'faq.json',
  'areas.json',
  'directories.json',
  'blog.json',
  'landings.json',
];

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg|ico)$/i;

/** Hex color: #RGB, #RRGGBB, or #RRGGBBAA. */
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected hex color (#RGB, #RRGGBB, or #RRGGBBAA)');

const instructionsSchema = z.record(z.string(), z.string());
const ctaLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
const navLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  description: z.string().optional(),
});

const schemas = {
  'business.json': z.object({
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
    coordinates: z
      .object({
        latitude: z.string().min(1),
        longitude: z.string().min(1),
      })
      .optional(),
    hours: z.array(z.object({ days: z.string().min(1), time: z.string().min(1) })).min(1),
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
    services_offered: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })).min(1),
  }),
  'site.json': z.object({
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
      // Legacy required keys stay min(1) — do not break existing client values.
      primary: z.string().min(1),
      accent: z.string().min(1),
      dark: z.string().min(1),
      light: z.string().min(1),
      body_font: z.string().min(1),
      heading_font: z.string().min(1),
      // Additive optional palette tokens (backward-compatible when omitted); hex when present.
      primary_dark: hexColor.optional(),
      muted: hexColor.optional(),
      surface: hexColor.optional(),
      border: hexColor.optional(),
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
  }),
  'navigation.json': z.object({
    _instructions: instructionsSchema,
    header: z
      .array(navLinkSchema.extend({ children: z.array(navLinkSchema).optional() }))
      .min(1),
    footer: z
      .array(z.object({ title: z.string().min(1), links: z.array(navLinkSchema).min(1) }))
      .min(1),
    mobile: z.object({ cta_label: z.string().min(1), cta_href: z.string().min(1) }),
    legal: z.array(navLinkSchema).min(1),
  }),
  'hero.json': z.object({
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
  }),
  'services.json': z.object({
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
          faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).optional(),
        }),
      )
      .min(1),
  }),
  'gallery.json': z.object({
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
  }),
  'testimonials.json': z.object({
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
  }),
  'faq.json': z.object({
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
  }),
  'areas.json': z.object({
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
  }),
  'directories.json': z.object({
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
  }),
  'blog.json': z.object({
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
  }),
  'landings.json': z.object({
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
  }),
};

const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label}: invalid JSON — ${err.message}`);
    return null;
  }
}

function collectImagePaths(value, acc = new Set()) {
  if (typeof value === 'string') {
    if (IMAGE_EXT.test(value) && !/^https?:\/\//i.test(value)) {
      acc.add(value);
    }
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImagePaths(item, acc);
    return acc;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === '_instructions' || key === '_compat') continue;
      collectImagePaths(nested, acc);
    }
  }
  return acc;
}

/**
 * Resolve a contract image path to one or more candidate filesystem locations.
 * Content images: ./images/... → src/assets/images/...
 * Public assets: /logo.png → public/logo.png
 */
function resolveImageCandidates(imagePath) {
  const normalized = imagePath.replace(/\\/g, '/');
  const candidates = [];

  if (normalized.startsWith('./images/')) {
    candidates.push(path.join(ASSETS_IMAGES, normalized.slice('./images/'.length)));
    candidates.push(path.join(PUBLIC_DIR, 'images', normalized.slice('./images/'.length)));
  } else if (normalized.startsWith('images/')) {
    candidates.push(path.join(ASSETS_IMAGES, normalized.slice('images/'.length)));
    candidates.push(path.join(PUBLIC_DIR, 'images', normalized.slice('images/'.length)));
  } else if (normalized.startsWith('/images/')) {
    candidates.push(path.join(ASSETS_IMAGES, normalized.slice('/images/'.length)));
    candidates.push(path.join(PUBLIC_DIR, 'images', normalized.slice('/images/'.length)));
  } else if (normalized.startsWith('/')) {
    candidates.push(path.join(PUBLIC_DIR, normalized.slice(1)));
  } else {
    candidates.push(path.join(ASSETS_IMAGES, normalized));
    candidates.push(path.join(PUBLIC_DIR, normalized));
  }

  return candidates;
}

function assertUniqueSlugs(label, slugs) {
  const seen = new Map();
  for (const slug of slugs) {
    if (!slug) continue;
    if (seen.has(slug)) {
      fail(`${label}: duplicate slug "${slug}"`);
    } else {
      seen.set(slug, true);
    }
  }
}

function main() {
  console.log('validate-data: checking v2 JSON contract…');

  if (!fs.existsSync(DATA_DIR)) {
    fail(`Missing data directory: ${DATA_DIR}`);
    printAndExit();
  }

  const loaded = {};

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      fail(`Missing required data file: src/data/${file}`);
      continue;
    }

    const data = readJson(filePath, file);
    if (!data) continue;

    if (!data._instructions || typeof data._instructions !== 'object') {
      fail(`${file}: missing required _instructions object`);
    }

    const schema = schemas[file];
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const where = issue.path.length ? issue.path.join('.') : '(root)';
        fail(`${file}: ${where} — ${issue.message}`);
      }
      continue;
    }

    loaded[file] = data;
  }

  if (loaded['business.json']) {
    assertUniqueSlugs(
      'business.json services_offered',
      loaded['business.json'].services_offered.map((s) => s.slug),
    );
  }
  if (loaded['services.json']) {
    assertUniqueSlugs(
      'services.json',
      loaded['services.json'].services.map((s) => s.slug),
    );
    assertUniqueSlugs(
      'services.json ids',
      loaded['services.json'].services.map((s) => s.id),
    );
  }
  if (loaded['blog.json']) {
    assertUniqueSlugs(
      'blog.json',
      loaded['blog.json'].posts.map((p) => p.slug),
    );
  }
  if (loaded['landings.json']) {
    assertUniqueSlugs(
      'landings.json',
      loaded['landings.json'].landing_pages.map((p) => p.slug),
    );
  }
  if (loaded['areas.json']) {
    assertUniqueSlugs(
      'areas.json',
      loaded['areas.json'].areas.map((a) => a.slug).filter(Boolean),
    );
  }

  // Cross-check: services_offered slugs should exist in services.json
  if (loaded['business.json'] && loaded['services.json']) {
    const serviceSlugs = new Set(loaded['services.json'].services.map((s) => s.slug));
    for (const offered of loaded['business.json'].services_offered) {
      if (!serviceSlugs.has(offered.slug)) {
        fail(
          `business.json services_offered slug "${offered.slug}" has no matching entry in services.json`,
        );
      }
    }
  }

  // Cross-check: landing service_id should exist in services.json
  if (loaded['landings.json'] && loaded['services.json']) {
    const serviceIds = new Set(loaded['services.json'].services.map((s) => s.id));
    for (const page of loaded['landings.json'].landing_pages) {
      if (!serviceIds.has(page.service_id)) {
        fail(
          `landings.json page "${page.slug}" service_id "${page.service_id}" not found in services.json`,
        );
      }
    }
  }

  // Image path resolution across all validated contract files
  for (const [file, data] of Object.entries(loaded)) {
    const images = collectImagePaths(data);
    for (const imagePath of images) {
      const candidates = resolveImageCandidates(imagePath);
      const exists = candidates.some((candidate) => fs.existsSync(candidate));
      if (!exists) {
        fail(
          `${file}: image path not resolvable "${imagePath}" (checked: ${candidates
            .map((c) => path.relative(ROOT, c))
            .join(', ')})`,
        );
      }
    }
  }

  printAndExit();
}

function printAndExit() {
  if (errors.length > 0) {
    console.error(`\nvalidate-data FAILED with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(`validate-data: OK — ${REQUIRED_FILES.length} contract files valid.`);
  process.exit(0);
}

main();
