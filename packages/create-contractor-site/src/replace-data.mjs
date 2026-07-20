import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {import('./prompts.mjs').ScaffoldAnswers} ScaffoldAnswers
 */

/**
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return (
    String(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'service'
  );
}

/**
 * Deduplicate primary service inputs by display name and by slug.
 * Keeps the first occurrence; later duplicates/extras that collide are dropped.
 *
 * @param {string[]} values
 * @returns {string[]}
 */
export function normalizePrimaryServices(values) {
  /** @type {string[]} */
  const result = [];
  const usedNames = new Set();
  const usedSlugs = new Set();

  for (const raw of values || []) {
    const name = String(raw || '').trim();
    if (!name) continue;

    const nameKey = name.toLowerCase();
    const slug = slugify(name);

    if (usedNames.has(nameKey) || usedSlugs.has(slug)) {
      continue;
    }

    usedNames.add(nameKey);
    usedSlugs.add(slug);
    result.push(name);
  }

  return result;
}

/**
 * Keep generated service display names unique.
 *
 * @param {string} value
 * @param {Set<string>} used
 * @returns {string}
 */
export function uniqueServiceName(value, used) {
  const base = String(value || 'Service').trim() || 'Service';
  let candidate = base;
  let suffix = 2;

  if (used.has(candidate.toLowerCase())) {
    candidate = `${base} Services`;
  }

  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} Services ${suffix}`;
    suffix += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Keep service slugs unique (for appended rows only; template slugs stay stable
 * unless an append would collide).
 *
 * @param {string} value
 * @param {Set<string>} used
 * @returns {string}
 */
export function uniqueServiceSlug(value, used) {
  const base = slugify(value);
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

/**
 * Parse a free-text service area string into city/area display names.
 * Splits on commas and " and " connectors (e.g. "A, B, C and D").
 *
 * @param {string} serviceArea
 * @returns {string[]}
 */
export function parseServiceAreaNames(serviceArea) {
  return String(serviceArea || '')
    .split(/[,;\/\n&]+/)
    .flatMap((part) => part.split(/\s+and\s+/i))
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Build a unique ordered list of service-area names.
 * - `city` is always first when provided
 * - remaining names come from parsing `serviceArea`
 * - deduped by display name and slug (first wins)
 *
 * @param {string} city
 * @param {string} serviceArea
 * @returns {string[]}
 */
export function normalizeServiceAreaNames(city, serviceArea) {
  /** @type {string[]} */
  const raw = [];
  const primary = String(city || '').trim();
  if (primary) raw.push(primary);
  raw.push(...parseServiceAreaNames(serviceArea));
  return normalizePrimaryServices(raw);
}

/**
 * Rebuild areas.areas rows from normalized city/area names.
 * - Reuses existing row shapes when name/slug matches
 * - Guarantees unique slugs
 * - Primary city (index 0) gets answers.zip when provided
 *
 * @param {{ name?: string, slug?: string, county?: string, state?: string, zip_codes?: string[], [key: string]: unknown }[]} existingAreas
 * @param {string[]} areaNames
 * @param {{ city: string, state: string, zip?: string }} ctx
 * @returns {Record<string, unknown>[]}
 */
export function buildAlignedAreas(existingAreas, areaNames, ctx) {
  const normalized =
    areaNames.length > 0
      ? normalizePrimaryServices(areaNames)
      : normalizePrimaryServices([ctx.city].filter(Boolean));

  const existing = Array.isArray(existingAreas) ? [...existingAreas] : [];
  /** @type {Map<string, Record<string, unknown>>} */
  const byName = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const bySlug = new Map();

  for (const row of existing) {
    if (!row || typeof row !== 'object') continue;
    const nameKey = String(row.name || '')
      .trim()
      .toLowerCase();
    const slugKey = String(row.slug || slugify(String(row.name || ''))).toLowerCase();
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
    if (slugKey && !bySlug.has(slugKey)) bySlug.set(slugKey, row);
  }

  const templateRow = existing[existing.length - 1] ?? {
    county: '',
    state: ctx.state,
    zip_codes: [],
  };

  const sourceNames =
    normalized.length > 0
      ? normalized
      : existing.map((row) => String(row.name || 'Area')).filter(Boolean);

  const fallbackName = String(ctx.city || 'Service Area').trim() || 'Service Area';
  const names = sourceNames.length > 0 ? sourceNames : [fallbackName];

  /** @type {Set<string>} */
  const usedSlugs = new Set();

  return names.map((rawName, index) => {
    const name = String(rawName || fallbackName).trim() || fallbackName;
    const nameKey = name.toLowerCase();
    const preferredSlug = slugify(name);
    const matchedSource = byName.get(nameKey) || bySlug.get(preferredSlug);
    const source = matchedSource || templateRow;

    const slug = uniqueServiceSlug(name, usedSlugs);
    const isPrimary = index === 0;

    /** @type {Record<string, unknown>} */
    const row = {
      ...source,
      name,
      slug,
      state: ctx.state || source.state || '',
      county: matchedSource?.county || name,
    };

    if (isPrimary && ctx.zip) {
      row.zip_codes = [ctx.zip];
    } else if (matchedSource && Array.isArray(matchedSource.zip_codes)) {
      row.zip_codes = matchedSource.zip_codes;
    } else {
      row.zip_codes = [];
    }

    return row;
  });
}

/**
 * Build aligned service rows for business.services_offered and services.json.
 * - Generates exactly the normalized client service list
 * - Dedupes input by name + slug before applying
 * - Ensures final display names and slugs are unique
 * - Reuses template row shape/defaults while allowing client-specific array length
 *
 * @param {{ name?: string, slug?: string, id?: string, [key: string]: unknown }[]} existingServices
 * @param {string[]} primaryServices
 * @param {{ businessName: string, serviceArea: string }} ctx
 * @returns {{
 *   services: Record<string, unknown>[],
 *   offered: { name: string, slug: string }[],
 * }}
 */
export function buildAlignedServices(existingServices, primaryServices, ctx) {
  const normalized = normalizePrimaryServices(primaryServices);
  const existing = Array.isArray(existingServices) ? [...existingServices] : [];

  const templateRow = existing[existing.length - 1] ?? {
    short_description: 'Professional contractor services.',
    full_description: 'Professional contractor services.',
    image: './images/services/masonry.jpg',
    icon: 'hammer',
    highlights: ['Quality work'],
  };

  const sourceNames = normalized.length > 0 ? normalized : existing.map((row) => String(row.name || 'Service'));

  /** @type {Record<string, unknown>[]} */
  const rows = sourceNames.map((rawName, index) => {
    const source = existing[index] || templateRow;
    const name = String(rawName || source.name || 'Service');
    return {
      ...source,
      name,
      short_description: `${name} services tailored to your project.`,
      full_description: `Professional ${name.toLowerCase()} services from ${ctx.businessName} serving ${ctx.serviceArea}.`,
      highlights: Array.isArray(source.highlights) && source.highlights.length > 0
        ? source.highlights
        : [name],
    };
  });

  // Uniquify display names across the final list.
  const usedNames = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    const prevName = String(rows[i].name || 'Service');
    const name = uniqueServiceName(prevName, usedNames);
    if (name !== prevName) {
      rows[i] = {
        ...rows[i],
        name,
        short_description: `${name} services tailored to your project.`,
        full_description: `Professional ${name.toLowerCase()} services from ${ctx.businessName} serving ${ctx.serviceArea}.`,
      };
    }
  }

  // Slugs follow final service names so generated routes, navigation and landings align.
  const usedSlugs = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    const slug = uniqueServiceSlug(String(rows[i].name || 'service'), usedSlugs);

    rows[i] = {
      ...rows[i],
      slug,
      id: slug,
    };
  }

  const offered = rows.map((row) => ({
    name: String(row.name),
    slug: String(row.slug),
  }));

  return { services: rows, offered };
}

/**
 * Read JSON, apply mutator, write back with stable formatting.
 * Never touches the source template — caller must pass target paths only.
 *
 * @param {string} filePath
 * @param {(data: any) => void} mutator
 */
function updateJsonFile(filePath, mutator) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  mutator(data);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * @param {{ name: string, slug: string }[]} services
 * @returns {{ label: string, href: string }[]}
 */
function serviceLinks(services) {
  return services.map((service) => ({
    label: service.name,
    href: `/services/${service.slug}`,
  }));
}

/**
 * @param {string} value
 * @returns {string}
 */
function lowerFirst(value) {
  const text = String(value || '').trim();
  if (!text) return 'service';
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/**
 * Value-only replacement in target `src/data/*.json`.
 * Preserves keys, array lengths/shape (except additive service rows), variants, and `_instructions`.
 *
 * Service names/slugs stay aligned between business.services_offered and services.json.
 *
 * @param {string} targetDir
 * @param {ScaffoldAnswers} answers
 */
