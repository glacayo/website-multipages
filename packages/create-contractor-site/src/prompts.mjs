import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/** Default free-estimate CTA when blank/omitted. */
export const DEFAULT_FREE_ESTIMATE = 'Free On-Site Estimate';
/** Default years-of-experience text when blank/omitted. */
export const DEFAULT_YEARS_EXPERIENCE = '10+';
/** Default license statement when blank/omitted. */
export const DEFAULT_LICENSE = 'Licensed & Insured';
/** Default insurance statement when blank/omitted. */
export const DEFAULT_INSURANCE =
  "Fully insured with general liability and workers' compensation.";
/** Default payment methods when blank/omitted/empty. */
export const DEFAULT_PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Credit Card',
  'Financing Available',
];
/** Default 3-row business hours (Mon–Fri / Sat / Sun). */
export const DEFAULT_HOURS = [
  { days: 'Monday - Friday', time: '7:00 AM - 6:00 PM' },
  { days: 'Saturday', time: '8:00 AM - 2:00 PM' },
  { days: 'Sunday', time: 'Closed' },
];

/** Allowed `business.social` keys (blank values omitted, never empty strings). */
export const SOCIAL_NETWORK_KEYS = [
  'facebook', 'instagram', 'youtube', 'tiktok', 'google_business', 'linkedin', 'x',
];

/**
 * @typedef {{ days: string, time: string }} BusinessHourRow
 * @typedef {{ name: string, url: string, initials?: string, icon?: string, badge_image?: string }} DirectoryRow
 *
 * @typedef {object} ScaffoldAnswers
 * @property {string} businessName
 * @property {string} legalName
 * @property {string} tagline
 * @property {string} phone
 * @property {string} email
 * @property {string} street
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} serviceArea
 * @property {string} foundedYear empty string when skipped/blank
 * @property {string} freeEstimate
 * @property {string} yearsExperience
 * @property {string} license
 * @property {string} insurance
 * @property {string[]} paymentMethods
 * @property {BusinessHourRow[]} hours always length 3
 * @property {Record<string, string>} social non-blank network keys only
 * @property {DirectoryRow[]} directories empty = none (keep template row + disable)
 * @property {boolean} enableDirectories true iff directories.length > 0
 * @property {string[]} primaryServices
 * @property {string} [siteUrl]
 */

/**
 * Trim and fall back when the value is blank-looking.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function requiredText(value, fallback) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

/**
 * Optional text field: trim; blank/whitespace → "".
 * @param {unknown} value
 * @returns {string}
 */
export function optionalText(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * CSV string or string[] → trimmed non-empty list; blank/empty → defaults (never []).
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizePaymentMethods(value) {
  /** @type {string[]} */
  let items = [];
  if (typeof value === 'string') {
    items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(value)) {
    items = value.map((s) => String(s ?? '').trim()).filter(Boolean);
  }
  return items.length > 0 ? items : [...DEFAULT_PAYMENT_METHODS];
}

/**
 * Normalize hours to the fixed 3-row `{ days, time }` shape.
 * Accepts full rows, time-only strings, or compact weekday/sat/sun fields via buildAnswers.
 * Blank/missing rows fall back to defaults — never empty array or partial shape.
 * @param {unknown} value
 * @returns {BusinessHourRow[]}
 */
export function normalizeHours(value) {
  const defaults = DEFAULT_HOURS.map((row) => ({ days: row.days, time: row.time }));
  if (!Array.isArray(value) || value.length === 0) {
    return defaults;
  }

  return defaults.map((def, index) => {
    const raw = value[index];
    if (raw == null || raw === '') {
      return { ...def };
    }
    if (typeof raw === 'string') {
      const time = raw.trim();
      return { days: def.days, time: time || def.time };
    }
    if (typeof raw === 'object') {
      const days =
        /** @type {{ days?: unknown, time?: unknown }} */ (raw).days != null
          ? String(/** @type {{ days?: unknown }} */ (raw).days).trim()
          : '';
      const time =
        /** @type {{ time?: unknown }} */ (raw).time != null
          ? String(/** @type {{ time?: unknown }} */ (raw).time).trim()
          : '';
      return {
        days: days || def.days,
        time: time || def.time,
      };
    }
    return { ...def };
  });
}

/** @param {string} name @returns {string} */
export function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.map((p) => p[0]).join('').slice(0, 3).toUpperCase();
}

