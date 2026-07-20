import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
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
 * @property {string} foundedYear
 * @property {string[]} primaryServices
 * @property {string} [siteUrl]
 */

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
    if (!required) return defaultValue;
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
    const foundedYear = await ask(rl, 'Founded year');
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

    return {
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
      foundedYear,
      primaryServices,
      siteUrl: siteUrl || undefined,
    };
  } finally {
    rl.close();
  }
}

/**
 * Non-interactive answers helper for scripted verification.
 *
 * @param {Partial<ScaffoldAnswers> & { businessName: string, primaryServices: string[] }} overrides
 * @returns {ScaffoldAnswers}
 */
export function buildAnswers(overrides) {
  const businessName = overrides.businessName;
  return {
    businessName,
    legalName: overrides.legalName ?? `${businessName} LLC`,
    tagline: overrides.tagline ?? `Quality work from ${businessName}.`,
    phone: overrides.phone ?? '(555) 555-0100',
    email: overrides.email ?? 'hello@example.com',
    street: overrides.street ?? '123 Main St',
    city: overrides.city ?? 'Example City',
    state: overrides.state ?? 'VA',
    zip: overrides.zip ?? '00000',
    serviceArea: overrides.serviceArea ?? `${overrides.city ?? 'Example City'} and surrounding areas`,
    foundedYear: overrides.foundedYear ?? '2020',
    primaryServices: overrides.primaryServices,
    siteUrl: overrides.siteUrl,
  };
}