export function replaceTargetData(targetDir, answers) {
  const dataDir = path.join(targetDir, 'src', 'data');
  const fullAddress = `${answers.street}, ${answers.city}, ${answers.state} ${answers.zip}`;
  const normalizedServices = normalizePrimaryServices(answers.primaryServices);
  const typeOfServices = normalizedServices.join(', ');

  /** @type {{ services: Record<string, unknown>[], offered: { name: string, slug: string }[] } | null} */
  let aligned = null;

  updateJsonFile(path.join(dataDir, 'services.json'), (servicesData) => {
    const existing = Array.isArray(servicesData.services)
      ? servicesData.services
      : [];
    aligned = buildAlignedServices(existing, normalizedServices, {
      businessName: answers.businessName,
      serviceArea: answers.serviceArea,
    });
    servicesData.services = aligned.services;
  });

  updateJsonFile(path.join(dataDir, 'business.json'), (business) => {
    business.name = answers.businessName;
    business.legal_name = answers.legalName;
    business.tagline = answers.tagline;
    business.phones = [answers.phone];
    business.emails = [answers.email];
    business.address = {
      ...business.address,
      street: answers.street,
      city: answers.city,
      state: answers.state,
      zip: answers.zip,
      full: fullAddress,
    };
    business.service_area = answers.serviceArea;
    business.founded_year = answers.foundedYear;
    business.type_of_services = typeOfServices;

    if (aligned) {
      business.services_offered = aligned.offered.map((row) => ({ ...row }));
    }
  });

  updateJsonFile(path.join(dataDir, 'site.json'), (site) => {
    if (answers.siteUrl) {
      site.url = answers.siteUrl.replace(/\/$/, '');
    }
    site.logo = {
      ...site.logo,
      alt: answers.businessName,
    };
    site.seo = {
      ...site.seo,
      default_title: `${answers.businessName} | ${answers.city}, ${answers.state}`,
      default_description: `${answers.tagline} Serving ${answers.serviceArea}.`,
    };
  });

  updateJsonFile(path.join(dataDir, 'areas.json'), (areas) => {
    // Preserve _instructions, variant, section_title, and any other top-level keys.
    areas.primary_city = answers.city;
    areas.service_radius = `Within the ${answers.serviceArea} area`;
    areas.section_subtitle = `Proudly serving homeowners and businesses in ${answers.serviceArea}.`;

    const areaNames = normalizeServiceAreaNames(answers.city, answers.serviceArea);
    const existing = Array.isArray(areas.areas) ? areas.areas : [];
    areas.areas = buildAlignedAreas(existing, areaNames, {
      city: answers.city,
      state: answers.state,
      zip: answers.zip,
    });
  });

  if (aligned) {
    updateJsonFile(path.join(dataDir, 'navigation.json'), (navigation) => {
      const links = serviceLinks(aligned.offered);

      if (Array.isArray(navigation.header)) {
        const servicesItem = navigation.header.find((item) => item?.href === '/services');
        if (servicesItem) {
          servicesItem.children = links.map((link) => ({ ...link }));
        }
      }

      if (Array.isArray(navigation.footer)) {
        const servicesColumn = navigation.footer.find((column) => column?.title === 'Services');
        if (servicesColumn) {
          servicesColumn.links = links.map((link) => ({ ...link }));
        }
      }
    });

    updateJsonFile(path.join(dataDir, 'landings.json'), (landings) => {
      const existing = Array.isArray(landings.landing_pages)
        ? landings.landing_pages
        : [];

      landings.landing_pages = existing
        .slice(0, aligned.offered.length)
        .map((page, index) => {
          const service = aligned.offered[index];
          if (!service) return page;

          return {
            ...page,
            name: service.name,
            slug: service.slug,
            service_id: service.slug,
            meta_title: `${service.name} Contractor in ${answers.city}, ${answers.state} | ${answers.businessName}`,
            meta_description: `Professional ${lowerFirst(service.name)} services in ${answers.serviceArea}.`,
            hero: {
              ...page.hero,
              headline: `${service.name} Services Built Around Your Project`,
              paragraph: `Get professional ${lowerFirst(service.name)} services from ${answers.businessName} serving ${answers.serviceArea}.`,
              image_alt: `${service.name} project by ${answers.businessName}`,
            },
            cta: {
              ...page.cta,
              headline: `Ready for a free ${lowerFirst(service.name)} estimate?`,
            },
          };
        });
    });
  }
}