/** Object map or `network=url` CSV → non-blank keys only. @param {unknown} value */
export function normalizeSocial(value) {
  /** @type {Record<string, string>} */
  const out = {};
  const allowed = new Set(SOCIAL_NETWORK_KEYS);
  if (value == null || value === '') return out;
  if (typeof value === 'string') {
    for (const part of value.split(',')) {
      const piece = part.trim();
      const eq = piece.indexOf('=');
      if (eq <= 0) continue;
      const key = piece.slice(0, eq).trim().toLowerCase().replace(/-/g, '_');
      const url = piece.slice(eq + 1).trim();
      if (allowed.has(key) && url) out[key] = url;
    }
    return out;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const key of SOCIAL_NETWORK_KEYS) {
      const raw = /** @type {Record<string, unknown>} */ (value)[key];
      if (raw == null) continue;
      const url = String(raw).trim();
      if (url) out[key] = url;
    }
  }
  return out;
}

/** Rows or `Name|url` CSV. Empty → [] (replace keeps ≥1 template row). @param {unknown} value */
export function normalizeDirectories(value) {
  /** @type {DirectoryRow[]} */
  const rows = [];
  if (value == null || value === '') return rows;
  if (typeof value === 'string') {
    for (const part of value.split(',')) {
      const piece = part.trim();
      const pipe = piece.indexOf('|');
      if (pipe <= 0) continue;
      const name = piece.slice(0, pipe).trim();
      const url = piece.slice(pipe + 1).trim();
      if (name && url) rows.push({ name, url, initials: initialsFromName(name) });
    }
    return rows;
  }
  if (!Array.isArray(value)) return rows;
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rowIn = /** @type {Record<string, unknown>} */ (item);
    const name = String(rowIn.name ?? '').trim();
    const url = String(rowIn.url ?? '').trim();
    if (!name || !url) continue;
    /** @type {DirectoryRow} */
    const row = { name, url };
    const initials = rowIn.initials != null ? String(rowIn.initials).trim() : '';
    row.initials = initials || initialsFromName(name);
    if (rowIn.icon != null && String(rowIn.icon).trim()) row.icon = String(rowIn.icon).trim();
    if (rowIn.badge_image != null && String(rowIn.badge_image).trim()) {
      row.badge_image = String(rowIn.badge_image).trim();
    }
    rows.push(row);
  }
  return rows;
}

/**
 * @param {string} label
 * @param {{ required?: boolean, defaultValue?: string }} [opts]
 * @param {import('node:readline/promises').Interface} rl
 * @returns {Promise<string>}
 */
async function ask(rl, label, opts = {}) {
  const { required = true, defaultValue = '' } = opts;
  while (true) {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    const raw = await rl.question(`${label}${hint}: `);
    const answer = raw.trim();
    if (answer) return answer;
    if (defaultValue) return defaultValue;
    if (!required) return '';
    console.log('  This field is required. Please enter a value (or Ctrl+C to abort).');
  }
}

/**
 * Collect required client fields via readline (no extra deps).
 *
 * @returns {Promise<ScaffoldAnswers>}
 */
export async function collectClientAnswers() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\nEnter client business details (required fields re-prompt if empty).\n');

    const businessName = await ask(rl, 'Business name');
    const legalName = await ask(rl, 'Legal business name', {
      defaultValue: `${businessName} LLC`,
    });
    const tagline = await ask(rl, 'Tagline');
    const phone = await ask(rl, 'Primary phone');
    const email = await ask(rl, 'Primary email');
    const street = await ask(rl, 'Street address');
    const city = await ask(rl, 'City');
    const state = await ask(rl, 'State');
    const zip = await ask(rl, 'ZIP');
    const serviceArea = await ask(rl, 'Service area description');
    const freeEstimate = await ask(rl, 'Free-estimate wording', {
      defaultValue: DEFAULT_FREE_ESTIMATE,
    });
    const yearsExperience = await ask(rl, 'Years of experience', {
      defaultValue: DEFAULT_YEARS_EXPERIENCE,
    });
    const license = await ask(rl, 'License text', {
      defaultValue: DEFAULT_LICENSE,
    });
    const insurance = await ask(rl, 'Insurance statement', {
      defaultValue: DEFAULT_INSURANCE,
    });
    const foundedYear = await ask(rl, 'Founded year (optional)', {
      required: false,
      defaultValue: '',
    });
    const paymentMethodsRaw = await ask(rl, 'Payment methods (comma-separated)', {
      defaultValue: DEFAULT_PAYMENT_METHODS.join(', '),
    });
    const hoursWeekday = await ask(rl, 'Weekday hours (Mon–Fri)', {
      defaultValue: DEFAULT_HOURS[0].time,
    });
    const hoursSaturday = await ask(rl, 'Saturday hours', {
      defaultValue: DEFAULT_HOURS[1].time,
    });
    const hoursSunday = await ask(rl, 'Sunday hours', {
      defaultValue: DEFAULT_HOURS[2].time,
    });
    const socialRaw = await ask(rl, 'Social links (network=url,…; Enter to skip)', {
      required: false,
      defaultValue: '',
    });
    const directoriesRaw = await ask(rl, 'Directories (Name|url,…; Enter to skip)', {
      required: false,
      defaultValue: '',
    });
    const servicesRaw = await ask(rl, 'Primary services (comma-separated)');
    const siteUrl = await ask(rl, 'Site URL (optional)', {
      required: false,
      defaultValue: '',
    });

    const primaryServices = servicesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (primaryServices.length === 0) {
      throw new Error('At least one primary service is required.');
    }

    return buildAnswers({
      businessName,
      legalName,
      tagline,
      phone,
      email,
      street,
      city,
      state,
      zip,
      serviceArea,
      freeEstimate,
      yearsExperience,
      license,
      insurance,
      foundedYear,
      paymentMethods: paymentMethodsRaw,
      hoursWeekday,
      hoursSaturday,
      hoursSunday,
      social: socialRaw,
      directories: directoriesRaw,
      primaryServices,
      siteUrl: siteUrl || undefined,
    });
  } finally {
    rl.close();
  }
}

