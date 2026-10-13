# Connect GTM to semantic analytics hooks

The foundation slice initializes `window.dataLayer` and adds explicit selector support to `Button.astro` without installing GTM or sending events. Component call-site hooks are planned for the next coverage slice; the full intended contract below does not claim those hooks are present in the foundation. Client integrations own consent, container configuration and event delivery. Business values still come from the twelve JSON files; no analytics IDs or channel computation belong in this template.

## Quick path

1. Inject client GTM **after** the early inline bootstrap in `BaseLayout.astro`. The bootstrap preserves an existing queue and sends nothing.
2. Configure click triggers using the selectors below, not button colors, CSS classes or visible copy.
3. Verify each desired variant and native form navigation in GTM Preview, including clicks on nested icons/text. Test consent behavior before publishing.

## Selector contract

| Selector | Meaning | Planned component coverage (next slice) |
| --- | --- | --- |
| `[data-raven-cta="primary"]` | Explicit primary conversion CTA, independent of visual styling | Desktop/mobile headers (default, centered, transparent, minimal; solid aliases default), all five hero variants, AboutStory estimate CTA, CTABar, landing hero/mid-page, mobile sticky bar |
| `a[data-raven-call="true"]` | Valid normalized telephone destination | TopBar, minimal header, phone-bearing footers, landing phone, hero telephone CTAs if configured, sticky telephone CTA, contact details/form, thank-you and legal pages |
| `[data-raven-share]` | Reserved share selector contract | N/A — current UI has no share controls; no hook is emitted |
| `[data-related]` | Reserved related-content selector contract | N/A — current UI has no related-content controls; no hook is emitted |

`Button.astro` accepts explicit `data-raven-cta="primary"` and `data-raven-call="true"` props. It does not classify primary-looking buttons automatically. A call opt-in is emitted only when the href normalizes to a valid telephone destination; ordinary hero links therefore never receive the call attribute. Both hooks may coexist on a telephone CTA. Secondary gallery/services hero links are not primary CTAs. Ordinary catalog, navigation and back-home links remain unclassified. Compact footer has no phone UI; no phone link is added.

For nested click targets, resolve the nearest matching ancestor (`closest(...)`) or use GTM's matching CSS-selector trigger configuration that includes descendants. Do not depend on the exact element receiving the click.

### Avoid duplicate conversions

A minimal-header or sticky call CTA may match **both** selectors. Choose one conversion policy in GTM: exclude call-marked links from the generic CTA trigger, or route both into one deduplicated conversion. Likewise, do not count native form submission and thank-you page arrival as two conversions. Swiper may duplicate slide DOM; count user clicks, not the number of matching elements. This template emits no click events of its own.

## Telephone and route behavior

`src/utils/phone.ts` preserves a supplied international `+` and never assumes `+1`. Display formatting is removed; `ext.`, `x` and `;ext=` extension digits become a separate `;ext=` parameter. Conservative validation accepts 7–15 number digits; short codes, empty values and unsupported text are not call destinations. This is syntax validation, not proof that a number is assigned or reachable.

In the planned coverage slice, invalid business numbers are omitted as links (contact/legal details may retain plain display text), and an invalid configured sticky `tel:` destination falls back to the loader's contact path with a contact label and no call hook. In the foundation, invalid telephone Button hrefs render as non-link buttons, without a call hook. Maintain valid JSON values rather than using that fallback as a conversion action.

Canonical multipage destinations remain `/contact-us`, `/services` and `/gallery`. Existing one-page loader mappings (`/#contact`, `/#services`, `/#gallery`) remain authoritative; hooks do not rewrite them. No new share or related-content UI exists: those hooks are **N/A**, not substitutes for ordinary catalog links.

## Form success: deliberately not emitted

The contact form remains native Netlify `method="POST"`, `action="/thank-you"`, with named fields, form-name and honeypot intact. There is no AJAX, `form_start`, submission interception or runtime `form_success`. Direct visits/reloads of `/thank-you` are not proof of a successful submission. A submit click is not confirmed success either.

**Only if a future separately approved AJAX integration confirms successful server acceptance without navigation**, it may push this safe, allowlisted payload once per accepted submission:

```js
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'form_success',
  form_id: 'contact',
  form_name: 'contact',
});
```

`form_id` and `form_name` are fixed semantic identifiers in the event payload, not new DOM IDs or user-entered values. Initialize the queue before pushing, preserving any existing entries.

This is documentation only, not code to install on the current form or thank-you page. Failure, validation rejection and network errors must not emit success. Do not send names, emails, telephone numbers, addresses, messages, user-entered service text, full URLs/query strings, or a serialized form. For any future click payload, use fixed semantic fields (for example `event: 'cta_click', cta_location: 'hero'`); do not send destination telephone hrefs or scrape visible text. Channel attribution and GTM/GA IDs remain client-side integration concerns.

## Review and verification

- Run `pnpm run test:analytics`, `pnpm run validate:data` and `pnpm run build`.
- In the foundation slice, `test:analytics` runs five checks: queue bootstrap, phone normalization, explicit Button attributes, Button call opt-in behavior and the documentation payload contract. It does not check component call sites or rendered markup.
- In the next coverage slice, `test:analytics` will switch to `scripts/test-analytics.mjs`, importing the foundation checks and adding call-site regression cases. After building that slice, run `pnpm run test:analytics -- --rendered` for emitted HTML checks across the generated pages.
- The planned source coverage checks inactive variants; generated markup checks cover the currently configured variants. Neither is a browser, GTM Preview or Netlify acceptance test.
- Confirm no JSON, dependency, lockfile or package-manager safeguard changes; test client-specific GTM separately.
