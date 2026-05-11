export interface NavItem {
  label: string;
  href: string;
  children: NavItem[];
}

const EXCLUDED = new Set(['404', 'thank-you', 'privacy-policy']);

const ORDER: Record<string, number> = {
  'home': 0,
  'about-us': 1,
  'services': 2,
  'gallery': 3,
  'blog': 4,
  'contact-us': 5,
};

function slugToLabel(slug: string): string {
  if (slug === 'home') return 'Home';
  return slug
    .split('-')
    .map((w) => {
      if (w.toUpperCase() === 'VA') return 'VA';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function getOrder(slug: string): number {
  return ORDER[slug] ?? 99;
}

function buildTree(paths: string[]): NavItem[] {
  const root: Record<string, NavItem> = {};

  for (const raw of paths) {
    let path = raw
      .replace(/^.*?pages\//, '')
      .replace(/\/index\.astro$/, '')
      .replace(/\.astro$/, '');

    if (path === 'index') {
      root['home'] = { label: 'Home', href: '/', children: [] };
      continue;
    }

    const segments = path.split('/');
    const slug = segments[segments.length - 1];

    // Skip dynamic route params like [page], [slug]
    if (slug.startsWith('[') || path.includes('[')) continue;

    const href = '/' + segments.join('/');

    if (EXCLUDED.has(slug) || EXCLUDED.has(path)) continue;

    // Ensure top-level parent exists
    const topKey = segments[0];
    if (!root[topKey]) {
      root[topKey] = { label: slugToLabel(topKey), href: '/' + topKey, children: [] };
    }

    if (segments.length === 1) continue; // already created the parent, nothing more for top-level

    // Walk down the tree creating intermediate nodes
    let current = root[topKey];
    for (let i = 1; i < segments.length - 1; i++) {
      const seg = segments[i];
      let found = current.children.find(c => c.href === '/' + segments.slice(0, i + 1).join('/'));
      if (!found) {
        found = { label: slugToLabel(seg), href: '/' + segments.slice(0, i + 1).join('/'), children: [] };
        current.children.push(found);
      }
      current = found;
    }

    // Add the leaf node
    const leafLabel = slugToLabel(slug);
    current.children.push({ label: leafLabel, href, children: [] });
  }

  // Prepend "All {label}" only for top-level items with children
  for (const key of Object.keys(root)) {
    if (root[key].children.length > 0 && ORDER[key] !== undefined) {
      root[key].children.unshift({
        label: `All ${root[key].label}`,
        href: root[key].href,
        children: [],
      });
    }
  }

  return Object.values(root).sort((a, b) => getOrder(Object.keys(root).find(k => root[k] === a) || '') - getOrder(Object.keys(root).find(k => root[k] === b) || ''));
}

export function getNavigation(): NavItem[] {
  const modules = import.meta.glob('/src/pages/**/*.astro');
  const paths = Object.keys(modules);
  return buildTree(paths);
}