/**
 * All answer paths funnel here. Hours: full rows or compact weekday/sat/sun.
 * Social: object or `network=url` CSV. Directories: rows or `Name|url` CSV.
 *
 * @param {Partial<ScaffoldAnswers> & {
 *   businessName: string,
 *   primaryServices: string[],
 *   paymentMethods?: string | string[],
 *   hoursWeekday?: string,
 *   hoursSaturday?: string,
 *   hoursSunday?: string,
 *   social?: string | Record<string, string>,
 *   directories?: string | DirectoryRow[],
 * }} overrides
 * @returns {ScaffoldAnswers}
 */
export function buildAnswers(overrides) {
  const businessName = requiredText(overrides.businessName, '');
  if (!businessName) throw new Error('businessName is required');

  const primaryServices = (overrides.primaryServices || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (primaryServices.length === 0) {
    throw new Error('primaryServices must include at least one service');
  }

  const hasCompactHours =
    overrides.hoursWeekday != null ||
    overrides.hoursSaturday != null ||
    overrides.hoursSunday != null;
  /** @type {unknown} */
  let hoursInput = overrides.hours;
  if (
    hasCompactHours &&
    (hoursInput == null || (Array.isArray(hoursInput) && hoursInput.length === 0))
  ) {
    hoursInput = [overrides.hoursWeekday, overrides.hoursSaturday, overrides.hoursSunday];
  }

  const social = normalizeSocial(/** @type {{ social?: unknown }} */ (overrides).social);
  const directories = normalizeDirectories(
    /** @type {{ directories?: unknown }} */ (overrides).directories,
  );
  // Derived from rows only: directories:[] + enableDirectories:true → false.
  const enableDirectories = directories.length > 0;

  return {
    businessName,
    legalName: requiredText(overrides.legalName, `${businessName} LLC`),
    tagline: requiredText(overrides.tagline, `Quality work from ${businessName}.`),
    phone: requiredText(overrides.phone, '(555) 555-0100'),
    email: requiredText(overrides.email, 'hello@example.com'),
    street: requiredText(overrides.street, '123 Main St'),
    city: requiredText(overrides.city, 'Example City'),
    state: requiredText(overrides.state, 'VA'),
    zip: requiredText(overrides.zip, '00000'),
    serviceArea: requiredText(
      overrides.serviceArea,
      `${requiredText(overrides.city, 'Example City')} and surrounding areas`,
    ),
    freeEstimate: requiredText(overrides.freeEstimate, DEFAULT_FREE_ESTIMATE),
    yearsExperience: requiredText(overrides.yearsExperience, DEFAULT_YEARS_EXPERIENCE),
    license: requiredText(overrides.license, DEFAULT_LICENSE),
    insurance: requiredText(overrides.insurance, DEFAULT_INSURANCE),
    foundedYear: optionalText(overrides.foundedYear),
    paymentMethods: normalizePaymentMethods(
      /** @type {{ paymentMethods?: unknown }} */ (overrides).paymentMethods,
    ),
    hours: normalizeHours(hoursInput),
    social,
    directories,
    enableDirectories,
    primaryServices,
    siteUrl: overrides.siteUrl ? String(overrides.siteUrl).trim() || undefined : undefined,
  };
}
