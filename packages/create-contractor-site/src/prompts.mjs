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

/**
 * @typedef {{ days: string, time: string }} BusinessHourRow
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
      primaryServices,
      siteUrl: siteUrl || undefined,
    });
  } finally {
    rl.close();
  }
}

/**
 * Non-interactive answers helper for scripted verification.
 * All answer paths (interactive, --yes, CREATE_CONTRACTOR_SITE_ANSWERS_JSON) funnel here.
 *
 * Compact hours keys (hoursWeekday / hoursSaturday / hoursSunday) are accepted
 * alongside a full `hours` array — useful for CREATE_CONTRACTOR_SITE_ANSWERS_JSON.
 *
 * @param {Partial<ScaffoldAnswers> & {
 *   businessName: string,
 *   primaryServices: string[],
 *   paymentMethods?: string | string[],
 *   hoursWeekday?: string,
 *   hoursSaturday?: string,
 *   hoursSunday?: string,
 * }} overrides
 * @returns {ScaffoldAnswers}
 */
export function buildAnswers(overrides) {
  const businessName = requiredText(overrides.businessName, '');
  if (!businessName) {
    throw new Error('businessName is required');
  }

  const primaryServices = (overrides.primaryServices || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (primaryServices.length === 0) {
    throw new Error('primaryServices must include at least one service');
  }

  // Prefer full hours array when present; else compact weekday/sat/sun times.
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
    hoursInput = [
      overrides.hoursWeekday,
      overrides.hoursSaturday,
      overrides.hoursSunday,
    ];
  }

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
    // Optional/secondary: missing, blank, or whitespace → ""
    foundedYear: optionalText(overrides.foundedYear),
    paymentMethods: normalizePaymentMethods(
      /** @type {{ paymentMethods?: unknown }} */ (overrides).paymentMethods,
    ),
    hours: normalizeHours(hoursInput),
    primaryServices,
    siteUrl: overrides.siteUrl ? String(overrides.siteUrl).trim() || undefined : undefined,
  };
}
