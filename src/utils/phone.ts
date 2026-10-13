/**
 * Build a conservative tel URI from a display number or tel URI.
 * Preserve an explicit international +; never infer a country code.
 * Extensions remain separate from the dialed number. Unsupported input is omitted.
 */
export function toPhoneHref(value?: string): string | undefined {
  if (!value) return undefined;
  const input = value.trim().replace(/^tel:/i, '');
  const match = input.match(/^([+\d().\s-]+?)(?:\s*(?:;ext=|ext\.?\s*|x\s*)(\d+))?$/i);
  if (!match) return undefined;
  const number = match[1].replace(/[().\s-]/g, '');
  // Accept local numbers without guessing their numbering plan; reject short codes.
  if (!/^\+?\d{7,15}$/.test(number)) return undefined;
  return `tel:${number}${match[2] ? `;ext=${match[2]}` : ''}`;
}
